/**
 * Citation serialisation.
 *
 * The single biggest friction in getting cited is making a reader hand-build a
 * bibliography entry. Every format a reference manager understands is rendered
 * here from one record, so citing this work is a copy and paste.
 *
 * All formatters are pure functions of a {@link CitationRecord}; none of them
 * touch the network, the clock or the file system, so a citation string is
 * reproducible for a given version.
 */

import type { CitationAuthor, CitationFormat, CitationRecord, JsonValue } from '../types.js';

/** Every serialisation `/v1/citation` can emit. */
export const CITATION_FORMATS: readonly CitationFormat[] = [
  'bibtex',
  'ris',
  'csl-json',
  'apa',
  'mla',
  'chicago',
  'harvard',
  'endnote',
  'text',
];

/** Content type each format is served with. */
export const CITATION_CONTENT_TYPES: Readonly<Record<CitationFormat, string>> = {
  bibtex: 'application/x-bibtex; charset=utf-8',
  ris: 'application/x-research-info-systems; charset=utf-8',
  'csl-json': 'application/vnd.citationstyles.csl+json; charset=utf-8',
  apa: 'text/plain; charset=utf-8',
  mla: 'text/plain; charset=utf-8',
  chicago: 'text/plain; charset=utf-8',
  harvard: 'text/plain; charset=utf-8',
  endnote: 'application/x-endnote-refer; charset=utf-8',
  text: 'text/plain; charset=utf-8',
};

/** Suggested download filename extension per format. */
export const CITATION_EXTENSIONS: Readonly<Record<CitationFormat, string>> = {
  bibtex: 'bib',
  ris: 'ris',
  'csl-json': 'json',
  apa: 'txt',
  mla: 'txt',
  chicago: 'txt',
  harvard: 'txt',
  endnote: 'enw',
  text: 'txt',
};

/**
 * Render an author as `Family, Given`, or as the literal name for
 * organisations and collective authors.
 *
 * @param author - Author record.
 */
export function authorName(author: CitationAuthor): string {
  if (author.literal !== '') {
    return author.literal;
  }
  return author.given === '' ? author.family : `${author.family}, ${author.given}`;
}

/**
 * Render an author in given-name-first order, as narrative styles want it.
 *
 * @param author - Author record.
 */
export function authorNameNatural(author: CitationAuthor): string {
  if (author.literal !== '') {
    return author.literal;
  }
  return author.given === '' ? author.family : `${author.given} ${author.family}`;
}

/**
 * Join author names with the separators a prose citation uses.
 *
 * @param names - Already-rendered names.
 * @param conjunction - Word placed before the final name.
 */
function joinNames(names: readonly string[], conjunction: string): string {
  if (names.length <= 1) {
    return names[0] ?? '';
  }
  const head = names.slice(0, -1).join(', ');
  return `${head} ${conjunction} ${names[names.length - 1] as string}`;
}

/** A stable, lowercase BibTeX citation key. */
export function bibtexKey(record: CitationRecord): string {
  const first = record.authors[0];
  const surname = first === undefined ? 'anon' : authorName(first);
  const slug = surname
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 24);
  return `${slug === '' ? 'anon' : slug}${record.year}ielts`;
}

