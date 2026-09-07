/**
 * Study-planning route (`/v1/study/plan`).
 *
 * Validates the planning inputs — target band, optional component scores, the
 * time budget and the vocabulary workload — and delegates to the deterministic
 * planner in `lib/study.ts`.
 */

import { assertBand, SKILLS } from '../lib/band.js';
import { badRequest } from '../lib/errors.js';
import {
  getEnum,
  getInt,
  getIsoDate,
  getNumber,
  getString,
  parseVolumeList,
  requireString,
  toParams,
} from '../lib/query.js';
import { parseList } from '../lib/search.js';
import { round2 } from '../lib/textstats.js';
import { buildStudyPlan } from '../lib/study.js';
import { PARTS_OF_SPEECH, allEntries } from '../data/vocabulary.js';
import {
  DEFAULT_REVIEW_DAYS,
  DEFAULT_STABILITY_DAYS,
  DEFAULT_STABILITY_GROWTH,
  buildReviewSchedule,
  retentionResult,
} from '../lib/review.js';
import { OPTIONS_PER_ITEM, buildQuiz } from '../lib/quiz.js';

import type { PartOfSpeech, ReviewOrder, Skill, VocabularyEntry } from '../types.js';
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

/** Review orderings accepted by the review planner. */
const REVIEW_ORDERS = ['list', 'length', 'recurrence'] as const;

/** Longest spacing ladder accepted by the review planner. */
const MAX_REVIEW_DAYS = 12;

/** The parameter name used for the spacing ladder. */
const REVIEW_DAYS_KEY = 'reviewDays';

/**
 * Parse the spacing ladder: a strictly increasing comma-separated list of
 * whole days between 1 and 365.
 */
function parseReviewDays(raw: string | undefined): number[] {
  if (raw === undefined) {
    return [...DEFAULT_REVIEW_DAYS];
  }
  const tokens = parseList(raw, REVIEW_DAYS_KEY) ?? [];
  if (tokens.length === 0) {
    throw badRequest(`Parameter "${REVIEW_DAYS_KEY}" must list at least one day.`, {
      parameter: REVIEW_DAYS_KEY,
      received: raw,
    });
  }
  const days: number[] = [];
  let previous = 0;
  for (const token of tokens) {
    if (days.length >= MAX_REVIEW_DAYS) {
      throw badRequest(`Parameter "${REVIEW_DAYS_KEY}" must list at most ${MAX_REVIEW_DAYS} days.`, {
        parameter: REVIEW_DAYS_KEY,
        received: token,
      });
    }
    if (!/^\d{1,3}$/.test(token)) {
      throw badRequest(`Parameter "${REVIEW_DAYS_KEY}" must list integers.`, {
        parameter: REVIEW_DAYS_KEY,
        received: token,
      });
    }
    const day = Number.parseInt(token, 10);
    if (day < 1 || day > 365) {
      throw badRequest(`Parameter "${REVIEW_DAYS_KEY}" must list days between 1 and 365.`, {
        parameter: REVIEW_DAYS_KEY,
        received: token,
      });
    }
    if (day <= previous) {
      throw badRequest(`Parameter "${REVIEW_DAYS_KEY}" must be strictly increasing.`, {
        parameter: REVIEW_DAYS_KEY,
        received: token,
      });
    }
    previous = day;
    days.push(day);
  }
  return days;
}

/** Entries matching the shared volume and part-of-speech filters. */
function scopeEntries(volumes: number[] | undefined, pos: PartOfSpeech[] | undefined): VocabularyEntry[] {
  return allEntries().filter((entry) => {
    if (
      volumes !== undefined &&
      volumes.length > 0 &&
      !entry.volumes.some((volume) => volumes.includes(volume))
    ) {
      return false;
    }
    if (pos !== undefined && pos.length > 0 && !pos.includes(entry.partOfSpeech)) {
      return false;
    }
    return true;
  });
}

/**
 * Read the volume and part-of-speech filters shared by the review and quiz
 * endpoints.
 */
function scopeFilters(params: ReturnType<typeof toParams>): {
  volumes: number[] | undefined;
  pos: PartOfSpeech[] | undefined;
} {
  const volumes = parseVolumeList(getString(params, 'volume'));
  const posTokens = parseList(getString(params, 'pos'), 'pos', PARTS_OF_SPEECH);
  return { volumes, pos: posTokens as PartOfSpeech[] | undefined };
}

