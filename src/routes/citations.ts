/**
 * Scholarly citation routes (`/v1/citations`).
 *
 * These endpoints make the API maximally citable: every common exchange format
 * (BibTeX, RIS, CodeMeta, CFF), six human-readable styles, and a
 * discoverability scorecard that reports which metadata channels feed Google
 * Scholar, OpenAlex and the repository harvesters.
 */

import {
  CITATION_FORMATS,
  CITATION_STYLES,
  citationRecord,
  formatStyle,
  harvestabilityScorecard,
  toBibtex,
  toCff,
  toCodemeta,
  toRis,
} from '../data/citations.js';
import { badRequest } from '../lib/errors.js';

import type { CitationFormat, CitationStyle, JsonValue } from '../types.js';
import type { HandlerResult, RouteContext, RouteDefinition } from '../lib/route.js';

/** Content type for each machine-readable citation format. */
const FORMAT_CONTENT_TYPES: Record<CitationFormat, string> = {
  bibtex: 'application/x-bibtex; charset=utf-8',
  ris: 'application/x-research-info-systems; charset=utf-8',
  codemeta: 'application/json; charset=utf-8',
  cff: 'text/yaml; charset=utf-8',
};

/** Render one machine-readable format from the shared record. */
function renderFormat(format: CitationFormat): string {
  const record = citationRecord();
  switch (format) {
    case 'bibtex':
      return toBibtex(record);
    case 'ris':
      return toRis(record);
    case 'codemeta':
      return `${JSON.stringify(toCodemeta(record), null, 2)}\n`;
    case 'cff':
      return toCff(record);
  }
}

/** Citation index: the record plus links to every export and style. */
function index(): HandlerResult {
  const record = citationRecord();
  const scorecard = harvestabilityScorecard();
  const formats: Record<string, JsonValue> = {};
  for (const format of CITATION_FORMATS) {
    formats[format] = `/v1/citations/formats/${format}`;
  }
  const styles: Record<string, JsonValue> = {};
  for (const style of CITATION_STYLES) {
    styles[style] = `/v1/citations/styles/${style}`;
  }
  return {
    data: {
      record,
      formats,
      styles,
      scorecard: {
        present: scorecard.present,
        total: scorecard.total,
        coverage: scorecard.coverage,
      },
    },
    meta: {
      note: 'Cite the API when you use it in research; every format is rendered from one source of truth.',
    },
  };
}

/** Export a machine-readable citation format. */
function formatExport(context: RouteContext): HandlerResult {
  const format = context.params.format as string;
  if (!(CITATION_FORMATS as readonly string[]).includes(format)) {
    throw badRequest(`Unknown citation format "${format}".`, {
      parameter: 'format',
      received: format,
      allowed: CITATION_FORMATS.join(','),
    });
  }
  return {
    raw: {
      contentType: FORMAT_CONTENT_TYPES[format as CitationFormat],
      body: renderFormat(format as CitationFormat),
    },
  };
}

/** List the supported human-readable styles. */
function styleList(): HandlerResult {
  return {
    data: [...CITATION_STYLES],
    meta: { count: CITATION_STYLES.length, endpoint: '/v1/citations/styles/:style' },
  };
}

/** Render one human-readable citation. */
function styledCitation(context: RouteContext): HandlerResult {
  const style = context.params.style as string;
  if (!(CITATION_STYLES as readonly string[]).includes(style)) {
    throw badRequest(`Unknown citation style "${style}".`, {
      parameter: 'style',
      received: style,
      allowed: CITATION_STYLES.join(','),
    });
  }
  return {
    raw: {
      contentType: 'text/plain; charset=utf-8',
      body: `${formatStyle(citationRecord(), style as CitationStyle)}\n`,
    },
  };
}

/** The citation-discoverability scorecard. */
function scorecard(): HandlerResult {
  const result = harvestabilityScorecard();
  return {
    data: {
      present: result.present,
      total: result.total,
      coverage: result.coverage,
      channels: result.channels,
      recommendations: result.recommendations,
    },
    meta: {
      note: 'Presence is derived from the configured citation metadata and is deterministic.',
    },
  };
}

/** Citation routes. */
export const citationRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/citations',
    versioned: true,
    summary:
      'The citation record, links to every export format and style, and the discoverability scorecard.',
    handler: index,
  },
  {
    method: 'GET',
    path: '/v1/citations/formats/:format',
    versioned: true,
    summary: 'Export the citation as BibTeX, RIS, CodeMeta or CFF.',
    handler: formatExport,
  },
  {
    method: 'GET',
    path: '/v1/citations/styles',
    versioned: true,
    summary: 'List the supported human-readable citation styles.',
    handler: styleList,
  },
  {
    method: 'GET',
    path: '/v1/citations/styles/:style',
    versioned: true,
    summary: 'Render the citation in APA, MLA, Chicago, IEEE, Vancouver or Harvard style.',
    handler: styledCitation,
  },
  {
    method: 'GET',
    path: '/v1/citations/scorecard',
    versioned: true,
    summary: 'Which metadata channels feed Google Scholar, OpenAlex and repository harvesters.',
    handler: scorecard,
  },
];
