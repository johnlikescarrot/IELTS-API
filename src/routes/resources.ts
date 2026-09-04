/**
 * Resource catalogue routes (`/v1/resources`).
 */

import { RESOURCES, RESOURCE_TYPES, findResources } from '../data/resources.js';
import { matchesQuery, paginate, sortBy } from '../lib/search.js';
import { getEnum, getInt, getString, toParams } from '../lib/query.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';

/** List freely accessible preparation resources. */
function list(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const type = getEnum(params, 'type', RESOURCE_TYPES);
  const query = getString(params, 'q') ?? '';
  const limit = getInt(params, 'limit', 1, 100, 50);
  const offset = getInt(params, 'offset', 0, 1000, 0);

  const filtered = findResources(type).filter(
    (resource) =>
      query.length === 0 || matchesQuery([resource.name, resource.description, resource.provider], query),
  );
  const sorted = sortBy(filtered, (resource) => resource.name.toLowerCase(), 'asc');
  const page = paginate(sorted, limit, offset);
  return {
    data: page.items,
    meta: {
      total: page.total,
      limit: page.limit,
      offset: page.offset,
      hasMore: page.hasMore,
      type: type ?? null,
      types: RESOURCE_TYPES,
      freeOnly: true,
      count: RESOURCES.length,
    },
  };
}

/** Resource routes. */
export const resourceRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/resources',
    versioned: true,
    summary: 'Freely accessible IELTS preparation resources and open datasets.',
    handler: list,
  },
];
