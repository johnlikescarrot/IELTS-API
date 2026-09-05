/** Free, no-auth access to descriptive metadata, never to upstream exercises. */
import {
  practiceCatalog,
  practiceCollections,
  practiceMeta,
  practiceStats,
  searchPractice,
  samplePractice,
  findPracticeItem,
} from '../data/practice.js';
import { PRACTICE_COLLECTION_IDS, PRACTICE_LEVELS } from '../data/practice-extract.js';
import { getEnum, getInt, getString, requireString, toParams } from '../lib/query.js';
import { notFound } from '../lib/errors.js';
import type { PracticeFilter } from '../data/practice.js';
import type { HandlerResult, RouteContext, RouteDefinition } from '../lib/route.js';
import type { QueryParams } from '../types.js';

function filters(params: QueryParams): PracticeFilter {
  const collection = getEnum(params, 'collection', PRACTICE_COLLECTION_IDS);
  const skill = getEnum(params, 'skill', ['listening', 'reading']);
  const level = getEnum(params, 'level', PRACTICE_LEVELS);
  const complete = getEnum(params, 'complete', ['true', 'false']);
  const query = getString(params, 'q');
  return {
    ...(collection === undefined ? {} : { collection }),
    ...(skill === undefined ? {} : { skill }),
    ...(level === undefined ? {} : { level }),
    ...(complete === undefined ? {} : { complete: complete === 'true' }),
    ...(query === undefined ? {} : { query }),
  };
}

function index(): HandlerResult {
  return { data: { collections: practiceCollections(), stats: practiceStats() }, meta: practiceMeta() };
}

function stats(): HandlerResult {
  return { data: practiceStats(), meta: practiceMeta() };
}

function items(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const filter = filters(params);
  const limit = getInt(params, 'limit', 1, 100, 20);
  const offset = getInt(params, 'offset', 0, 100000, 0);
  const page = searchPractice({ ...filter, limit, offset });
  return {
    data: page.items,
    meta: { ...practiceMeta(), total: page.total, limit, offset, hasMore: page.hasMore, filters: filter },
  };
}

function lookup(context: RouteContext): HandlerResult {
  const id = context.params.id!;
  const item = findPracticeItem(id);
  if (item === undefined) throw notFound(`No practice metadata for "${id}".`, { id });
  return { data: item, meta: practiceMeta() };
}

function sample(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const seed = requireString(params, 'seed');
  const count = getInt(params, 'count', 1, 50, 5);
  const filter = filters(params);
  const result = samplePractice(seed, count, filter);
  return {
    data: result,
    meta: { ...practiceMeta(), seed, requested: count, count: result.length, filters: filter },
  };
}

function snapshot(): HandlerResult {
  return {
    raw: {
      contentType: 'application/json; charset=utf-8',
      body: `${JSON.stringify(practiceCatalog(), null, 2)}\n`,
    },
  };
}

/** Practice inventory, provenance, search, deterministic sampling and archival export. */
export const practiceRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/practice',
    versioned: true,
    summary: 'Reading and listening metadata: collections, counts and pinned provenance.',
    handler: index,
  },
  {
    method: 'GET',
    path: '/v1/practice/stats',
    versioned: true,
    summary: 'Structural availability and duplicate-blob statistics, not learning outcomes.',
    handler: stats,
  },
  {
    method: 'GET',
    path: '/v1/practice/items',
    versioned: true,
    summary: 'Search practice metadata by collection, skill, source level or structural completeness.',
    handler: items,
  },
  {
    method: 'GET',
    path: '/v1/practice/sample',
    versioned: true,
    summary: 'Reproducible metadata sample without replacement (seed required).',
    handler: sample,
  },
  {
    method: 'GET',
    path: '/v1/practice/export',
    versioned: true,
    summary: 'Complete metadata snapshot as raw JSON with a verifiable payload checksum.',
    handler: snapshot,
  },
  {
    method: 'GET',
    path: '/v1/practice/items/:id',
    versioned: true,
    summary: 'Look up a stable practice metadata ID; no exercise content is served.',
    handler: lookup,
  },
];