/** The forgetting-curve model calculator. */
function retention(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const days = getInt(params, 'days', 0, 3650, 1);
  const stability = getNumber(params, 'stability', 0.05, 365) ?? DEFAULT_STABILITY_DAYS;
  const target = getNumber(params, 'target', 0.05, 0.999);
  return {
    data: retentionResult(days, stability, target),
    meta: {
      method:
        'Single-exponential forgetting curve R = exp(-days / stabilityDays). The default stability of one day puts the 24-hour prediction (e^(-1) \u2248 0.37) near Ebbinghaus\u2019s one-day savings value (\u2248 0.34); stability is a free parameter to fit to real retention data, not a measurement.',
      ebbinghausSavings:
        'Ebbinghaus (1885), replicated by Murre and Dros (2015): savings \u2248 0.58 at 20 minutes, 0.44 at 1 hour, 0.34 at 1 day, 0.25 at 6 days, 0.21 at 31 days. Savings is relearning effort spared, not recognition.',
    },
  };
}

/** The deterministic review calendar. */
function review(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const date = getIsoDate(params, 'date', new Date().toISOString().slice(0, 10));
  const windowDays = getInt(params, 'days', 1, 90, 7);
  const newPerDay = getInt(params, 'newPerDay', 1, 50, 10);
  const order: ReviewOrder = getEnum(params, 'order', REVIEW_ORDERS) ?? 'list';
  const { volumes, pos } = scopeFilters(params);
  const reviewDays = parseReviewDays(getString(params, REVIEW_DAYS_KEY));
  const stability = getNumber(params, 'stability', 0.05, 365) ?? DEFAULT_STABILITY_DAYS;
  const growth = getNumber(params, 'growth', 1, 5) ?? DEFAULT_STABILITY_GROWTH;

  const schedule = buildReviewSchedule({
    startDate: date,
    windowDays,
    newPerDay,
    entries: scopeEntries(volumes, pos),
    reviewDays,
    stabilityDays: stability,
    stabilityGrowth: growth,
    order,
  });

  const scopeNotes: string[] = [];
  if (schedule.scope.headwords === 0) {
    scopeNotes.push('No vocabulary entries match the volume and part-of-speech filters.');
  } else if (schedule.scope.headwords < newPerDay) {
    scopeNotes.push(
      'The filtered scope is smaller than newPerDay, so the whole scope is scheduled on every day.',
    );
  }

  return {
    data: schedule,
    meta: {
      method:
        'Words are scheduled in scope order with a deterministic daily slice, cycling after one pass; every word is reviewed reviewDays days after first study. Retention at each review is the model prediction R = exp(-gap / (stabilityDays \u00b7 growth^completedReviews)); the model assumes every earlier review succeeded, because a stateless API cannot know otherwise. Days are UTC.',
      order,
      volume: volumes ?? null,
      pos: pos ?? null,
      ...(scopeNotes.length > 0 ? { notes: scopeNotes } : {}),
    },
  };
}

/** The deterministic definition-recognition practice set. */
function quiz(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const date = getIsoDate(params, 'date', new Date().toISOString().slice(0, 10));
  const count = getInt(params, 'count', 1, 20, 5);
  const { volumes, pos } = scopeFilters(params);
  const scope = scopeEntries(volumes, pos);
  const set = buildQuiz({ date, count, entries: scope });
  const scopeNotes: string[] = [];
  if (set.scope.headwords === 0) {
    scopeNotes.push('No vocabulary entries match the volume and part-of-speech filters.');
  } else if (set.items.length < count) {
    const itemCount = set.items.length;
    scopeNotes.push(
      `The filtered scope (${set.scope.headwords} headwords) is smaller than count, so ${itemCount} item${
        itemCount === 1 ? ' was' : 's were'
      } generated.`,
    );
  }
  return {
    data: set,
    meta: {
      method:
        'Items, distractor choices and answer positions are seeded by date and scope: identical requests return byte-identical sets. Definitions and distractors come from the CC BY vocabulary dataset; the answer index is public because this is a study aid, not an assessment. Options are truncated at 200 characters so long glosses cannot leak the answer.',
      volume: volumes ?? null,
      pos: pos ?? null,
      optionsPerItem: OPTIONS_PER_ITEM,
      ...(scopeNotes.length > 0 ? { notes: scopeNotes } : {}),
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
    path: '/v1/study/retention',
    versioned: true,
    summary: 'Forgetting-curve calculator: predicted retention and review timing.',
    handler: retention,
  },
  {
    method: 'GET',
    path: '/v1/study/review',
    versioned: true,
    summary: 'Deterministic daily vocabulary review calendar over the headword list.',
    handler: review,
  },
  {
    method: 'GET',
    path: '/v1/study/quiz',
    versioned: true,
    summary: 'Deterministic definition-recognition practice items with answer key.',
    handler: quiz,
  },
];
