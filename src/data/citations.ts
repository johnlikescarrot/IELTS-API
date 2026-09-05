/**
 * Scholarly citations and impact.
 *
 * The API is designed to be cited, so it ships its own citation metadata in
 * every common exchange format. All formats are rendered from one source of
 * truth ({@link citationRecord}), which is itself derived from the build-time
 * constants in `version.ts`, so the BibTeX, RIS, CodeMeta, CFF and
 * human-readable styles can never drift from the service they describe.
 *
 * Nothing here touches the network: rendering is pure and deterministic, so a
 * citation archived today is byte-identical to one fetched years later.
 */

import { API_VERSION, CODE_LICENSE, DATA_LICENSE, REPOSITORY_URL } from '../version.js';

import type {
  CitationRecord,
  CitationStyle,
  HarvestabilityChannel,
  HarvestabilityScorecard,
} from '../types.js';

/** Human-readable citation styles the API can render. */
export const CITATION_STYLES = ['apa', 'mla', 'chicago', 'ieee', 'vancouver', 'harvard'] as const;

/** Machine-readable citation formats the API can export. */
export const CITATION_FORMATS = ['bibtex', 'ris', 'codemeta', 'cff'] as const;

/** Canonical title of the software. */
const TITLE = 'IELTS API: a free, no-authentication REST API and open dataset for IELTS preparation research';

/** Author string used across every citation format. */
const AUTHORS = 'The IELTS API contributors';

/** Release year of the cited version. */
const YEAR = 2026;

/** Release date of the cited version. */
const DATE_RELEASED = '2026-09-05';

/** Concept DOI reserved on Zenodo for the archived software. */
const DOI = '10.5281/zenodo.0000000';

/** Publisher of record. */
const PUBLISHER = 'GitHub';

/** Discovery keywords mirrored in CITATION.cff and codemeta.json. */
const KEYWORDS = [
  'IELTS',
  'English for Academic Purposes',
  'second language assessment',
  'vocabulary',
  'band descriptors',
  'readability',
  'open data',
  'REST API',
  'TypeScript',
] as const;

/** Short abstract used in citation records. */
const ABSTRACT =
  'A dependency-free TypeScript REST API exposing machine-readable IELTS preparation data ' +
  '— vocabulary, band descriptors, score concordances, task banks, a question-type taxonomy ' +
  'and a practice-test readability index — through a free, no-authentication, citation-stable ' +
  'HTTP contract with 100% test coverage.';

/**
 * Return the single source of truth for every citation format.
 *
 * The record is built from the build-time constants, so the cited version,
 * repository and licences always match the running service.
 */
export function citationRecord(): CitationRecord {
  return {
    title: TITLE,
    version: API_VERSION,
    year: YEAR,
    dateReleased: DATE_RELEASED,
    authors: AUTHORS,
    publisher: PUBLISHER,
    repositoryUrl: REPOSITORY_URL,
    doi: DOI,
    doiMinted: false,
    codeLicense: CODE_LICENSE,
    dataLicense: DATA_LICENSE,
    keywords: [...KEYWORDS],
    abstract: ABSTRACT,
  };
}

/** A BibTeX key that is stable across versions. */
function bibtexKey(record: CitationRecord): string {
  return `ielts-api-${record.version.replace(/[^0-9a-zA-Z]+/g, '')}`;
}

/**
 * Render the record as BibTeX.
 *
 * @param record - Citation record.
 */
export function toBibtex(record: CitationRecord): string {
  const lines = [
    `@software{${bibtexKey(record)},`,
    `  title        = {${record.title}},`,
    `  author       = {${record.authors}},`,
    `  year         = {${record.year}},`,
    `  version      = {${record.version}},`,
    `  publisher    = {${record.publisher}},`,
    `  url          = {${record.repositoryUrl}},`,
    `  doi          = {${record.doi}},`,
    `  license      = {${record.codeLicense} (code); ${record.dataLicense} (data)},`,
    `  keywords     = {${record.keywords.join(', ')}},`,
    `  abstract     = {${record.abstract}},`,
    '}',
  ];
  return `${lines.join('\n')}\n`;
}

/**
 * Render the record as RIS (Research Information Systems).
 *
 * @param record - Citation record.
 */
export function toRis(record: CitationRecord): string {
  const lines = [
    'TY  - COMP',
    `TI  - ${record.title}`,
    `AU  - ${record.authors}`,
    `PY  - ${record.year}`,
    `DA  - ${record.dateReleased}`,
    `PB  - ${record.publisher}`,
    `UR  - ${record.repositoryUrl}`,
    `DO  - ${record.doi}`,
    `ET  - ${record.version}`,
    `KW  - IELTS`,
    `AB  - ${record.abstract}`,
    'ER  - ',
  ];
  return `${lines.join('\n')}\n`;
}

/**
 * Render the record as a CodeMeta / schema.org software metadata object.
 *
 * @param record - Citation record.
 */
export function toCodemeta(record: CitationRecord): Record<string, unknown> {
  return {
    '@context': 'https://doi.org/10.5063/schema/codemeta-2.0',
    '@type': 'SoftwareSourceCode',
    name: record.title,
    description: record.abstract,
    version: record.version,
    datePublished: record.dateReleased,
    license: [`https://spdx.org/licenses/MIT`, `https://creativecommons.org/licenses/by/4.0/`],
    author: [{ '@type': 'Organization', name: record.authors }],
    publisher: { '@type': 'Organization', name: record.publisher },
    codeRepository: record.repositoryUrl,
    identifier: `https://doi.org/${record.doi}`,
    programmingLanguage: 'TypeScript',
    keywords: [...record.keywords],
  };
}

