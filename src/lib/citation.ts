/**
 * Citation rendering.
 *
 * A research API is only citable if citing it is easier than not citing it.
 * `/v1/cite` therefore renders the same work metadata into the five formats
 * that cover almost every submission system — BibTeX, APA 7, MLA 9, Chicago
 * author-date and RIS — so a user can paste a citation straight into a paper
 * or import it into a reference manager without reading the repository.
 *
 * The renderings are pure functions of the work metadata plus an access date,
 * which keeps the endpoint deterministic for a given `accessed` parameter.
 */

import type { CitationBundle, CitationFormat } from '../types.js';

/** Work metadata rendered by every format. */
export interface CitationWork {
  /** Title of the work. */
  title: string;
  /** Author string. */
  authors: string;
  /** Version cited. */
  version: string;
  /** Publication year. */
  year: number;
  /** Canonical URL. */
  url: string;
  /** DOI (may be a placeholder until a release is archived). */
  doi: string;
  /** Publisher or archive. */
  publisher: string;
  /** Access date, ISO-8601. */
  accessed: string;
}

/** Month names used by MLA and Chicago access dates. */
const MONTHS: readonly string[] = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Render an ISO date as `5 September 2026`.
 *
 * @param iso - ISO-8601 date (`YYYY-MM-DD`), already validated.
 */
export function longDate(iso: string): string {
  const [year, month, day] = iso.split('-') as [string, string, string];
  return `${Number.parseInt(day, 10)} ${MONTHS[Number.parseInt(month, 10) - 1] as string} ${year}`;
}

/** BibTeX `@software` entry. */
function bibtex(work: CitationWork): string {
  return [
    `@software{ielts_api_${work.year},`,
    `  title        = {${work.title}},`,
    `  author       = {${work.authors}},`,
    `  year         = {${work.year}},`,
    `  version      = {${work.version}},`,
    `  doi          = {${work.doi}},`,
    `  url          = {${work.url}},`,
    `  publisher    = {${work.publisher}},`,
    `  note         = {Accessed ${work.accessed}}`,
    '}',
  ].join('\n');
}

/** APA 7 software reference. */
function apa(work: CitationWork): string {
  return `${work.authors}. (${work.year}). ${work.title} (Version ${work.version}) [Computer software]. ${work.publisher}. https://doi.org/${work.doi}`;
}

/** MLA 9 works-cited entry. */
function mla(work: CitationWork): string {
  return `${work.authors}. ${work.title}. Version ${work.version}, ${work.publisher}, ${work.year}, ${work.url}. Accessed ${longDate(work.accessed)}.`;
}

/** Chicago author-date reference. */
function chicago(work: CitationWork): string {
  return `${work.authors}. ${work.year}. ${work.title} (version ${work.version}). ${work.publisher}. https://doi.org/${work.doi}.`;
}

/** RIS record for reference managers. */
function ris(work: CitationWork): string {
  return [
    'TY  - COMP',
    `T1  - ${work.title}`,
    `AU  - ${work.authors}`,
    `PY  - ${work.year}`,
    `ET  - ${work.version}`,
    `PB  - ${work.publisher}`,
    `DO  - ${work.doi}`,
    `UR  - ${work.url}`,
    `Y2  - ${work.accessed}`,
    'ER  - ',
  ].join('\n');
}

/** Renderers, in the order they appear in the response. */
const RENDERERS: readonly { format: CitationFormat['format']; render: (work: CitationWork) => string }[] = [
  { format: 'bibtex', render: bibtex },
  { format: 'apa', render: apa },
  { format: 'mla', render: mla },
  { format: 'chicago', render: chicago },
  { format: 'ris', render: ris },
];

/** Formats `/v1/cite` can return. */
export const CITATION_FORMATS: readonly CitationFormat['format'][] = RENDERERS.map(
  (renderer) => renderer.format,
);

/**
 * Render a work in one format.
 *
 * @param work - Work metadata.
 * @param format - Requested format.
 */
export function renderCitation(work: CitationWork, format: CitationFormat['format']): string {
  const renderer = RENDERERS.find((candidate) => candidate.format === format) as (typeof RENDERERS)[number];
  return renderer.render(work);
}

/**
 * Render a work in every supported format.
 *
 * @param work - Work metadata.
 */
export function citationBundle(work: CitationWork): CitationBundle {
  return {
    title: work.title,
    authors: work.authors,
    version: work.version,
    year: work.year,
    url: work.url,
    doi: work.doi,
    accessed: work.accessed,
    citations: RENDERERS.map((renderer) => ({ format: renderer.format, text: renderer.render(work) })),
  };
}
