/** Metadata-only practice discovery, reproducible sampling and offline export. */

import {
  exportPractice,
  findPracticeUnit,
  practiceIndex,
  samplePractice,
  searchPractice,
} from '../data/practice.js';
import {
  PRACTICE_ASSETS,
  PRACTICE_LEVELS,
  PRACTICE_MODES,
  PRACTICE_SKILLS,
} from '../data/practice-source.js';
import { envelopeSchema } from '../lib/schemas.js';
import { badRequest, notFound } from '../lib/errors.js';
import { getBoundedString, getEnum, getInt, requireString, strictParams } from '../lib/query.js';

import type { PracticeFilter } from '../data/practice.js';
import type { HandlerResult, RouteContext, RouteDefinition } from '../lib/route.js';
import type { JsonValue, QueryParams } from '../types.js';

const FILTERS = ['q', 'skill', 'mode', 'level', 'asset'];

/** Parse the same filters for search, sampling and export. */
function filters(params: QueryParams): PracticeFilter {
  const query = getBoundedString(params, 'q', 200);
  const skill = getEnum(params, 'skill', PRACTICE_SKILLS);
  const mode = getEnum(params, 'mode', PRACTICE_MODES);
  const level = getEnum(params, 'level', PRACTICE_LEVELS);
  const asset = getEnum(params, 'asset', PRACTICE_ASSETS);
  return {
    ...(query === undefined ? {} : { query }),
    ...(skill === undefined ? {} : { skill }),
    ...(mode === undefined ? {} : { mode }),
    ...(level === undefined ? {} : { level }),
    ...(asset === undefined ? {} : { asset }),
  };
}

/** Include the rights boundary and fingerprint in every enveloped response. */
function metadata(options: PracticeFilter = {}): Record<string, JsonValue> {
  const index = practiceIndex();
  return {
    source: index.source,
    metadataLicense: index.metadataLicense,
    indexSha256: index.itemsSha256,
    filters: options,
    note: 'Metadata only. Upstream content is not redistributed or licensed by this API; file presence and level labels are not quality or proficiency guarantees.',
  };
}

function list(context: RouteContext): HandlerResult {
  const params = strictParams(context.url, [...FILTERS, 'limit', 'offset']);
  const options = filters(params);
  const limit = getInt(params, 'limit', 1, 100, 20);
  const offset = getInt(params, 'offset', 0, 1_000_000, 0);
  const page = searchPractice({ ...options, limit, offset });
  return {
    data: page.items,
    meta: { ...metadata(options), total: page.total, limit, offset, hasMore: page.hasMore },
  };
}

function stats(context: RouteContext): HandlerResult {
  strictParams(context.url, []);
  return { data: practiceIndex().stats, meta: metadata() };
}

function detail(context: RouteContext): HandlerResult {
  strictParams(context.url, []);
  const id = context.params.id as string;
  const item = findPracticeUnit(id);
  if (item === undefined) throw notFound(`No practice metadata for "${id}".`, { id });
  return { data: item, meta: metadata() };
}

function sample(context: RouteContext): HandlerResult {
  const params = strictParams(context.url, [...FILTERS, 'seed', 'count']);
  const options = filters(params);
  const seed = requireString(params, 'seed');
  if (seed.length > 128) {
    throw badRequest('Parameter "seed" must not exceed 128 characters.', { parameter: 'seed' });
  }
  const count = getInt(params, 'count', 1, 50, 5);
  const items = samplePractice(options, seed, count);
  const population = searchPractice({ ...options, limit: 1, offset: 0 }).total;
  return {
    data: items,
    meta: {
      ...metadata(options),
      seed,
      count,
      returned: items.length,
      population,
      algorithm: 'fnv1a-mulberry32-partial-fisher-yates-v1',
      order: 'canonical-id',
    },
  };
}

function jsonLines(context: RouteContext): HandlerResult {
  const params = strictParams(context.url, FILTERS);
  return {
    raw: {
      contentType: 'application/x-ndjson; charset=utf-8',
      body: exportPractice(filters(params)),
    },
  };
}

/** Literal metadata routes precede the stable unit-ID route. */
export const practiceRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/practice',
    versioned: true,
    summary: 'Search Reading/Listening practice metadata; no exercise content is redistributed.',
    handler: list,
    response: {
      contentType: 'application/json',
      schema: envelopeSchema(
        { type: 'array', items: { $ref: '#/components/schemas/PracticeUnit' } },
        { $ref: '#/components/schemas/PracticeMeta' },
      ),
    },
  },
  {
    method: 'GET',
    path: '/v1/practice/stats',
    versioned: true,
    summary: 'Observed unit counts, declared counts, missing sequences and audio availability.',
    handler: stats,
    response: {
      contentType: 'application/json',
      schema: envelopeSchema(
        { $ref: '#/components/schemas/PracticeStats' },
        { $ref: '#/components/schemas/PracticeMeta' },
      ),
    },
  },
  {
    method: 'GET',
    path: '/v1/practice/sample',
    versioned: true,
    summary: 'Reproducible metadata sampling without replacement; a seed is required.',
    handler: sample,
    response: {
      contentType: 'application/json',
      schema: envelopeSchema(
        { type: 'array', items: { $ref: '#/components/schemas/PracticeUnit' } },
        { $ref: '#/components/schemas/PracticeMeta' },
      ),
    },
  },
  {
    method: 'GET',
    path: '/v1/practice/export',
    versioned: true,
    summary: 'Export the full filtered metadata population as provenance-bearing JSON Lines.',
    handler: jsonLines,
    response: {
      contentType: 'application/x-ndjson',
      schema: {
        type: 'string',
        description:
          'One PracticeExportRecord JSON object per line, with a trailing newline. Empty selections have no records.',
        'x-record-schema': { $ref: '#/components/schemas/PracticeExportRecord' },
      },
    },
  },
  {
    method: 'GET',
    path: '/v1/practice/:id',
    versioned: true,
    summary: 'One stable practice-unit ID with pinned directory references and file metadata.',
    handler: detail,
    response: {
      contentType: 'application/json',
      schema: envelopeSchema(
        { $ref: '#/components/schemas/PracticeUnit' },
        { $ref: '#/components/schemas/PracticeMeta' },
      ),
    },
  },
];
