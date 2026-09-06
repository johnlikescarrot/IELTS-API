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
import {
  SM2_DEFAULT_EASINESS,
  SM2_MAX_EASINESS,
  SM2_MAX_INTERVAL,
  SM2_MAX_QUALITY,
  SM2_MAX_REPETITIONS,
  SM2_MIN_EASINESS,
  SM2_PASS_QUALITY,
  sm2Chain,
} from '../lib/spacedRepetition.js';
import { round2 } from '../lib/textstats.js';
import { buildStudyPlan } from '../lib/study.js';

import type { SpacedRepetitionState } from '../lib/spacedRepetition.js';
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

/** Parse a comma-separated trajectory of recall qualities. */
function parseQualities(raw: string): number[] {
  return raw.split(',').map((token) => {
    const trimmed = token.trim();
    if (!/^[0-5]$/.test(trimmed)) {
      throw badRequest('Each "qualities" entry must be a single quality from 0 to 5.', {
        parameter: 'qualities',
        received: trimmed,
      });
    }
    return Number.parseInt(trimmed, 10);
  });
}

/** Advance a spaced-repetition schedule by one review or a graded trajectory. */
function review(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const start: SpacedRepetitionState = {
    repetitions: getInt(params, 'repetitions', 0, SM2_MAX_REPETITIONS, 0),
    easiness: getNumber(params, 'easiness', SM2_MIN_EASINESS, SM2_MAX_EASINESS) ?? SM2_DEFAULT_EASINESS,
    intervalDays: getInt(params, 'interval', 0, SM2_MAX_INTERVAL, 0),
  };
  const quality = getInt(params, 'quality', 0, SM2_MAX_QUALITY, -1);
  const raw = getString(params, 'qualities');
  if (quality >= 0 && raw !== undefined) {
    throw badRequest('Pass either "quality" or "qualities", not both.', {
      parameter: 'quality,qualities',
    });
  }
  if (quality < 0 && raw === undefined) {
    throw badRequest('Pass either "quality" for one review or "qualities" for a trajectory.', {
      parameter: 'quality,qualities',
    });
  }
  const qualities = raw === undefined ? [quality] : parseQualities(raw);
  return {
    data: { start, steps: sm2Chain(start, qualities) },
    meta: {
      mode: raw === undefined ? 'single' : 'chain',
      algorithm:
        'SuperMemo SM-2: intervals of 1 and 6 days for the first two passes, then interval × easiness; lapses restart at one day.',
      qualityScale: `Recall quality 0-${SM2_MAX_QUALITY}; grades below ${SM2_PASS_QUALITY} lapse.`,
      easinessFloor: SM2_MIN_EASINESS,
      leitner: 'The approximate Leitner box runs 1-5 and resets to 1 on a lapse.',
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
    summary: 'Advance a spaced-repetition schedule with the SM-2 algorithm.',
    handler: review,
  },
];
