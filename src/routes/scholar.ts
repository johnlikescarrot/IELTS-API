/**
 * Scholarly discovery surface (`/paper`, `/paper.pdf`, `/robots.txt`, `/sitemap.xml`).
 *
 * Everything an academic crawler needs, and nothing it does not:
 *
 * - `/paper` is the landing page: one work, one URL, Highwire Press tags in the
 *   head and the author-written abstract visible without interaction;
 * - `/paper.pdf` is the full text, linked from the landing page by
 *   `citation_pdf_url` so Scholar indexes the two as a single work;
 * - `/robots.txt` explicitly admits the crawlers and points at the sitemap,
 *   because a blocked crawl path is the most common reason a technically
 *   correct landing page never appears in the index;
 * - `/sitemap.xml` lists every stable URL so nothing is orphaned.
 */

import { CITATION } from '../data/citation.js';
import { corpusStats } from '../data/corpus.js';
import { QUESTION_TYPES } from '../data/questions.js';
import { vocabularyStats } from '../data/vocabulary.js';
import { isoDate } from '../lib/citation.js';
import { escapeHtml } from '../lib/html.js';
import { paperPdfDocument, renderPaperHtml } from '../lib/paper.js';
import { renderPdf } from '../lib/pdf.js';

import type { PaperFigures } from '../lib/paper.js';
import type { HandlerResult, RouteContext, RouteDefinition } from '../lib/route.js';
import type { ScholarContext } from '../lib/scholar.js';

/** Path of the HTML landing page. */
export const PAPER_PATH = '/paper';

/** Path of the PDF full text; the extension matters to Google Scholar. */
export const PAPER_PDF_PATH = '/paper.pdf';

/** Stable paths advertised in the sitemap, most important first. */
export const SITEMAP_PATHS: readonly string[] = [
  '/',
  PAPER_PATH,
  PAPER_PDF_PATH,
  '/docs',
  '/v1',
  '/openapi.json',
  '/v1/citation',
  '/v1/vocabulary',
  '/v1/vocabulary/stats',
  '/v1/bands',
  '/v1/bands/descriptors',
  '/v1/scores/tables',
  '/v1/questions',
  '/v1/format',
  '/v1/topics/writing',
  '/v1/topics/speaking',
  '/v1/tasks/writing',
  '/v1/corpus',
  '/v1/resources',
];

/**
 * Resolve the absolute URLs the metadata must carry.
 *
 * Scholar requires `citation_pdf_url` to be absolute and, for security, to name
 * a file in the same directory as the landing page. Both live at the root, so
 * the requirement is met by construction.
 *
 * @param context - Request context, used for the origin.
 */
function scholarContext(context: RouteContext): ScholarContext {
  const origin = context.url.origin;
  return {
    abstractUrl: `${origin}${PAPER_PATH}`,
    pdfUrl: `${origin}${PAPER_PDF_PATH}`,
    institution: 'IELTS API open research software',
  };
}

/** Numbers quoted in the paper, read from the live datasets. */
function figures(routeCount: number): PaperFigures {
  const words = vocabularyStats();
  const corpus = corpusStats();
  return {
    words: words.words,
    occurrences: words.occurrences,
    volumes: words.volumes,
    corpusFiles: corpus.filesInRepository,
    corpusRelevant: corpus.ieltsRelevantFiles,
    questionTypes: QUESTION_TYPES.length,
    endpoints: routeCount,
  };
}

/** Dataset row counts published in the JSON-LD `Dataset` node. */
function datasetSizes(): Record<string, number> {
  const words = vocabularyStats();
  const corpus = corpusStats();
  return {
    vocabularyHeadwords: words.words,
    vocabularyOccurrences: words.occurrences,
    cambridgeVolumes: words.volumes,
    questionTypes: QUESTION_TYPES.length,
    corpusFilesIndexed: corpus.ieltsRelevantFiles,
  };
}

/**
 * Build the scholarly discovery routes.
 *
 * @param routeCount - Number of endpoints served, quoted in the paper.
 */
export function createScholarRoutes(routeCount: number): RouteDefinition[] {
  /** The HTML landing page. */
  function paper(context: RouteContext): HandlerResult {
    return {
      raw: {
        contentType: 'text/html; charset=utf-8',
        body: renderPaperHtml(CITATION, scholarContext(context), figures(routeCount), datasetSizes()),
      },
    };
  }

  /** The PDF full text. */
  function paperPdf(context: RouteContext): HandlerResult {
    const document = paperPdfDocument(CITATION, scholarContext(context), figures(routeCount));
    return { raw: { contentType: 'application/pdf', body: renderPdf(document) } };
  }

  /** Crawler directives. */
  function robots(context: RouteContext): HandlerResult {
    const body = [
      '# Every endpoint of this API is public, free and unauthenticated.',
      '# Academic crawlers are explicitly welcome.',
      'User-agent: *',
      'Allow: /',
      '',
      '# The landing page and full text of the accompanying paper.',
      `# ${context.url.origin}${PAPER_PATH}`,
      '',
      `Sitemap: ${context.url.origin}/sitemap.xml`,
      '',
    ].join('\n');
    return { raw: { contentType: 'text/plain; charset=utf-8', body } };
  }

  /** The sitemap. */
  function sitemap(context: RouteContext): HandlerResult {
    const lastmod = isoDate(CITATION);
    const entries = SITEMAP_PATHS.map((path) => {
      const priority = path === PAPER_PATH || path === '/' ? '1.0' : '0.7';
      return [
        '  <url>',
        `    <loc>${escapeHtml(`${context.url.origin}${path}`)}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        '    <changefreq>monthly</changefreq>',
        `    <priority>${priority}</priority>`,
        '  </url>',
      ].join('\n');
    }).join('\n');
    const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
    return { raw: { contentType: 'application/xml; charset=utf-8', body } };
  }

  return [
    {
      method: 'GET',
      path: PAPER_PATH,
      versioned: false,
      summary: 'Paper landing page with Highwire Press citation metadata and a visible abstract.',
      handler: paper,
    },
    {
      method: 'GET',
      path: PAPER_PDF_PATH,
      versioned: false,
      summary: 'Full text of the paper as a PDF, generated without dependencies.',
      handler: paperPdf,
    },
    {
      method: 'GET',
      path: '/robots.txt',
      versioned: false,
      summary: 'Crawler directives; every path is allowed.',
      handler: robots,
    },
    {
      method: 'GET',
      path: '/sitemap.xml',
      versioned: false,
      summary: 'Sitemap listing every stable URL.',
      handler: sitemap,
    },
  ];
}
