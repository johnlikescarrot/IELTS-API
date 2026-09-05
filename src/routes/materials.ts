/**
 * Study-materials routes (`/v1/materials`).
 */

import { materialsFacets, materialsMeta, materialsStats, searchMaterials } from '../data/materials.js';
import { parseList } from '../lib/search.js';
import { getEnum, getInt, getString, toParams } from '../lib/query.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';

const SORT_KEYS = ['title', 'category', 'skill', 'size'] as const;
const ORDERS = ['asc', 'desc'] as const;

/** Materials metadata and aggregate statistics. */
function index(): HandlerResult {
  return {
    data: { meta: materialsMeta(), stats: materialsStats() },
    meta: {
      facets: {
        category: materialsFacets('category'),
        skill: materialsFacets('skill'),
        format: materialsFacets('format'),
      },
    },
  };
}

/** Materials statistics only. */
function stats(): HandlerResult {
  return { data: materialsStats() };
}

/** Search the materials index. */
function items(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const query = getString(params, 'q') ?? '';
  const limit = getInt(params, 'limit', 1, 100, 20);
  const offset = getInt(params, 'offset', 0, 1000, 0);
  const sort = getEnum(params, 'sort', SORT_KEYS);
  const order = getEnum(params, 'order', ORDERS);
  const categories = parseList(getString(params, 'category'), 'category', materialsFacets('category'));
  const skills = parseList(getString(params, 'skill'), 'skill', materialsFacets('skill'));
  const formats = parseList(getString(params, 'format'), 'format', materialsFacets('format'));
  const page = searchMaterials({
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
        category: materialsFacets('category'),
        skill: materialsFacets('skill'),
        format: materialsFacets('format'),
      },
      note: materialsMeta().note,
    },
  };
}

/** Materials routes. */
export const materialRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/materials',
    versioned: true,
    summary: 'Metadata and statistics for the indexed IELTS study-materials collection.',
    handler: index,
  },
  {
    method: 'GET',
    path: '/v1/materials/stats',
    versioned: true,
    summary: 'Aggregate statistics only.',
    handler: stats,
  },
  {
    method: 'GET',
    path: '/v1/materials/items',
    versioned: true,
    summary: 'Search the materials index by category, skill, format or free text.',
    handler: items,
  },
];
