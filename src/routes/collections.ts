/**
 * Collection routes (`/v1/collections`).
 *
 * At present this serves the Oxidaner/ielts collection, a metadata-only index
 * of a personal IELTS self-study dump. Like `/v1/corpus`, only metadata is
 * published; the upstream files are third-party material.
 */

import { oxidanerFacets, oxidanerMeta, oxidanerStats, searchOxidaner } from '../data/collections.js';
import { parseList } from '../lib/search.js';
import { getEnum, getInt, getString, toParams } from '../lib/query.js';

import type { HandlerResult, RouteContext, RouteDefinition } from '../lib/route.js';

const SORT_KEYS = ['title', 'skill', 'category', 'size'] as const;
const ORDERS = ['asc', 'desc'] as const;

/** Collection metadata and aggregate statistics. */
function index(): HandlerResult {
  return {
    data: { meta: oxidanerMeta(), stats: oxidanerStats() },
    meta: {
      facets: {
        skill: oxidanerFacets('skill'),
        category: oxidanerFacets('category'),
        format: oxidanerFacets('format'),
      },
    },
  };
}

/** Collection statistics only. */
function stats(): HandlerResult {
  return { data: oxidanerStats() };
}

/** Search the collection index. */
function items(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const query = getString(params, 'q') ?? '';
  const limit = getInt(params, 'limit', 1, 100, 20);
  const offset = getInt(params, 'offset', 0, 100000, 0);
  const sort = getEnum(params, 'sort', SORT_KEYS);
  const order = getEnum(params, 'order', ORDERS);
  const skills = parseList(getString(params, 'skill'), 'skill', oxidanerFacets('skill'));
  const categories = parseList(getString(params, 'category'), 'category', oxidanerFacets('category'));
  const formats = parseList(getString(params, 'format'), 'format', oxidanerFacets('format'));
  const page = searchOxidaner({
    limit,
    offset,
    query,
    ...(skills === undefined ? {} : { skills }),
    ...(categories === undefined ? {} : { categories }),
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
        skill: oxidanerFacets('skill'),
        category: oxidanerFacets('category'),
        format: oxidanerFacets('format'),
      },
      note: oxidanerMeta().note,
    },
  };
}

/** Collection routes. */
export const collectionRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/collections/oxidaner',
    versioned: true,
    summary: 'Metadata and statistics for the indexed Oxidaner/ielts collection.',
    handler: index,
  },
  {
    method: 'GET',
    path: '/v1/collections/oxidaner/stats',
    versioned: true,
    summary: 'Aggregate statistics for the Oxidaner/ielts collection.',
    handler: stats,
  },
  {
    method: 'GET',
    path: '/v1/collections/oxidaner/items',
    versioned: true,
    summary: 'Search the Oxidaner/ielts index by skill, category, format or free text.',
    handler: items,
  },
];
