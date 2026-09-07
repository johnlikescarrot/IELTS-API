/**
 * Study-planning routes (`/v1/study/plan`, `/v1/study/srs`).
 *
 * Validates the planning inputs — target band, optional component scores, the
 * time budget and the vocabulary workload — and delegates to the deterministic
 * planner in `lib/study.ts`. The `/v1/study/srs` family exposes the stateless
 * Ebbinghaus scheduler in `lib/srs.ts`, derived from the published
 * `Iamdacai/ielts-vocab-system` algorithm and its 2026-03-22 day-granular
 * revision.
 */

import { assertBand, SKILLS } from '../lib/band.js';
import { badRequest } from '../lib/errors.js';
import {
  getBoolean,
  getEnum,
  getInt,
  getIsoDate,
  getNumber,
  getString,
  requireString,
  toParams,
} from '../lib/query.js';
import {
  CLASSIC_INTERVAL_MINUTES,
  LADDER_STAGES,
  MASTERY_GAIN_PER_CONFIDENCE,
  MASTERY_LOSS_PER_CONFIDENCE,
  MASTERED_AT_MASTERY,
  MAX_MASTERY,
  REVIEW_WINDOW_HOURS,
  WHEEL_INTERVAL_DAYS,
  ladderDueDays,
  nextReview,
  progressStatus,
  projectSchedule,
  reviewWindow,
  updateMastery,
} from '../lib/srs.js';
import { round2 } from '../lib/textstats.js';
import { buildStudyPlan } from '../lib/study.js';
import { wordbookStats } from '../data/wordbook.js';

import type { Skill } from '../types.js';
import type { SrsLadderId } from '../lib/srs.js';
import type { HandlerResult, RouteContext, RouteDefinition } from '../lib/route.js';

/** Lowest target band a plan accepts; below 4.0 there is nothing to schedule. */
export const MIN_TARGET = 4;

/** Ladder identifiers accepted by the SRS endpoints. */
const SRS_LADDERS = ['classic', 'wheel'] as const;

/** Pattern for an `HH:MM` review time. */
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

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

/** Read a 0-100 mastery score. */
function readMastery(params: ReturnType<typeof toParams>, key: string, fallback: number): number {
  const raw = getString(params, key);
  if (raw === undefined) {
    return fallback;
  }
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value) || value < 0 || value > MAX_MASTERY) {
    throw badRequest(`Parameter "${key}" must be a mastery score between 0 and ${MAX_MASTERY}.`, {
      parameter: key,
      received: raw,
    });
  }
  return value;
}

/** Today's UTC calendar date, `YYYY-MM-DD`. */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Epoch milliseconds of the UTC midnight of the request's `date` (default: today). */
function anchorMs(params: ReturnType<typeof toParams>): number {
  const date = getIsoDate(params, 'date', todayIso());
  return Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)));
}

/** The scheduler the SRS endpoints implement: ladders, rules, provenance. */
function srsAlgorithm(): HandlerResult {
  return {
    data: {
      model:
        'Ebbinghaus spaced repetition: a word is reviewed after each rung of an interval ladder; a confidence-weighted mastery score (0-100) extends the interval once the ladder is exhausted.',
      ladders: {
        classic: {
          name: 'Classic published schedule (upstream backend, minutes)',
          intervalsMinutes: [...CLASSIC_INTERVAL_MINUTES],
          dueDays: ladderDueDays('classic'),
          note: 'Five minutes, thirty minutes, twelve hours, then one, two, four, seven and fifteen days after the previous review.',
        },
        wheel: {
          name: 'Day-granular revision (adopted upstream 2026-03-22)',
          intervalsDays: [...WHEEL_INTERVAL_DAYS],
          dueDays: ladderDueDays('wheel'),
          note: 'First review moved from the same day to the next; day offsets collapse every stage onto whole days. The eighth stage repeats monthly for mastered words.',
        },
      },
      rules: {
        masteredAtMastery: MASTERED_AT_MASTERY,
        masteryGainPerConfidence: MASTERY_GAIN_PER_CONFIDENCE,
        masteryLossPerConfidence: MASTERY_LOSS_PER_CONFIDENCE,
        reviewWindowHours: REVIEW_WINDOW_HOURS,
        ladderStages: LADDER_STAGES,
        masteryRange: [0, MAX_MASTERY],
        confidenceRange: [1, 5],
      },
      statusModel: {
        values: ['new', 'learning', 'mastered'],
        note:
          "Upstream also defines a 'forgotten' status in its schema, but no code path ever writes it; " +
          'the API does not pretend otherwise.',
      },
      provenance: {
        derivedFrom: 'https://github.com/Iamdacai/ielts-vocab-system',
        note:
          'Constants and rules reimplemented from the upstream public sources (backend/spaced-repetition-algorithm.js ' +
          'and REVIEW_STRATEGY_UPDATE.md); the API stores no learner state, so identical inputs always produce ' +
          'identical schedules.',
      },
    },
    meta: {
      endpoints: [
        '/v1/study/srs/next',
        '/v1/study/srs/grade',
        '/v1/study/srs/window',
        '/v1/study/srs/project',
      ],
    },
  };
}