/** Escape the characters BibTeX treats as markup. */
export function escapeBibtex(value: string): string {
  return value.replace(/[\\{}$&#_%~^]/g, (character) => `\\${character}`);
}

/** Zero-padded `YYYY/MM/DD`, the form Highwire and Scholar expect. */
export function slashDate(record: CitationRecord): string {
  const month = String(record.month).padStart(2, '0');
  const day = String(record.day).padStart(2, '0');
  return `${record.year}/${month}/${day}`;
}

/** ISO `YYYY-MM-DD`. */
export function isoDate(record: CitationRecord): string {
  return slashDate(record).replace(/\//g, '-');
}

/** The DOI as a resolvable URL, or `null` when no DOI has been minted. */
export function doiUrl(record: CitationRecord): string | null {
  return record.doi === null ? null : `https://doi.org/${record.doi}`;
}

/** BibTeX, using `@software` for code and `@misc` for datasets. */
export function toBibtex(record: CitationRecord): string {
  const entryType = record.type === 'software' ? 'software' : 'misc';
  const fields: [string, string][] = [
    ['title', record.title],
    ['author', record.authors.map(authorName).join(' and ')],
    ['year', String(record.year)],
    ['month', String(record.month)],
    ['version', record.version],
    ['publisher', record.publisher],
    ['url', record.url],
    ['license', record.license],
  ];
  if (record.doi !== null) {
    fields.push(['doi', record.doi]);
  }
  const body = fields.map(([key, value]) => `  ${key.padEnd(9)} = {${escapeBibtex(value)}}`).join(',\n');
  return `@${entryType}{${bibtexKey(record)},\n${body}\n}\n`;
}

/** RIS, understood by EndNote, Mendeley, Zotero and RefWorks. */
export function toRis(record: CitationRecord): string {
  const lines: string[] = [`TY  - ${record.type === 'software' ? 'COMP' : 'DATA'}`];
  lines.push(`TI  - ${record.title}`);
  for (const author of record.authors) {
    lines.push(`AU  - ${authorName(author)}`);
  }
  lines.push(`PY  - ${record.year}`);
  lines.push(`DA  - ${slashDate(record)}`);
  lines.push(`PB  - ${record.publisher}`);
  lines.push(`ET  - ${record.version}`);
  lines.push(`AB  - ${record.abstract}`);
  for (const keyword of record.keywords) {
    lines.push(`KW  - ${keyword}`);
  }
  lines.push(`UR  - ${record.url}`);
  if (record.doi !== null) {
    lines.push(`DO  - ${record.doi}`);
  }
  lines.push(`LA  - ${record.language}`);
  lines.push('ER  - ');
  return `${lines.join('\n')}\n`;
}

/** EndNote's tagged `refer` format. */
export function toEndnote(record: CitationRecord): string {
  const lines: string[] = ['%0 Computer Program', `%T ${record.title}`];
  for (const author of record.authors) {
    lines.push(`%A ${authorName(author)}`);
  }
  lines.push(`%D ${record.year}`);
  lines.push(`%I ${record.publisher}`);
  lines.push(`%7 ${record.version}`);
  lines.push(`%U ${record.url}`);
  if (record.doi !== null) {
    lines.push(`%R ${record.doi}`);
  }
  lines.push(`%X ${record.abstract}`);
  for (const keyword of record.keywords) {
    lines.push(`%K ${keyword}`);
  }
  return `${lines.join('\n')}\n`;
}

/** CSL-JSON, the interchange format used by citeproc and Zotero. */
export function toCslJson(record: CitationRecord): JsonValue {
  const csl: Record<string, JsonValue> = {
    id: bibtexKey(record),
    type: record.type === 'software' ? 'software' : 'dataset',
    title: record.title,
    'title-short': record.shortTitle,
    author: record.authors.map((author) =>
      author.literal === '' ? { family: author.family, given: author.given } : { literal: author.literal },
    ),
    issued: { 'date-parts': [[record.year, record.month, record.day]] },
    publisher: record.publisher,
    version: record.version,
    URL: record.url,
    abstract: record.abstract,
    keyword: record.keywords.join(', '),
    language: record.language,
    license: record.license,
  };
  if (record.doi !== null) {
    csl['DOI'] = record.doi;
  }
  return csl;
}

/** APA 7th edition. */
export function toApa(record: CitationRecord): string {
  const names = joinNames(record.authors.map(authorName), '&');
  const locator = doiUrl(record) ?? record.url;
  const descriptor = record.type === 'software' ? 'Computer software' : 'Data set';
  return `${names} (${record.year}). ${record.title} (Version ${record.version}) [${descriptor}]. ${record.publisher}. ${locator}`;
}

/** MLA 9th edition. */
export function toMla(record: CitationRecord): string {
  const names = joinNames(record.authors.map(authorName), 'and');
  const locator = doiUrl(record) ?? record.url;
  return `${names}. "${record.title}." Version ${record.version}, ${record.publisher}, ${record.year}, ${locator}.`;
}

/** Chicago 17th edition, author-date. */
export function toChicago(record: CitationRecord): string {
  const names = joinNames(record.authors.map(authorName), 'and');
  const locator = doiUrl(record) ?? record.url;
  return `${names}. ${record.year}. "${record.title}." Version ${record.version}. ${record.publisher}. ${locator}.`;
}

/** Harvard. */
export function toHarvard(record: CitationRecord): string {
  const names = joinNames(record.authors.map(authorName), 'and');
  const locator = doiUrl(record) ?? record.url;
  return `${names} (${record.year}) ${record.title}. Version ${record.version}. ${record.publisher}. Available at: ${locator}`;
}

/** A plain-language sentence for a README or an acknowledgements section. */
export function toText(record: CitationRecord): string {
  const names = joinNames(record.authors.map(authorNameNatural), 'and');
  const locator = doiUrl(record) ?? record.url;
  return `${record.shortTitle} version ${record.version} by ${names} (${record.year}), available at ${locator}.`;
}

/**
 * Render a record in the requested format.
 *
 * @param record - Bibliographic record.
 * @param format - Target serialisation.
 * @returns The rendered citation; CSL-JSON is pretty-printed.
 */
export function formatCitation(record: CitationRecord, format: CitationFormat): string {
  switch (format) {
    case 'bibtex':
      return toBibtex(record);
    case 'ris':
      return toRis(record);
    case 'csl-json':
      return `${JSON.stringify(toCslJson(record), null, 2)}\n`;
    case 'apa':
      return `${toApa(record)}\n`;
    case 'mla':
      return `${toMla(record)}\n`;
    case 'chicago':
      return `${toChicago(record)}\n`;
    case 'harvard':
      return `${toHarvard(record)}\n`;
    case 'endnote':
      return toEndnote(record);
    default:
      return `${toText(record)}\n`;
  }
}
