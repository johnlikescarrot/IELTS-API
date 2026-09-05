/**
 * Practice corpus routes (`/v1/practice`).
 */

import { practiceFacets, practiceMeta, practiceStats, searchPractice } from '../data/practice.js';
import { parseList } from '../lib/search.js';
import { getEnum, getInt, getString, toParams } from '../lib/query.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';
import type { PracticeLevel, PracticeModule } from '../types.js';

const SORT_KEYS = ['title', 'module', 'level', 'size'] as const;
const ORDERS = ['asc', 'desc'] as const;

/** Practice-corpus metadata and aggregate statistics. */
function index(): HandlerResult {
  return {
    data: { meta: practiceMeta(), stats: practiceStats() },
    meta: {
      facets: {
        module: practiceFacets('module'),
        level: practiceFacets('level'),
        format: practiceFacets('format'),
      },
    },
  };
}

/** Practice-corpus statistics only. */
function stats(): HandlerResult {
  return { data: practiceStats() };
}

/** Search the practice index. */
function items(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const query = getString(params, 'q') ?? '';
  const limit = getInt(params, 'limit', 1, 100, 20);
  const offset = getInt(params, 'offset', 0, 1000, 0);
  const sort = getEnum(params, 'sort', SORT_KEYS);
  const order = getEnum(params, 'order', ORDERS);
  const modules = parseList(getString(params, 'module'), 'module', practiceFacets('module')) as
    PracticeModule[] | undefined;
  const levels = parseList(getString(params, 'level'), 'level', practiceFacets('level')) as
    PracticeLevel[] | undefined;
  const formats = parseList(getString(params, 'format'), 'format', practiceFacets('format'));
  const page = searchPractice({
    limit,
    offset,
    query,
    ...(modules === undefined ? {} : { modules }),
    ...(levels === undefined ? {} : { levels }),
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
        module: practiceFacets('module'),
        level: practiceFacets('level'),
        format: practiceFacets('format'),
      },
      note: practiceMeta().note,
    },
  };
}

/** Practice routes. */
export const practiceRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/practice',
    versioned: true,
    summary: 'Metadata and statistics for the indexed IELTS practice corpus.',
    handler: index,
  },
  {
    method: 'GET',
    path: '/v1/practice/stats',
    versioned: true,
    summary: 'Aggregate statistics only.',
    handler: stats,
  },
  {
    method: 'GET',
    path: '/v1/practice/items',
    versioned: true,
    summary: 'Search the practice index by module, level, format or free text.',
    handler: items,
  },
];
