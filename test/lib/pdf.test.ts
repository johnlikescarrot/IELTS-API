import { describe, expect, it } from 'vitest';

import { escapePdfString, measureText, renderPdf, toAscii, wrapText } from '../../src/lib/pdf.js';

import type { PdfBlock, PdfDocument } from '../../src/lib/pdf.js';

/** Parse the cross-reference table and check every offset points at its object. */
function checkXref(pdf: string): { objects: number; correct: boolean } {
  const startxref = Number(/startxref\s+(\d+)/.exec(pdf)![1]);
  const tail = pdf.slice(startxref);
  const header = /^xref\n0 (\d+)\n/.exec(tail)!;
  const count = Number(header[1]);
  const entries = tail.slice(header[0].length);
  let correct = true;
  for (let index = 1; index < count; index += 1) {
    const offset = Number(entries.slice(index * 20, index * 20 + 10));
    if (!pdf.startsWith(`${index} 0 obj`, offset)) {
      correct = false;
    }
  }
  return { objects: count - 1, correct };
}

describe('toAscii', () => {
  it('folds typographic punctuation down to ASCII', () => {
    expect(toAscii('\u2018a\u2019 \u201Cb\u201D c\u2014d e\u2013f g\u2026')).toBe('\'a\' "b" c--d e-f g...');
  });

  it('folds symbols, accents and non-breaking spaces', () => {
    expect(toAscii('3\u00D74 \u00B12 caf\u00E9\u00A0x \u2022 y \u00B7 z')).toBe('3x4 +/-2 cafe x - y - z');
  });

  it('drops anything else that cannot be rendered', () => {
    expect(toAscii('ok \u4F60\u597D \u{1F600}')).toBe('ok  ');
  });

  it('keeps newlines', () => {
    expect(toAscii('a\nb')).toBe('a\nb');
  });
});

describe('measureText', () => {
  it('measures using the Helvetica metrics', () => {
    // 'i' is 222/1000 em, 'W' is 944/1000 em.
    expect(measureText('i', 'regular', 1000)).toBe(222);
    expect(measureText('W', 'regular', 1000)).toBe(944);
  });

  it('uses the bold metrics for bold text', () => {
    expect(measureText('a', 'bold', 1000)).toBe(556);
    expect(measureText('m', 'bold', 1000)).toBe(889);
  });

  it('measures italic with the regular metrics', () => {
    expect(measureText('W', 'italic', 1000)).toBe(measureText('W', 'regular', 1000));
  });

  it('falls back to an average width for unmapped characters', () => {
    expect(measureText('\u00FF', 'regular', 1000)).toBe(556);
    expect(measureText('\n', 'regular', 1000)).toBe(556);
  });

  it('measures the empty string as zero', () => {
    expect(measureText('', 'regular', 10)).toBe(0);
  });
});

describe('wrapText', () => {
  it('wraps at word boundaries', () => {
    const lines = wrapText('one two three four five six', 'regular', 10, 60);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(measureText(line, 'regular', 10)).toBeLessThanOrEqual(60);
    }
    expect(lines.join(' ')).toBe('one two three four five six');
  });

  it('keeps a single line that fits', () => {
    expect(wrapText('short', 'regular', 10, 500)).toEqual(['short']);
  });

  it('never breaks a word that is longer than the measure', () => {
    const lines = wrapText('https://example.org/a/very/long/path', 'regular', 10, 20);
    expect(lines).toEqual(['https://example.org/a/very/long/path']);
  });

  it('collapses runs of whitespace', () => {
    expect(wrapText('  a \n\t b  ', 'regular', 10, 500)).toEqual(['a b']);
  });

  it('returns one empty line for empty input', () => {
    expect(wrapText('', 'regular', 10, 100)).toEqual(['']);
    expect(wrapText('   ', 'regular', 10, 100)).toEqual(['']);
  });
});

describe('escapePdfString', () => {
  it('escapes backslashes and both parentheses', () => {
    expect(escapePdfString('a(b)c\\d')).toBe('a\\(b\\)c\\\\d');
  });
});

describe('renderPdf', () => {
  const blocks: PdfBlock[] = [
    { kind: 'title', text: 'A title long enough to wrap across more than one line in the layout engine' },
    { kind: 'authors', text: 'An Author' },
    { kind: 'citation', text: 'Technical report 1. Publisher, 2026-09-05.' },
    { kind: 'space', height: 12 },
    { kind: 'heading', text: 'Section' },
    { kind: 'subheading', text: 'Subsection' },
    { kind: 'paragraph', text: 'A paragraph with (parentheses) and a backslash \\ in it.' },
    { kind: 'bullet', text: 'A bulleted item that is long enough to wrap onto a second line of the page.' },
    { kind: 'reference', index: 1, text: 'Author, A. (2020). A work. Journal, 1(1), 1-10.' },
  ];

  const document: PdfDocument = {
    title: 'A title',
    author: 'An Author',
    subject: 'A subject',
    keywords: 'a, b',
    date: '20260905',
    blocks,
  };

  const pdf = renderPdf(document);

  it('produces a well-formed PDF 1.4 file', () => {
    expect(pdf.startsWith('%PDF-1.4\n')).toBe(true);
    expect(pdf.trimEnd().endsWith('%%EOF')).toBe(true);
  });

  it('emits pure printable ASCII so byte offsets equal character offsets', () => {
    expect(/^[\x20-\x7E\n]*$/.test(pdf)).toBe(true);
    expect(Buffer.byteLength(pdf, 'utf8')).toBe(pdf.length);
  });

  it('writes a cross-reference table whose offsets all resolve', () => {
    const { correct } = checkXref(pdf);
    expect(correct).toBe(true);
  });

  it('declares the catalog, the page tree and the three base-14 fonts', () => {
    expect(pdf).toContain('/Type /Catalog');
    expect(pdf).toContain('/Type /Pages');
    expect(pdf).toContain('/BaseFont /Helvetica');
    expect(pdf).toContain('/BaseFont /Helvetica-Bold');
    expect(pdf).toContain('/BaseFont /Helvetica-Oblique');
  });

  it('writes the document information dictionary', () => {
    expect(pdf).toContain('/Title (A title)');
    expect(pdf).toContain('/Author (An Author)');
    expect(pdf).toContain('/CreationDate (D:20260905000000Z)');
  });

  it('escapes special characters inside the content stream', () => {
    expect(pdf).toContain('\\(parentheses\\)');
    expect(pdf).toContain('\\\\');
  });

  it('prefixes bullets and numbers references', () => {
    expect(pdf).toContain('(- A bulleted item');
    expect(pdf).toContain('([1] Author, A.');
  });

  it('is byte-for-byte reproducible', () => {
    expect(renderPdf(document)).toBe(pdf);
  });

  it('breaks onto further pages when the content overflows', () => {
    const long: PdfDocument = {
      ...document,
      blocks: Array.from({ length: 120 }, (_, index) => ({
        kind: 'paragraph' as const,
        text: `Paragraph ${index} with enough words in it to occupy a meaningful fraction of a line.`,
      })),
    };
    const many = renderPdf(long);
    const pageCount = Number(/\/Type \/Pages \/Count (\d+)/.exec(many)![1]);
    expect(pageCount).toBeGreaterThan(1);
    expect(checkXref(many).correct).toBe(true);
  });

  it('renders a single empty page for an empty document', () => {
    const empty = renderPdf({ ...document, blocks: [] });
    expect(empty).toContain('/Type /Pages /Count 1');
    expect(checkXref(empty).correct).toBe(true);
  });
});
