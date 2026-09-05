import { describe, expect, it } from 'vitest';

import { CITATION } from '../../src/data/citation.js';
import { PAPER_REFERENCES, paperPdfDocument, paperSections, renderPaperHtml } from '../../src/lib/paper.js';

import type { PaperFigures } from '../../src/lib/paper.js';
import type { PdfBlock } from '../../src/lib/pdf.js';
import type { ScholarContext } from '../../src/lib/scholar.js';
import type { CitationRecord } from '../../src/types.js';

const CONTEXT: ScholarContext = {
  abstractUrl: 'https://ielts.example/paper',
  pdfUrl: 'https://ielts.example/paper.pdf',
  institution: 'Test Institution',
};

const FIGURES: PaperFigures = {
  words: 4174,
  occurrences: 4310,
  volumes: 22,
  corpusFiles: 404,
  corpusRelevant: 76,
  questionTypes: 17,
  endpoints: 26,
};

const SIZES = { vocabularyHeadwords: 4174 };

/** The same record before a DOI has been minted. */
const NO_DOI: CitationRecord = { ...CITATION, doi: null };

describe('paperSections', () => {
  const sections = paperSections(FIGURES);

  it('numbers every section and gives each some content', () => {
    expect(sections.length).toBeGreaterThan(3);
    for (const [index, section] of sections.entries()) {
      expect(section.heading.startsWith(`${index + 1}.`)).toBe(true);
      expect(section.blocks.length).toBeGreaterThan(0);
    }
  });

  it('quotes the live figures rather than hard-coded ones', () => {
    const text = sections.flatMap((section) => section.blocks.map((block) => block.text)).join(' ');
    expect(text).toContain('404 files');
    expect(text).toContain('only 76');
    expect(text).toContain('4174 headwords');
    expect(text).toContain('26 read-only HTTP endpoints');
  });

  it('states the limitations of the indicative tables', () => {
    const limitations = sections.find((section) => section.heading.includes('Limitations'))!;
    expect(limitations.blocks.map((block) => block.text).join(' ')).toContain('indicative');
  });

  it('uses both paragraphs and bullets', () => {
    const kinds = new Set(sections.flatMap((section) => section.blocks.map((block) => block.kind)));
    expect(kinds).toEqual(new Set(['paragraph', 'bullet']));
  });
});

describe('PAPER_REFERENCES', () => {
  it('numbers the references consecutively from one', () => {
    expect(PAPER_REFERENCES.map((reference) => reference.index)).toEqual(
      PAPER_REFERENCES.map((_, index) => index + 1),
    );
  });

  it('contains both linked and print-only works', () => {
    expect(PAPER_REFERENCES.some((reference) => reference.url === null)).toBe(true);
    expect(PAPER_REFERENCES.some((reference) => reference.url !== null)).toBe(true);
  });
});

describe('renderPaperHtml', () => {
  const html = renderPaperHtml(CITATION, CONTEXT, FIGURES, SIZES);

  it('renders a complete document', () => {
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html.trimEnd().endsWith('</html>')).toBe(true);
  });

  it('puts the title in an h1 and the authors directly below, as Scholar requires', () => {
    const titleIndex = html.indexOf('<h1 class="citation_title">');
    const authorIndex = html.indexOf('<p class="citation_author">');
    expect(titleIndex).toBeGreaterThan(-1);
    expect(authorIndex).toBeGreaterThan(titleIndex);
  });

  it('shows the author-written abstract without interaction', () => {
    expect(html).toContain('<h2>Abstract</h2>');
    expect(html).toContain(CITATION.abstract.slice(0, 80));
  });

  it('marks references up as a numbered list of formal citations', () => {
    expect(html).toContain('<h2>References</h2>');
    for (const reference of PAPER_REFERENCES) {
      expect(html).toContain(reference.text.replace(/&/g, '&amp;').slice(0, 40));
    }
  });

  it('links a reference URL but not a print-only reference', () => {
    const linked = PAPER_REFERENCES.find((reference) => reference.url !== null)!;
    expect(html).toContain(`<a href="${linked.url!}">`);
    const print = PAPER_REFERENCES.find((reference) => reference.url === null)!;
    expect(html).toContain(`<li>${print.text.replace(/&/g, '&amp;')}</li>`);
  });

  it('renders both the bulleted and unbulleted sections', () => {
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>Vocabulary: 4174 headwords');
  });

  it('offers the citation formats and the PDF', () => {
    expect(html).toContain('/v1/citation?format=bibtex');
    expect(html).toContain('https://ielts.example/paper.pdf');
    expect(html).toContain('@software{');
  });

  it('prints the DOI when there is one and omits it otherwise', () => {
    expect(html).toContain('doi:10.5281/zenodo.0000000');
    expect(renderPaperHtml(NO_DOI, CONTEXT, FIGURES, SIZES)).not.toContain('doi:');
  });

  it('escapes interpolated values', () => {
    const hostile: CitationRecord = { ...CITATION, title: '<script>alert(1)</script>' };
    const rendered = renderPaperHtml(hostile, CONTEXT, FIGURES, SIZES);
    expect(rendered).not.toContain('<script>alert(1)</script>');
    expect(rendered).toContain('&lt;script&gt;');
    // The JSON-LD block must escape the payload without corrupting the JSON.
    expect(rendered).toContain('\\u003cscript\\u003e');
  });
});

describe('paperPdfDocument', () => {
  const document = paperPdfDocument(CITATION, CONTEXT, FIGURES);

  it('opens with the title, the authors and a bibliographic citation', () => {
    expect(document.blocks[0]).toEqual({ kind: 'title', text: CITATION.title });
    expect(document.blocks[1]).toEqual({ kind: 'authors', text: 'The IELTS API contributors' });
    expect(document.blocks[2]!.kind).toBe('citation');
  });

  it('carries the abstract and ends with a References section', () => {
    const kinds = document.blocks.map((block) => block.kind);
    expect(kinds).toContain('heading');
    const headings = document.blocks.filter((block) => block.kind === 'heading').map((block) => block.text);
    expect(headings[0]).toBe('Abstract');
    expect(headings[headings.length - 1]).toBe('References');
    const last = document.blocks[document.blocks.length - 1]!;
    expect(last.kind).toBe('reference');
  });

  it('maps section bullets onto PDF bullets', () => {
    expect(document.blocks.some((block) => block.kind === 'bullet')).toBe(true);
  });

  it('appends the URL only to references that have one', () => {
    const references = document.blocks.filter((block) => block.kind === 'reference');
    expect(references.some((block) => block.text.includes('https://doi.org/'))).toBe(true);
    const print = PAPER_REFERENCES.find((reference) => reference.url === null)!;
    expect(references.some((block) => block.text === print.text)).toBe(true);
  });

  it('omits the DOI from the citation line when none is minted', () => {
    const line = (document: { blocks: readonly PdfBlock[] }): string => {
      const block = document.blocks[2]!;
      return block.kind === 'citation' ? block.text : '';
    };
    expect(line(paperPdfDocument(NO_DOI, CONTEXT, FIGURES))).not.toContain('doi:');
    expect(line(document)).toContain('doi:');
  });

  it('uses a fixed creation date so the PDF is reproducible', () => {
    expect(document.date).toBe('20260905');
  });
});
