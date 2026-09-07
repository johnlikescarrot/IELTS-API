/**
 * Study routes (`/v1/study`): the deterministic week-by-week planner and the
 * SM-2 spaced-repetition review scheduler.
 *
 * Both delegate to pure, deterministic libraries — `lib/study.ts` for the plan
 * and `lib/review.ts` for the review schedule — so identical requests always
 * produce identical responses.
 */

import { assertBand, SKILLS } from '../lib/band.js';
import { badRequest } from '../lib/errors.js';
import { getInt, getIsoDate, getNumber, getString, requireString, toParams } from '../lib/query.js';
import { buildReviewSchedule, DEFAULT_EASINESS, MIN_EASINESS } from '../lib/review.js';
import { round2 } from '../lib/textstats.js';
import { buildStudyPlan } from '../lib/study.js';

import type { RecallQuality, Skill } from '../types.js';
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

/** Read and validate the SM-2 response-quality grade, which is required. */
function recallQuality(params: ReturnType<typeof toParams>): RecallQuality {
  if (getString(params, 'quality') === undefined) {
    throw badRequest('Parameter "quality" is required.', { parameter: 'quality', range: '0-5' });
  }
  return getInt(params, 'quality', 0, 5, 0) as RecallQuality;
}

/** Today's date in UTC, used as the default reference date. */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Schedule the next review of a vocabulary item with the SM-2 algorithm. */
function review(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const schedule = buildReviewSchedule({
    quality: recallQuality(params),
    repetitions: getInt(params, 'repetitions', 0, 100000, 0),
    easiness: getNumber(params, 'easiness', MIN_EASINESS, 10) ?? DEFAULT_EASINESS,
    interval: getInt(params, 'interval', 0, 36500, 0),
    today: getIsoDate(params, 'today', todayIso()),
  });
  return {
    data: schedule,
    meta: {
      method:
        'SuperMemo SM-2: the next interval is 1 day, then 6, then the previous interval times the easiness factor; a grade below 3 resets the schedule.',
      defaults: `repetitions=0, interval=0, easiness=${DEFAULT_EASINESS}, today=today (UTC).`,
      reference: 'Wozniak, P. (1998). SuperMemo SM-2 algorithm.',
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
  {
    method: 'GET',
    path: '/v1/study/review',
    versioned: true,
    summary: 'SM-2 spaced-repetition schedule: next review date and projection from a recall grade.',
    handler: review,
  },
];
