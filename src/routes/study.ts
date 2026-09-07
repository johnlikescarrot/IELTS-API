/**
 * Study-planning route (`/v1/study/plan`).
 *
 * Validates the planning inputs — target band, optional component scores, the
 * time budget and the vocabulary workload — and delegates to the deterministic
 * planner in `lib/study.ts`.
 */

import { MISTAKE_TYPES } from '../data/mistakes.js';
import { assertBand, SKILLS } from '../lib/band.js';
import { badRequest } from '../lib/errors.js';
import { getEnum, getInt, getIsoDate, getNumber, getString, requireString, toParams } from '../lib/query.js';
import { round2 } from '../lib/textstats.js';
import { buildSrsSchedule } from '../lib/srs.js';
import { buildStudyPlan } from '../lib/study.js';

import type { QueryParams, Skill } from '../types.js';
import type { HandlerResult, RouteContext, RouteDefinition } from '../lib/route.js';

/** Lowest target band a plan accepts; below 4.0 there is nothing to schedule. */
export const MIN_TARGET = 4;

/** Default anchor clock time: the reference trainer's own review time. */
export const DEFAULT_REVIEW_TIME = '20:00';

/** Accepted spellings of a reported recall. */
const RECALL_VALUES = ['true', 'false', '1', '0'] as const;

/** Mistake-type identifiers accepted by `/v1/study/mistakes`. */
const MISTAKE_IDS = ['spelling', 'recognition', 'pronunciation', 'usage', 'listening'] as const;

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

/** Read and validate the anchor clock time (`HH:MM`, 24-hour clock). */
function reviewTime(params: QueryParams): string {
  const raw = getString(params, 'time') ?? DEFAULT_REVIEW_TIME;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(raw)) {
    throw badRequest('Parameter "time" must be a 24-hour clock time (HH:MM).', {
      parameter: 'time',
      received: raw,
    });
  }
  return raw;
}

/** Read the reported recall, or `undefined` when the caller reports none. */
function reportedRecall(params: QueryParams): { correct: boolean; confidence: number } | undefined {
  const raw = getEnum(params, 'correct', RECALL_VALUES);
  if (raw === undefined) {
    return undefined;
  }
  return {
    correct: raw === 'true' || raw === '1',
    confidence: getInt(params, 'confidence', 1, 5, 3),
  };
}

/** Stateless Ebbinghaus review schedule for an explicit anchor. */
function srs(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const schedule = buildSrsSchedule({
    reviews: getInt(params, 'reviews', 0, 30, 0),
    mastery: getNumber(params, 'mastery', 0, 100) ?? 0,
    date: getIsoDate(params, 'from', new Date().toISOString().slice(0, 10)),
    time: reviewTime(params),
    steps: getInt(params, 'steps', 1, 12, 8),
    recall: reportedRecall(params),
  });
  return {
    data: schedule,
    meta: {
      method:
        'Ebbinghaus ladder of 5 min, 30 min, 12 h, 1, 2, 4, 7 and 15 days from an explicit UTC anchor; past the ladder the last interval extends by mastery. Correct recalls add confidence × 5, misses subtract confidence × 8.',
      elimination:
        'A word leaves review after three consecutive correct recalls at ladder steps 3-8; early-ladder recalls measure working memory, not retention.',
    },
  };
}

/** Self-review mistake taxonomy with correction protocols and drills. */
function mistakes(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const type = getEnum(params, 'type', MISTAKE_IDS);
  const selected = type === undefined ? MISTAKE_TYPES : MISTAKE_TYPES.filter((row) => row.id === type);
  return {
    data: [...selected],
    meta: {
      total: selected.length,
      type: type ?? null,
      elimination:
        'Log each miss under its type and re-test with the linked drills; a word leaves review after three consecutive correct recalls at Ebbinghaus steps 3-8 (see /v1/study/srs).',
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
    path: '/v1/study/srs',
    versioned: true,
    summary: 'Stateless Ebbinghaus review schedule with mastery projection.',
    handler: srs,
  },
  {
    method: 'GET',
    path: '/v1/study/mistakes',
    versioned: true,
    summary: 'Self-review mistake taxonomy with correction protocols and drills.',
    handler: mistakes,
  },
];
