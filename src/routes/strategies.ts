/**
 * Learning-strategy routes (`/v1/strategies`).
 */

import { STRATEGY_SKILLS, findStrategy, searchStrategies, strategyStats } from '../data/strategies.js';
import { getEnum, getInt, getString, toParams } from '../lib/query.js';
import { notFound } from '../lib/errors.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';

/** Filter and list strategy cards. */
function search(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const skill = getEnum(params, 'skill', STRATEGY_SKILLS);
  const band = getInt(params, 'band', 0, 9, -1);
  const query = getString(params, 'q') ?? '';
  const limit = getInt(params, 'limit', 1, 100, 20);
  const offset = getInt(params, 'offset', 0, 100, 0);

  const page = searchStrategies({
    limit,
    offset,
    ...(skill === undefined ? {} : { skill }),
    ...(band < 0 ? {} : { band }),
    query,
  });
  return {
    data: page.items,
    meta: {
      total: page.total,
      limit: page.limit,
      offset: page.offset,
      hasMore: page.hasMore,
      skill: skill ?? null,
      band: band >= 0 ? band : null,
      skills: STRATEGY_SKILLS,
      stats: strategyStats(),
    },
  };
}

/** One strategy card. */
function byId(context: RouteContext): HandlerResult {
  const strategy = findStrategy(context.params.id as string);
  if (strategy === undefined) {
    throw notFound(`No strategy with id "${context.params.id}".`, { id: String(context.params.id) });
  }
  return { data: strategy, meta: { id: strategy.id } };
}

/** Strategy routes. */
export const strategyRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/strategies',
    versioned: true,
    summary: 'Study-strategy cards per skill and band, each with an honest evidence label.',
    handler: search,
  },
  {
    method: 'GET',
    path: '/v1/strategies/:id',
    versioned: true,
    summary: 'Look up a single strategy card.',
    handler: byId,
  },
];
