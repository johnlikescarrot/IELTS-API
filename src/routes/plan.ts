/**
 * Study-plan route (`/v1/study-plan`).
 */

import { SKILLS, assertBand } from '../lib/band.js';
import { buildStudyPlan } from '../lib/plan.js';
import { getInt, getNumber, getString, toParams } from '../lib/query.js';
import { parseList } from '../lib/search.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';

/** Generate a weekly plan between two band scores. */
function plan(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const current = assertBand(getNumber(params, 'current', 0, 9), 'current');
  const target = assertBand(getNumber(params, 'target', 0, 9), 'target');
  const weeks = getInt(params, 'weeks', 1, 24, 8);
  const hoursPerWeek = getInt(params, 'hours', 1, 40, 10);
  const focus = parseList(getString(params, 'focus'), 'focus', SKILLS);

  const result = buildStudyPlan({
    current,
    target,
    weeks,
    hoursPerWeek,
    ...(focus === undefined ? {} : { focus }),
  });
  return {
    data: result,
    meta: {
      method: 'transparent band-gap heuristic (see RESEARCH.md §7); not official IELTS advice',
      parameters:
        'current, target required (0-9, 0.5 steps); weeks 1-24; hours 1-40; focus comma-separated skills',
    },
  };
}

/** Study-plan routes. */
export const planRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/study-plan',
    versioned: true,
    summary: 'Deterministic weekly study plan between two band scores, referencing real dataset items.',
    handler: plan,
  },
];