/** When the next review of a word falls due. */
function srsNext(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const ladder = getEnum(params, 'ladder', SRS_LADDERS) ?? 'classic';
  const reviewCount = getInt(params, 'review', 0, 64, 0);
  const mastery = readMastery(params, 'mastery', 0);
  const result = nextReview(ladder, reviewCount, mastery, anchorMs(params));
  return { data: result, meta: { status: progressStatus(reviewCount, mastery) } };
}

/** Grade one review attempt: new mastery, status and next due time. */
function srsGrade(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const mastery = readMastery(params, 'mastery', 0);
  if (params['correct'] === undefined) {
    throw badRequest('Parameter "correct" is required.', { parameter: 'correct' });
  }
  const correct = getBoolean(params, 'correct', true);
  const confidence = getInt(params, 'confidence', 1, 5, 3);
  const ladder = getEnum(params, 'ladder', SRS_LADDERS) ?? 'classic';
  const reviewCount = getInt(params, 'review', 0, 64, 0);

  const masteryAfter = updateMastery(mastery, correct, confidence);
  const reviewCountAfter = reviewCount + 1;
  const next = nextReview(ladder, reviewCountAfter, masteryAfter, anchorMs(params));
  return {
    data: {
      masteryBefore: mastery,
      masteryAfter,
      change: round2(masteryAfter - mastery),
      correct,
      confidence,
      reviewCountBefore: reviewCount,
      reviewCountAfter,
      status: progressStatus(reviewCountAfter, masteryAfter),
      next,
    },
    meta: {
      note: 'Rules match the upstream scorer: confidence × 5 gained when correct, × 8 lost when wrong.',
    },
  };
}

/** The daily review window around a chosen time. */
function srsWindow(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const date = getIsoDate(params, 'date', todayIso());
  const time = getString(params, 'time') ?? '20:00';
  if (!TIME_PATTERN.test(time)) {
    throw badRequest('Parameter "time" must be a 24-hour HH:MM clock time.', {
      parameter: 'time',
      received: time,
    });
  }
  return {
    data: reviewWindow(date, time),
    meta: { windowHours: REVIEW_WINDOW_HOURS * 2 },
  };
}

/** Project a whole wordbook through the ladder and report the daily load. */
function srsProject(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const words = getInt(params, 'words', 1, 10000, wordbookStats().rows);
  const perDay = getInt(params, 'perDay', 1, 100, 20);
  const ladder: SrsLadderId = getEnum(params, 'ladder', SRS_LADDERS) ?? 'wheel';
  const horizon = getInt(params, 'horizon', 7, 180, 42);
  const start = getIsoDate(params, 'start', todayIso());
  return {
    data: projectSchedule({ words, perDay, ladder, start, horizon }),
    meta: {
      note: 'Sub-day ladder rungs collapse onto their due day; every review of a stage is counted once, so classic-ladder days carry the full stage load of earlier days.',
      defaults: 'words defaults to the size of the indexed community wordbook (/v1/wordbook).',
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
    summary: 'The spaced-repetition model the scheduler implements, with its published constants.',
    handler: srsAlgorithm,
  },
  {
    method: 'GET',
    path: '/v1/study/srs/next',
    versioned: true,
    summary:
      'Next-review time for a word at a given ladder stage and mastery (`ladder`, `review`, `mastery`, `date`).',
    handler: srsNext,
  },
  {
    method: 'GET',
    path: '/v1/study/srs/grade',
    versioned: true,
    summary:
      'Grade one review attempt: mastery update, status and the next due time (`mastery`, `correct`, `confidence`).',
    handler: srsGrade,
  },
  {
    method: 'GET',
    path: '/v1/study/srs/window',
    versioned: true,
    summary: 'The ±2-hour daily review window around a chosen time (`date`, `time`).',
    handler: srsWindow,
  },
  {
    method: 'GET',
    path: '/v1/study/srs/project',
    versioned: true,
    summary: 'Project a wordbook through the ladder: daily workload curve, peak day and completion date.',
    handler: srsProject,
  },
];
