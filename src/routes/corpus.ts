/**
 * Research corpus routes (`/v1/corpus`).
 */

import { corpusFacets, corpusMeta, corpusStats, searchCorpus } from '../data/corpus.js';
import { parseList } from '../lib/search.js';
import { getEnum, getInt, getString, toParams } from '../lib/query.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';

const SORT_KEYS = ['title', 'category', 'skill', 'size'] as const;
const ORDERS = ['asc', 'desc'] as const;

/** Corpus metadata and aggregate statistics. */
function index(): HandlerResult {
  return {
    data: { meta: corpusMeta(), stats: corpusStats() },
    meta: {
      facets: {
        category: corpusFacets('category'),
        skill: corpusFacets('skill'),
        format: corpusFacets('format'),
      },
    },
  };
}

/** Corpus statistics only. */
function stats(): HandlerResult {
  return { data: corpusStats() };
}

/** Search the corpus index. */
function items(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const query = getString(params, 'q') ?? '';
  const limit = getInt(params, 'limit', 1, 100, 20);
  const offset = getInt(params, 'offset', 0, 1000, 0);
  const sort = getEnum(params, 'sort', SORT_KEYS);
  const order = getEnum(params, 'order', ORDERS);
  const categories = parseList(getString(params, 'category'), 'category', corpusFacets('category'));
  const skills = parseList(getString(params, 'skill'), 'skill', corpusFacets('skill'));
  const formats = parseList(getString(params, 'format'), 'format', corpusFacets('format'));
  const page = searchCorpus({
    limit,
    offset,
    query,
    ...(categories === undefined ? {} : { categories }),
    ...(skills === undefined ? {} : { skills }),
    ...(formats === undefined ? {} : { formats }),
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
      sort: sort ?? 'title',
      order: order ?? 'asc',
      facets: {
        category: corpusFacets('category'),
        skill: corpusFacets('skill'),
        format: corpusFacets('format'),
      },
      note: corpusMeta().note,
    },
  };
}

/** Corpus routes. */
export const corpusRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/corpus',
    versioned: true,
    summary: 'Metadata and statistics for the indexed IELTS research corpus.',
    handler: index,
  },
  {
    method: 'GET',
    path: '/v1/corpus/stats',
    versioned: true,
    summary: 'Aggregate statistics only.',
    handler: stats,
  },
  {
    method: 'GET',
    path: '/v1/corpus/items',
    versioned: true,
    summary: 'Search the corpus index by category, skill, format or free text.',
    handler: items,
  },
];
