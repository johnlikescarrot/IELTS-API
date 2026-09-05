/**
 * Citation export (`/v1/citation`).
 *
 * Serving every reference-manager format directly from the API removes the last
 * excuse not to cite the work: no repository visit, no CFF parsing, no
 * hand-built BibTeX entry. Requesting a format returns it verbatim with the
 * content type that manager expects, so the response can be piped straight into
 * a `.bib` file or opened by Zotero.
 */

import { CITATION, DOI_IS_PLACEHOLDER, UPSTREAM_CITATIONS } from '../data/citation.js';
import {
  CITATION_CONTENT_TYPES,
  CITATION_EXTENSIONS,
  CITATION_FORMATS,
  authorName,
  doiUrl,
  formatCitation,
  toCslJson,
} from '../lib/citation.js';
import { getBoolean, getEnum, toParams } from '../lib/query.js';

import type { HandlerResult, RouteContext, RouteDefinition } from '../lib/route.js';
import type { JsonValue } from '../types.js';

/** Guidance repeated on every enveloped citation response. */
const GUIDANCE =
  'Cite the version you used. Tagged releases are archived on Zenodo, which mints a version-specific DOI alongside the concept DOI that always resolves to the latest release.';

/**
 * Serve the citation, either as a raw reference-manager payload or as the
 * standard JSON envelope listing every format at once.
 */
function citation(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const format = getEnum(params, 'format', CITATION_FORMATS);
  const upstream = getBoolean(params, 'upstream', false);
  const record = upstream ? (UPSTREAM_CITATIONS[0] as typeof CITATION) : CITATION;

  if (format !== undefined) {
    return {
      raw: {
        contentType: CITATION_CONTENT_TYPES[format],
        body: formatCitation(record, format),
      },
    };
  }

  const rendered: Record<string, JsonValue> = {};
  for (const candidate of CITATION_FORMATS) {
    rendered[candidate] = formatCitation(record, candidate);
  }

  return {
    data: {
      record: {
        title: record.title,
        shortTitle: record.shortTitle,
        authors: record.authors.map(authorName),
        year: record.year,
        version: record.version,
        publisher: record.publisher,
        doi: record.doi,
        doiUrl: doiUrl(record),
        url: record.url,
        repository: record.repository,
        license: record.license,
        keywords: record.keywords,
        abstract: record.abstract,
      },
      csl: toCslJson(record),
      formats: rendered,
    },
    meta: {
      formats: CITATION_FORMATS,
      extensions: CITATION_EXTENSIONS,
      contentTypes: CITATION_CONTENT_TYPES,
      doiIsPlaceholder: DOI_IS_PLACEHOLDER,
      upstream,
      guidance: GUIDANCE,
      usage:
        'Add ?format=bibtex (or ris, csl-json, apa, mla, chicago, harvard, endnote, text) to download one format verbatim; add ?upstream=true for the corpus this work derives from.',
      alsoCite:
        'Please cite the upstream corpus alongside this work: /v1/citation?upstream=true&format=bibtex',
    },
  };
}

/** Citation routes. */
export const citationRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/citation',
    versioned: true,
    summary: 'Citation metadata in BibTeX, RIS, CSL-JSON, APA, MLA, Chicago, Harvard or EndNote.',
    handler: citation,
  },
];