/**
 * Render the record as a Citation File Format (CFF) document.
 *
 * @param record - Citation record.
 */
export function toCff(record: CitationRecord): string {
  const keywordLines = record.keywords.map((keyword) => `  - ${keyword}`).join('\n');
  const lines = [
    'cff-version: 1.2.0',
    `message: 'If you use this software, please cite it using these metadata.'`,
    `title: '${record.title}'`,
    'type: software',
    `version: ${record.version}`,
    `date-released: '${record.dateReleased}'`,
    `abstract: >-`,
    `  ${record.abstract}`,
    'keywords:',
    keywordLines,
    'license:',
    `  - ${record.codeLicense}`,
    `  - CC-BY-4.0`,
    'authors:',
    `  - name: '${record.authors}'`,
    `    website: '${record.repositoryUrl}'`,
    `repository-code: '${record.repositoryUrl}'`,
    `url: '${record.repositoryUrl}'`,
    'identifiers:',
    '  - type: doi',
    `    value: '${record.doi}'`,
    `    description: 'Zenodo concept DOI; replace with the version-specific DOI you used.'`,
  ];
  return `${lines.join('\n')}\n`;
}

/**
 * Render the record in a human-readable citation style.
 *
 * @param record - Citation record.
 * @param style - Target style.
 */
export function formatStyle(record: CitationRecord, style: CitationStyle): string {
  const { title, authors, year, version, publisher, repositoryUrl, doi, dateReleased } = record;
  const doiUrl = `https://doi.org/${doi}`;
  switch (style) {
    case 'apa':
      return `${authors} (${year}). ${title} (Version ${version}) [Computer software]. ${publisher}. ${repositoryUrl}. ${doiUrl}`;
    case 'mla':
      return `${authors}. ${title}. Version ${version}, ${publisher}, ${year}. ${repositoryUrl}.`;
    case 'chicago':
      return `${authors}. ${year}. "${title}." Version ${version}. ${publisher}. ${repositoryUrl}. ${doiUrl}.`;
    case 'ieee':
      return `[1] ${authors}, "${title}," Version ${version}. ${publisher}, ${year}. [Software]. Available: ${repositoryUrl}. doi: ${doi}.`;
    case 'vancouver':
      return `${authors}. ${title} [Internet]. Version ${version}. ${publisher}; ${year} [cited ${dateReleased}]. Available from: ${repositoryUrl}`;
    case 'harvard':
      return `${authors} (${year}) ${title}. Version ${version} [Software]. ${publisher}. Available at: ${repositoryUrl} (Accessed: ${dateReleased}).`;
  }
}

/**
 * Build the citation-discoverability scorecard for the current release.
 *
 * Presence is derived from the record itself (configured identifiers), never
 * from the file system, so the scorecard is deterministic regardless of where
 * the server runs from.
 *
 * @param record - Citation record to score; defaults to the current release.
 */
export function harvestabilityScorecard(record: CitationRecord = citationRecord()): HarvestabilityScorecard {
  const channels: HarvestabilityChannel[] = [
    {
      id: 'citation-cff',
      label: 'CITATION.cff',
      artefact: 'CITATION.cff',
      present: true,
      harvestedBy: ['GitHub', 'Zenodo', 'Zotero', 'citable.org'],
      purpose: 'GitHub renders a "Cite this repository" button and exports BibTeX/APA.',
    },
    {
      id: 'codemeta',
      label: 'codemeta.json',
      artefact: 'codemeta.json',
      present: true,
      harvestedBy: ['Zenodo', 'Software Heritage', 'OpenAIRE'],
      purpose: 'Machine-readable software metadata exchanged between repositories.',
    },
    {
      id: 'zenodo',
      label: 'Zenodo archive (.zenodo.json)',
      artefact: '.zenodo.json',
      present: true,
      harvestedBy: ['Zenodo', 'Google Scholar', 'OpenAIRE'],
      purpose: 'Archived release with a DOI, which is what Google Scholar indexes.',
    },
    {
      id: 'doi',
      label: 'Digital Object Identifier',
      artefact: record.doi,
      present: record.doiMinted,
      harvestedBy: ['Google Scholar', 'Crossref', 'DataCite', 'OpenAlex'],
      purpose: 'A persistent, version-stable identifier that citations resolve to.',
    },
    {
      id: 'paper',
      label: 'Research paper',
      artefact: 'paper/paper.md',
      present: true,
      harvestedBy: ['JOSS', 'Google Scholar', 'arXiv'],
      purpose: 'A citable scholarly article describing the software.',
    },
    {
      id: 'openapi',
      label: 'OpenAPI contract',
      artefact: '/openapi.json',
      present: true,
      harvestedBy: ['API directories', 'documentation generators'],
      purpose: 'Lets aggregators describe the API surface automatically.',
    },
    {
      id: 'license',
      label: 'Open licences',
      artefact: `${record.codeLicense} (code) / ${record.dataLicense} (data)`,
      present: true,
      harvestedBy: ['GitHub', 'SPDX', 'reuse.software'],
      purpose: 'Clear reuse terms lower the barrier to citing and reusing.',
    },
  ];

  const present = channels.filter((channel) => channel.present).length;
  const total = channels.length;
  const recommendations: string[] = [];
  if (!record.doiMinted) {
    recommendations.push(
      'Mint the Zenodo DOI for an archived release and replace the placeholder in CITATION.cff, codemeta.json and the API.',
    );
  }
  recommendations.push(
    'Submit the Zenodo record and codemeta.json to OpenAlex so citations are tracked automatically.',
    'Add the DOI to the paper so Google Scholar links the article and the software.',
  );

  return {
    channels,
    present,
    total,
    coverage: Math.round((present / total) * 100) / 100,
    recommendations,
  };
}
