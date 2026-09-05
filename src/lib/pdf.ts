/**
 * A minimal, dependency-free PDF 1.4 writer.
 *
 * Google Scholar's inclusion guidelines are explicit about what they want from
 * an individual author: a full text in a file ending `.pdf`, the title in a
 * large font at the top of page 1, the authors on the line directly below, and
 * a section headed "References" at the end. Meeting that from a service with
 * zero runtime dependencies means writing the PDF by hand.
 *
 * The writer is deliberately small and deliberately constrained:
 *
 * - only the base-14 Helvetica family is used, so no font may be embedded and
 *   the {@link WIDTHS} metrics are enough to lay text out exactly;
 * - content streams are left uncompressed, so every byte of the file is ASCII
 *   and a character offset equals a byte offset — which is what makes the
 *   cross-reference table trivially correct;
 * - nothing reads the clock or the file system, so the same document always
 *   serialises to the same bytes and the API can serve it under a stable ETag.
 */

/** Fonts available to the writer. */
export type PdfFont = 'regular' | 'bold' | 'italic';

/** PDF resource names for the three fonts. */
const FONT_RESOURCE: Readonly<Record<PdfFont, string>> = {
  regular: 'F1',
  bold: 'F2',
  italic: 'F3',
};

/**
 * Advance widths in 1/1000 em for printable ASCII (32-126).
 *
 * Reproduced from the Adobe Font Metrics for the base-14 fonts. Helvetica and
 * Helvetica-Oblique share a metric set.
 */
const WIDTHS: Readonly<Record<'regular' | 'bold', readonly number[]>> = {
  regular: [
    278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556,
    556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278,
    500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469,
    556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500,
    278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
  ],
  bold: [
    278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556,
    556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278,
    556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584,
    556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556,
    333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
  ],
};

/** Substitutions applied before layout so the output stays pure ASCII. */
const TRANSLITERATIONS: readonly (readonly [RegExp, string])[] = [
  [/[\u2018\u2019\u201B]/g, "'"],
  [/[\u201C\u201D]/g, '"'],
  [/\u2014/g, '--'],
  [/[\u2013\u2212]/g, '-'],
  [/\u2026/g, '...'],
  [/\u00A0/g, ' '],
  [/\u00D7/g, 'x'],
  [/\u00B1/g, '+/-'],
  [/[\u2022\u00B7]/g, '-'],
  [/\u00E9/g, 'e'],
  [/[^\x20-\x7E\n]/g, ''],
];

/**
 * Fold a string down to the printable ASCII the base-14 fonts can render.
 *
 * @param value - Arbitrary text.
 */
export function toAscii(value: string): string {
  return TRANSLITERATIONS.reduce<string>(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    value,
  );
}

/**
 * Measure a string in points.
 *
 * @param text - ASCII text.
 * @param font - Font to measure with.
 * @param size - Font size in points.
 */
export function measureText(text: string, font: PdfFont, size: number): number {
  const metrics = WIDTHS[font === 'bold' ? 'bold' : 'regular'];
  let total = 0;
  for (const character of text) {
    const index = character.charCodeAt(0) - 32;
    const width = metrics[index];
    total += width ?? 556;
  }
  return (total * size) / 1000;
}

/**
 * Greedily wrap text to a maximum line width.
 *
 * A word longer than the measure is placed on its own line rather than being
 * broken, which keeps URLs and identifiers intact.
 *
 * @param text - ASCII text.
 * @param font - Font the text will be drawn in.
 * @param size - Font size in points.
 * @param maxWidth - Measure in points.
 */
export function wrapText(text: string, font: PdfFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter((word) => word.length > 0);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current === '' ? word : `${current} ${word}`;
    if (current !== '' && measureText(candidate, font, size) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current !== '') {
    lines.push(current);
  }
  return lines.length === 0 ? [''] : lines;
}

/** Escape the three characters that are special inside a PDF literal string. */
export function escapePdfString(value: string): string {
  return value.replace(/([\\()])/g, '\\$1');
}

/** A block of content in the document flow. */
export type PdfBlock =
  /** The paper title, set large at the top of page 1. */
  | { kind: 'title'; text: string }
  /** The author line, directly below the title. */
  | { kind: 'authors'; text: string }
  /** A bibliographic citation line, set small and italic. */
  | { kind: 'citation'; text: string }
  /** A section heading. */
  | { kind: 'heading'; text: string }
  /** A subsection heading. */
  | { kind: 'subheading'; text: string }
  /** A paragraph of body text. */
  | { kind: 'paragraph'; text: string }
  /** A bulleted item. */
  | { kind: 'bullet'; text: string }
  /** A numbered reference entry. */
  | { kind: 'reference'; index: number; text: string }
  /** Vertical space. */
  | { kind: 'space'; height: number };

/** Everything needed to serialise a document. */
export interface PdfDocument {
  /** Document title, written to the info dictionary. */
  title: string;
  /** Author line, written to the info dictionary. */
  author: string;
  /** Subject, written to the info dictionary. */
  subject: string;
  /** Keywords, written to the info dictionary. */
  keywords: string;
  /** Creation date as `YYYYMMDD`, so output stays byte-reproducible. */
  date: string;
  /** Content blocks in reading order. */
  blocks: readonly PdfBlock[];
}

/** A single positioned line of text on a page. */
interface PositionedLine {
  text: string;
  font: PdfFont;
  size: number;
  x: number;
  y: number;
}

/** A4 width in points. */
const PAGE_WIDTH = 595.28;

/** A4 height in points. */
const PAGE_HEIGHT = 841.89;

