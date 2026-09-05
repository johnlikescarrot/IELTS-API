/**
 * Collocation bank routes (`/v1/collocations`).
 *
 * The bank publishes collocations and sentence frames with their
 * argumentative dimension, sub-group, polarity and upstream gloss. The
 * upstream model answers the note also contains are never served.
 */

import {
  COLLOCATION_KINDS,
  COLLOCATION_POLARITIES,
  collocationDimensions,
  collocationsMeta,
  collocationsStats,
  observedDimensions,
  observedGroups,
  randomCollocations,
  searchCollocations,
} from '../data/collocations.js';
import { parseList } from '../lib/search.js';
import { getEnum, getInt, getString, toParams } from '../lib/query.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';

const SORT_KEYS = ['phrase', 'dimension', 'polarity'] as const;
const ORDERS = ['asc', 'desc'] as const;

/** Bank metadata, statistics and the dimension catalogue. */
function index(): HandlerResult {
  return {
    data: { meta: collocationsMeta(), stats: collocationsStats(), dimensions: collocationDimensions() },
    meta: { note: collocationsMeta().note },
  };
}

/** Bank statistics only. */
function stats(): HandlerResult {
  return { data: collocationsStats(), meta: { note: collocationsMeta().note } };
}

/** The dimension catalogue with live phrase counts. */
function dimensions(): HandlerResult {
  const catalogue = collocationDimensions();
  return {
    data: catalogue,
    meta: {
      count: catalogue.length,
      groups: observedGroups().length,
      note: collocationsMeta().note,
    },
  };
}

/** Search the bank. */
function items(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const query = getString(params, 'q') ?? '';
  const limit = getInt(params, 'limit', 1, 100, 20);
  const offset = getInt(params, 'offset', 0, 10000, 0);
  const sort = getEnum(params, 'sort', SORT_KEYS);
  const order = getEnum(params, 'order', ORDERS);
  const dimensionList = parseList(getString(params, 'dimension'), 'dimension', observedDimensions());
  const groupList = parseList(getString(params, 'group'), 'group', observedGroups());
  const polarityList = parseList(getString(params, 'polarity'), 'polarity', COLLOCATION_POLARITIES);
  const kindList = parseList(getString(params, 'kind'), 'kind', COLLOCATION_KINDS);
  const page = searchCollocations({
    limit,
    offset,
    query,
    ...(dimensionList === undefined ? {} : { dimensions: dimensionList }),
    ...(groupList === undefined ? {} : { groups: groupList }),
    ...(polarityList === undefined ? {} : { polarities: polarityList }),
    ...(kindList === undefined ? {} : { kinds: kindList }),
    ...(sort === undefined ? {} : { sort }),
    ...(order === undefined ? {} : { order }),
  });
  return {
    data: page.items,
    meta: {
      total: page.total,
      limit: page.limit,
      offset: page.offset,
      hasMore: page.hasMore,
      query: query.length > 0 ? query : null,
      dimension: dimensionList ?? null,
      group: groupList ?? null,
      polarity: polarityList ?? null,
      kind: kindList ?? null,
      sort: sort ?? 'phrase',
      order: order ?? 'asc',
      facets: {
        dimension: observedDimensions(),
        polarity: [...COLLOCATION_POLARITIES],
        kind: [...COLLOCATION_KINDS],
      },
      note: collocationsMeta().note,
    },
  };
}

/** Deterministic random sample. */
function random(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const count = getInt(params, 'count', 1, 50, 5);
  const seed = getString(params, 'seed') ?? String(Date.now());
  return { data: randomCollocations(seed, count), meta: { count, seed } };
}

/** Collocation routes. */
export const collocationRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/collocations',
    versioned: true,
    summary: 'Metadata, statistics and the dimension catalogue of the collocation bank.',
    handler: index,
  },
  {
    method: 'GET',
    path: '/v1/collocations/stats',
    versioned: true,
    summary: 'Aggregate statistics only.',
    handler: stats,
  },
  {
    method: 'GET',
    path: '/v1/collocations/dimensions',
    versioned: true,
    summary: 'The argumentative dimensions with live phrase counts.',
    handler: dimensions,
  },
  {
    method: 'GET',
    path: '/v1/collocations/items',
    versioned: true,
    summary: 'Search the bank by dimension, group, polarity, kind or free text.',
    handler: items,
  },
  {
    method: 'GET',
    path: '/v1/collocations/random',
    versioned: true,
    summary: 'A seeded random sample of collocations and frames.',
    handler: random,
  },
];
