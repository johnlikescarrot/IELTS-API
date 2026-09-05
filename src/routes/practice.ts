/** Free, no-authentication endpoints for the practice metadata catalogue. */

import {
  findPracticeItem,
  practiceCollections,
  practiceManifest,
  samplePractice,
  searchPractice,
} from '../data/practice.js';
import {
  PRACTICE_AUDIO_STATUSES,
  PRACTICE_COLLECTION_IDS,
  PRACTICE_LEVELS,
  PRACTICE_MODES,
  PRACTICE_SKILLS,
} from '../data/practice-source.js';
import { badRequest, notFound } from '../lib/errors.js';
import { getEnum, getInt, getString, requireString, toParams } from '../lib/query.js';

import type { PracticeFilters } from '../data/practice.js';
import type { HandlerResult, RouteContext, RouteDefinition } from '../lib/route.js';
import type { QueryParams } from '../types.js';

const FILTERS = ['q', 'skill', 'collection', 'level', 'mode', 'audio'];

/** Reject unknown keys so a typo cannot silently change a research population. */
function parameters(context: RouteContext, allowed: readonly string[]): QueryParams {
  for (const key of context.url.searchParams.keys()) {
    if (!allowed.includes(key)) throw badRequest(`Unknown parameter "${key}".`, { parameter: key });
  }
  return toParams(context.url);
}

function filters(params: QueryParams): PracticeFilters {
  return {
    query: getString(params, 'q'),
    skill: getEnum(params, 'skill', PRACTICE_SKILLS),
    collection: getEnum(params, 'collection', PRACTICE_COLLECTION_IDS),
    level: getEnum(params, 'level', PRACTICE_LEVELS),
    mode: getEnum(params, 'mode', PRACTICE_MODES),
    audio: getEnum(params, 'audio', PRACTICE_AUDIO_STATUSES),
  };
}

function filterMetadata(options: PracticeFilters): Record<string, string> {
  return Object.fromEntries(Object.entries(options).filter((entry) => entry[1] !== undefined)) as Record<
    string,
    string
  >;
}

function provenance(): Record<string, string> {
  const manifest = practiceManifest();
  return {
    datasetSha256: manifest.integrity.value,
    sourceCommit: manifest.source.commit,
    note: manifest.source.note,
  };
}

function manifest(context: RouteContext): HandlerResult {
  parameters(context, []);
  return { data: practiceManifest() };
}

function collections(context: RouteContext): HandlerResult {
  parameters(context, []);
  const data = practiceCollections();
  return { data, meta: { ...provenance(), total: data.length } };
}

function items(context: RouteContext): HandlerResult {
  const params = parameters(context, [...FILTERS, 'limit', 'offset']);
  const selected = filters(params);
  const page = searchPractice({
    ...selected,
    limit: getInt(params, 'limit', 1, 100, 20),
    offset: getInt(params, 'offset', 0, Number.MAX_SAFE_INTEGER, 0),
  });
  return {
    data: page.items,
    meta: {
      ...provenance(),
      filters: filterMetadata(selected),
      total: page.total,
      limit: page.limit,
      offset: page.offset,
      hasMore: page.hasMore,
    },
  };
}

function item(context: RouteContext): HandlerResult {
  parameters(context, []);
  const id = context.params.id as string;
  const found = findPracticeItem(id);
  if (found === undefined) throw notFound(`No indexed practice item has ID "${id}".`, { id });
  return { data: found, meta: provenance() };
}

function sample(context: RouteContext): HandlerResult {
  const params = parameters(context, [...FILTERS, 'seed', 'count']);
  const selected = filters(params);
  const result = samplePractice({
    ...selected,
    seed: requireString(params, 'seed'),
    count: getInt(params, 'count', 1, 50, 5),
  });
  return {
    data: result.items,
    meta: {
      ...provenance(),
      filters: filterMetadata(selected),
      seed: result.seed,
      requested: result.requested,
      returned: result.items.length,
      population: result.population,
      samplingAlgorithm: result.samplingAlgorithm,
    },
  };
}

/** Metadata-only practice routes; all retain the shared GET/HEAD/OPTIONS contract. */
export const practiceRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/practice',
    versioned: true,
    summary: 'Practice metadata manifest, provenance, rights and SHA-256 fingerprint.',
    handler: manifest,
  },
  {
    method: 'GET',
    path: '/v1/practice/collections',
    versioned: true,
    summary: 'Reading and Listening collections with declared and observed counts.',
    handler: collections,
  },
  {
    method: 'GET',
    path: '/v1/practice/items',
    versioned: true,
    summary: 'Search practice metadata by skill, collection, source level, mode or audio presence.',
    handler: items,
  },
  {
    method: 'GET',
    path: '/v1/practice/sample',
    versioned: true,
    summary: 'Reproducible metadata sample without replacement; requires an explicit seed.',
    handler: sample,
  },
  {
    method: 'GET',
    path: '/v1/practice/items/:id',
    versioned: true,
    summary: 'Look up a practice metadata record by its stable, path-derived ID.',
    handler: item,
  },
];