/** Page margin in points. */
const MARGIN = 64;

/** Usable text measure in points. */
const MEASURE = PAGE_WIDTH - MARGIN * 2;

/** Distance from the bottom margin at which a page breaks. */
const BOTTOM = MARGIN + 24;

/** Typographic specification for each block kind. */
const STYLE: Readonly<
  Record<PdfBlock['kind'], { font: PdfFont; size: number; leading: number; before: number; indent: number }>
> = {
  title: { font: 'bold', size: 24, leading: 28, before: 0, indent: 0 },
  authors: { font: 'regular', size: 12, leading: 15, before: 12, indent: 0 },
  citation: { font: 'italic', size: 9, leading: 12, before: 8, indent: 0 },
  heading: { font: 'bold', size: 13, leading: 16, before: 18, indent: 0 },
  subheading: { font: 'bold', size: 11, leading: 14, before: 12, indent: 0 },
  paragraph: { font: 'regular', size: 10, leading: 13.5, before: 8, indent: 0 },
  bullet: { font: 'regular', size: 10, leading: 13.5, before: 4, indent: 14 },
  reference: { font: 'regular', size: 9, leading: 12, before: 6, indent: 18 },
  space: { font: 'regular', size: 10, leading: 0, before: 0, indent: 0 },
};

/**
 * Flow the blocks into pages.
 *
 * @param blocks - Document content.
 * @returns One array of positioned lines per page.
 */
function layout(blocks: readonly PdfBlock[]): PositionedLine[][] {
  const pages: PositionedLine[][] = [];
  let page: PositionedLine[] = [];
  let cursor = PAGE_HEIGHT - MARGIN;

  const breakPage = (): void => {
    pages.push(page);
    page = [];
    cursor = PAGE_HEIGHT - MARGIN;
  };

  for (const block of blocks) {
    const style = STYLE[block.kind];
    if (block.kind === 'space') {
      cursor -= block.height;
      continue;
    }
    const prefix = block.kind === 'bullet' ? '- ' : block.kind === 'reference' ? `[${block.index}] ` : '';
    const body = toAscii(block.text);
    const lines = wrapText(body, style.font, style.size, MEASURE - style.indent);
    cursor -= style.before;
    for (let index = 0; index < lines.length; index += 1) {
      if (cursor - style.leading < BOTTOM) {
        breakPage();
      }
      cursor -= style.leading;
      const isFirst = index === 0;
      const text = isFirst ? `${prefix}${lines[index] as string}` : (lines[index] as string);
      page.push({
        text,
        font: style.font,
        size: style.size,
        x: MARGIN + (isFirst ? 0 : style.indent),
        y: cursor,
      });
    }
  }
  pages.push(page);
  return pages;
}

/**
 * Build the content stream for one page.
 *
 * @param lines - Positioned lines.
 */
function contentStream(lines: readonly PositionedLine[]): string {
  const operations = lines.map(
    (line) =>
      `BT /${FONT_RESOURCE[line.font]} ${line.size} Tf 1 0 0 1 ${line.x.toFixed(2)} ${line.y.toFixed(2)} Tm (${escapePdfString(line.text)}) Tj ET`,
  );
  return `${operations.join('\n')}\n`;
}

/**
 * Serialise a document to a PDF 1.4 file.
 *
 * The returned string is pure printable ASCII, so writing it as UTF-8 produces
 * exactly the bytes the cross-reference table describes.
 *
 * @param document - Document to render.
 * @returns The complete PDF file as a string.
 */
export function renderPdf(document: PdfDocument): string {
  const pages = layout(document.blocks);
  const pageCount = pages.length;

  /** Object bodies, indexed from object number 1. */
  const objects: string[] = [];
  const pageObjectNumber = (index: number): number => 6 + index * 2;
  const kids = pages.map((_, index) => `${pageObjectNumber(index)} 0 R`).join(' ');

  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  objects.push(`<< /Type /Pages /Count ${pageCount} /Kids [${kids}] >>`);
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>');

  for (const [index, lines] of pages.entries()) {
    const contents = pageObjectNumber(index) + 1;
    objects.push(
      [
        '<< /Type /Page /Parent 2 0 R',
        `/MediaBox [0 0 ${PAGE_WIDTH.toFixed(2)} ${PAGE_HEIGHT.toFixed(2)}]`,
        '/Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >>',
        `/Contents ${contents} 0 R >>`,
      ].join(' '),
    );
    const stream = contentStream(lines);
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`);
  }

  const infoNumber = objects.length + 1;
  objects.push(
    [
      '<<',
      `/Title (${escapePdfString(toAscii(document.title))})`,
      `/Author (${escapePdfString(toAscii(document.author))})`,
      `/Subject (${escapePdfString(toAscii(document.subject))})`,
      `/Keywords (${escapePdfString(toAscii(document.keywords))})`,
      '/Creator (ielts-api)',
      '/Producer (ielts-api zero-dependency PDF writer)',
      `/CreationDate (D:${document.date}000000Z)`,
      `/ModDate (D:${document.date}000000Z)`,
      '>>',
    ].join(' '),
  );

  let file = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (const [index, body] of objects.entries()) {
    offsets.push(file.length);
    file += `${index + 1} 0 obj\n${body}\nendobj\n`;
  }

  const startxref = file.length;
  const total = objects.length + 1;
  file += `xref\n0 ${total}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    file += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  file += `trailer\n<< /Size ${total} /Root 1 0 R /Info ${infoNumber} 0 R >>\n`;
  file += `startxref\n${startxref}\n%%EOF\n`;
  return file;
}
