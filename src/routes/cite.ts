/**
 * Citation routes (`/v1/cite`).
 *
 * The API renders its own citation in the five formats that cover almost every
 * submission workflow. Machine-readable citation metadata already lives in
 * `CITATION.cff`, `codemeta.json` and `.zenodo.json`; this endpoint serves the
 * human-facing equivalent, so a reader can copy a reference without leaving
 * the response they are citing.
 */

import { CITATION_FORMATS, citationBundle, renderCitation } from '../lib/citation.js';
import { getEnum, getIsoDate, toParams } from '../lib/query.js';
import { API_VERSION, CODE_LICENSE, DATA_LICENSE, REPOSITORY_URL } from '../version.js';

import type { CitationWork } from '../lib/citation.js';
import type { HandlerResult, RouteContext, RouteDefinition } from '../lib/route.js';

/** Title used in every rendering. */
export const WORK_TITLE =
  'IELTS API: a free, no-authentication REST API and open dataset for IELTS preparation research';

/** Author string used in every rendering. */
export const WORK_AUTHORS = 'The IELTS API contributors';

/** Publication year of the cited version. */
export const WORK_YEAR = 2026;

/** DOI of the archived release; a placeholder until a release is deposited. */
export const WORK_DOI = '10.5281/zenodo.0000000';

/** Publisher named by the citation formats. */
export const WORK_PUBLISHER = 'Zenodo';

/**
 * Assemble the work metadata for a given access date.
 *
 * @param accessed - ISO-8601 access date.
 */
export function workFor(accessed: string): CitationWork {
  return {
    title: WORK_TITLE,
    authors: WORK_AUTHORS,
    version: API_VERSION,
    year: WORK_YEAR,
    url: REPOSITORY_URL,
    doi: WORK_DOI,
    publisher: WORK_PUBLISHER,
    accessed,
  };
}

/** Render the citation in one or every supported format. */
function cite(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const accessed = getIsoDate(params, 'accessed', new Date().toISOString().slice(0, 10));
  const format = getEnum(params, 'format', CITATION_FORMATS);
  const work = workFor(accessed);

  if (format === undefined) {
    return {
      data: citationBundle(work),
      meta: {
        formats: CITATION_FORMATS,
        licenses: { code: CODE_LICENSE, data: DATA_LICENSE },
        machineReadable: {
          cff: `${REPOSITORY_URL}/blob/main/CITATION.cff`,
          codemeta: `${REPOSITORY_URL}/blob/main/codemeta.json`,
          zenodo: `${REPOSITORY_URL}/blob/main/.zenodo.json`,
        },
        note: 'Cite the version you used. The DOI resolves to the archived release; replace it with the version DOI once minted.',
      },
    };
  }

  return {
    raw: {
      contentType: 'text/plain; charset=utf-8',
      body: `${renderCitation(work, format)}\n`,
    },
  };
}

/** Citation routes. */
export const citeRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/cite',
    versioned: true,
    summary: 'Ready-to-paste citations for this API in BibTeX, APA, MLA, Chicago and RIS.',
    handler: cite,
  },
];
