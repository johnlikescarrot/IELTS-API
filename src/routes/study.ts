/**
 * Study-planning route (`/v1/study/plan`).
 *
 * Validates the planning inputs — target band, optional component scores, the
 * time budget and the vocabulary workload — and delegates to the deterministic
 * planner in `lib/study.ts`.
 */

import { assertBand, SKILLS } from '../lib/band.js';
import { badRequest } from '../lib/errors.js';
import { getInt, getNumber, getString, requireString, toParams } from '../lib/query.js';
import { round2 } from '../lib/textstats.js';
import { buildStudyPlan } from '../lib/study.js';

import type { Skill } from '../types.js';
import type { HandlerResult, RouteContext, RouteDefinition } from '../lib/route.js';

/** Lowest target band a plan accepts; below 4.0 there is nothing to schedule. */
export const MIN_TARGET = 4;

/** Read and validate one current component score, or `undefined` when absent. */
function component(params: ReturnType<typeof toParams>, skill: Skill): number | undefined {
  const raw = getString(params, skill);
  if (raw === undefined) {
    return undefined;
  }
  return assertBand(Number.parseFloat(raw), skill);
}

/** Build a week-by-week study plan towards a target band. */
function plan(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const target = assertBand(Number.parseFloat(requireString(params, 'target')), 'target');
  if (target < MIN_TARGET) {
    throw badRequest(`Parameter "target" must be at least ${MIN_TARGET}.`, {
      parameter: 'target',
      received: String(target),
      min: String(MIN_TARGET),
    });
  }

  const provided: Skill[] = [];
  const components = {} as Record<Skill, number>;
  for (const skill of SKILLS) {
    const value = component(params, skill);
    if (value === undefined) {
      components[skill] = Math.max(0, round2(target - 1.5));
    } else {
      components[skill] = value;
      provided.push(skill);
    }
  }

  const studyPlan = buildStudyPlan({
    target,
    components,
    provided,
    weeks: getInt(params, 'weeks', 1, 52, 8),
    hoursPerWeek: getNumber(params, 'hoursPerWeek', 1, 80) ?? 10,
    wordsPerDay: getInt(params, 'wordsPerDay', 1, 50, 10),
  });
  return {
    data: studyPlan,
    meta: {
      method:
        'Gaps are weighted into weekly hours, weeks are split into foundation, practice and polish phases, and every activity links to the dataset endpoints that publish it.',
      defaults: 'Components without a query value default to target − 1.5 bands.',
    },
  };
}

/** Study-planning routes. */
export const studyRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/study/plan',
    versioned: true,
    summary: 'Deterministic week-by-week study plan towards a target band.',
    handler: plan,
  },
];
