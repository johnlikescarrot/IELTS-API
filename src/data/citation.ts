/**
 * The canonical bibliographic record for this project.
 *
 * One record, one source of truth. `CITATION.cff`, `codemeta.json`,
 * `.zenodo.json`, the Highwire Press meta tags on the paper landing page, the
 * generated PDF and every format served from `/v1/citation` are all rendered
 * from the fields below, so a citation can never disagree with itself across
 * surfaces — which is precisely the failure mode that causes Google Scholar to
 * split one work into several phantom records and scatter its citations.
 */

import { API_VERSION, REPOSITORY_URL } from '../version.js';

import type { CitationRecord } from '../types.js';

/**
 * Placeholder Zenodo DOI.
 *
 * Zenodo mints the concept DOI when the repository is first archived; the
 * release workflow rewrites this constant. It is exposed as a separate export
 * so consumers can detect the unarchived state rather than cite a dead handle.
 */
export const ZENODO_CONCEPT_DOI = '10.5281/zenodo.0000000';

/** `true` while the DOI is still the unminted placeholder. */
export const DOI_IS_PLACEHOLDER = ZENODO_CONCEPT_DOI.endsWith('0000000');

/** The bibliographic record describing this software and its datasets. */
export const CITATION: CitationRecord = {
  type: 'software',
  title: 'IELTS API: a free, no-authentication REST API and open dataset for IELTS preparation research',
  shortTitle: 'IELTS API',
  authors: [{ family: 'The IELTS API contributors', given: '', literal: 'The IELTS API contributors' }],
  year: 2026,
  month: 9,
  day: 5,
  publisher: 'Zenodo',
  version: API_VERSION,
  doi: ZENODO_CONCEPT_DOI,
  url: REPOSITORY_URL,
  repository: REPOSITORY_URL,
  license: 'MIT (code); CC BY 4.0 (data)',
  language: 'en',
  keywords: [
    'IELTS',
    'English for Academic Purposes',
    'second language assessment',
    'language testing',
    'vocabulary',
    'band descriptors',
    'score concordance',
    'raw score conversion',
    'open data',
    'REST API',
    'reproducible research',
    'TypeScript',
  ],
  abstract:
    'IELTS API is an open, dependency-free TypeScript REST API that publishes machine-readable IELTS preparation data: a 4,174-headword vocabulary dataset derived from the Cambridge IELTS 1-22 word lists, condensed analytic band descriptors, indicative score concordances against five other scales, raw-score to band-score conversion tables for the Listening and Reading papers, the complete Listening and Reading question-type taxonomy, test-format blueprints, Writing and Speaking task banks, and a curated metadata index of an open IELTS research corpus. Every endpoint is free of charge and requires no authentication, returns a uniform JSON envelope with a deterministic ETag, and is covered by a test suite enforcing 100% statement, branch, function and line coverage.',
};

/** Works this project depends on and asks its users to cite alongside it. */
export const UPSTREAM_CITATIONS: readonly CitationRecord[] = [
  {
    type: 'dataset',
    title: 'IELTS: an open corpus of IELTS preparation materials',
    shortTitle: 'IELTS open corpus',
    authors: [{ family: 'zhengyishiming', given: '', literal: 'zhengyishiming' }],
    year: 2024,
    month: 9,
    day: 2,
    publisher: 'GitHub',
    version: 'a9e2d6c',
    doi: null,
    url: 'https://github.com/zhengyishiming/IELTS',
    repository: 'https://github.com/zhengyishiming/IELTS',
    license: 'unspecified',
    language: 'en',
    keywords: ['IELTS', 'corpus', 'open data'],
    abstract:
      'An unfiltered dump of 404 study files, of which 76 are IELTS or English-learning material. The vocabulary dataset published by this API is derived from its 1-22yas.xlsx workbook.',
  },
];
