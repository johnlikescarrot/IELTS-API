/**
 * Spaced-repetition routes (`/v1/srs`).
 *
 * Deterministic, no-auth calculators that expose the three rehearsal models
 * (Ebbinghaus, Leitner, SM-2) plus streak and calendar helpers. All results
 * are pure functions of the query parameters so the endpoints are reproducible
 * fixtures for research rather than per-user storage.
 */

import {
  EBBINGHAUS_INTERVALS_MINUTES,
  LEITNER_INTERVALS_DAYS,
  SM2_DEFAULT_EASE,
  SM2_MIN_EASE,
  buildSrsSchedule,
  calendarLevel,
  computeStreak,
  demoCalendar,
  forgettingRetention,
  isIsoDate,
  mistakePriority,
  retentionHalfLife,
} from '../lib/srs.js';
import { badRequest } from '../lib/errors.js';
import { getEnum, getInt, getNumber, getString, toParams } from '../lib/query.js';

import type { RouteContext, HandlerResult, RouteDefinition } from '../lib/route.js';
import type { SM2Quality } from '../lib/srs.js';
import type { JsonValue } from '../types.js';

const METHODS = ['ebbinghaus', 'leitner', 'sm2'] as const;

/**
 * Overview of the rehearsal models.
 */
function overview(): HandlerResult {
  return {
    data: {
      models: [
        {
          id: 'ebbinghaus',
          name: 'Ebbinghaus expanding intervals',
          intervalsMinutes: [...EBBINGHAUS_INTERVALS_MINUTES],
          provenance:
            'Ebbinghaus (1885) forgetting curve; intervals as implemented in the reference ielts-vocab-system.',
          description: 'Fixed ladder 5 min → 15 days; final rung stretched by 1 + mastery/100.',
        },
        {
          id: 'leitner',
          name: 'Leitner boxes',
          intervalsDays: [...LEITNER_INTERVALS_DAYS],
          provenance: 'Leitner (1972) So lernt man lernen.',
          description: 'Five boxes; correct promotes one box, incorrect returns to box 1.',
        },
        {
          id: 'sm2',
          name: 'SM-2 (Wozniak)',
          defaultEase: SM2_DEFAULT_EASE,
          minEase: SM2_MIN_EASE,
          provenance: 'Wozniak (1990) Optimization of learning; used by Anki.',
          description: 'Per-card easeFactor, interval and repetitions; quality q∈[0,5] with EF update.',
        },
      ],
      calendarLevels: {
        thresholdsMinutes: [0, 15, 30, 60],
        mapping: '0 = 0 min, 1 = 1-15, 2 = 15-30, 3 = 30-60, 4 = 60+ (mirrors the reference system).',
      },
      references: [
        'Ebbinghaus, H. (1885). Über das Gedächtnis.',
        'Leitner, S. (1972). So lernt man lernen.',
        'Wozniak, P. A. (1990). Optimization of learning.',
        'Cepeda, N. J. et al. (2008). Spacing effects in learning. Review of General Psychology, 12(4).',
      ],
    } as unknown as JsonValue,
    meta: {
      provenance:
        'Rehearsal intervals and formulas are published in /v1/srs; use /v1/srs/schedule to compare models on the same inputs.',
    },
  };
}

/**
 * Parse a CSV list of ISO dates from a query param.
 *
 * @param raw - Raw query value.
 * @param key - Parameter name for error reporting.
 */
function parseIsoDateList(raw: string | undefined, key: string): string[] | undefined {
  if (raw === undefined) {
    return undefined;
  }
  const parts = raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  for (const part of parts) {
    if (!isIsoDate(part)) {
      throw badRequest(`Parameter "${key}" must be comma-separated ISO dates (YYYY-MM-DD).`, {
        parameter: key,
        received: part,
      });
    }
  }
  return parts;
}

/**
 * Compare the three models on one review step.
 */
function schedule(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const reviewCount = getInt(params, 'reviewCount', 0, 100, 0);
  const mastery = getNumber(params, 'mastery', 0, 100) ?? 50;
  const qualityRaw = getInt(params, 'quality', 0, 5, 4);
  const quality = qualityRaw as SM2Quality;
  const interval = getNumber(params, 'interval', 1, 365) ?? 1;
  const repetitions = getInt(params, 'repetitions', 0, 100, 0);
  const easeFactor = getNumber(params, 'easeFactor', SM2_MIN_EASE, 5) ?? SM2_DEFAULT_EASE;
  const leitnerBox = getInt(params, 'leitnerBox', 1, 5, 1);
  const leitnerCorrect = getString(params, 'leitnerCorrect') ?? 'true';
  const correct = ['1', 'true', 'yes', 'on'].includes(leitnerCorrect.toLowerCase());
  const methodFilter = getEnum(params, 'method', METHODS);

  const nowParam = getString(params, 'now');
  let now: Date;
  if (nowParam !== undefined) {
    const asDate = new Date(nowParam);
    if (Number.isNaN(asDate.getTime())) {
      throw badRequest('Parameter "now" must be an ISO timestamp.', { parameter: 'now', received: nowParam });
    }
    now = asDate;
  } else {
    now = new Date();
  }

  const scheduleResult = buildSrsSchedule({
    reviewCount,
    masteryScore: mastery,
    sm2Card: { interval, repetitions, easeFactor },
    quality,
    leitnerBox,
    leitnerCorrect: correct,
    now,
  });

  const data: Record<string, unknown> = {
    inputs: {
      reviewCount,
      mastery,
      quality,
      interval,
      repetitions,
      easeFactor,
      leitnerBox,
      leitnerCorrect: correct,
      now: now.toISOString(),
    },
    intervals: {
      ebbinghausMinutes: [...EBBINGHAUS_INTERVALS_MINUTES],
      leitnerDays: [...LEITNER_INTERVALS_DAYS],
    },
    ...scheduleResult,
  };

  if (methodFilter !== undefined) {
    const filtered: Record<string, unknown> = { inputs: data.inputs, intervals: data.intervals };
    if (methodFilter === 'ebbinghaus') {
      filtered.ebbinghaus = scheduleResult.ebbinghaus;
    } else if (methodFilter === 'leitner') {
      filtered.leitner = scheduleResult.leitner;
    } else {
      filtered.sm2 = scheduleResult.sm2;
    }
    filtered.retention = scheduleResult.retention;
    return { data: filtered as unknown as JsonValue };
  }

  return { data: data as unknown as JsonValue };
}

/**
 * Compute streaks from a comma-separated list of ISO dates.
 */
function streak(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const rawDates = getString(params, 'dates');
  const dates = parseIsoDateList(rawDates, 'dates') ?? [];
  const result = computeStreak(dates);
  return {
    data: result as unknown as JsonValue,
    meta: { received: dates.length, unique: result.totalDays },
  };
}

/**
 * Deterministic demo calendar heat-map.
 */
function calendar(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const seed = getString(params, 'seed') ?? 'ielts-api';
  const days = getInt(params, 'days', 1, 365, 30);
  const endDate = getString(params, 'endDate');
  if (endDate !== undefined && !isIsoDate(endDate)) {
    throw badRequest('Parameter "endDate" must be an ISO date (YYYY-MM-DD).', {
      parameter: 'endDate',
      received: endDate,
    });
  }
  const effectiveEnd = endDate ?? new Date().toISOString().slice(0, 10);
  const data = demoCalendar(seed, days, effectiveEnd);
  return {
    data: data as unknown as JsonValue,
    meta: { seed, days, endDate: effectiveEnd, levels: '0 = 0 min, 1 = 1-15, 2 = 15-30, 3 = 30-60, 4 = 60+' },
  };
}

/**
 * Level lookup and retention helpers.
 */
function helpers(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const minutes = getNumber(params, 'minutes', 0, 1440);
  const elapsed = getNumber(params, 'elapsedDays', 0, 3650);
  const stability = getNumber(params, 'stabilityDays', 0.1, 3650);
  const errors = getNumber(params, 'errors', 1, 100);
  const daysSince = getNumber(params, 'daysSince', 0, 3650);
  const mastery = getNumber(params, 'mastery', 0, 100);

  const result: Record<string, unknown> = {};
  if (minutes !== undefined) {
    result.calendarLevel = { minutes, level: calendarLevel(minutes) };
  }
  if (elapsed !== undefined && stability !== undefined) {
    result.retention = {
      elapsedDays: elapsed,
      stabilityDays: stability,
      retention: forgettingRetention(elapsed, stability),
    };
  }
  if (stability !== undefined && elapsed === undefined) {
    result.halfLife = { stabilityDays: stability, halfLifeDays: retentionHalfLife(stability) };
  }
  if (errors !== undefined && daysSince !== undefined && mastery !== undefined) {
    result.mistakePriority = {
      errors,
      daysSince,
      mastery,
      priority: mistakePriority(errors, daysSince, mastery),
    };
  }
  if (Object.keys(result).length === 0) {
    throw badRequest(
      'Provide at least one of: minutes, elapsedDays+stabilityDays, stabilityDays, or errors+daysSince+mastery.',
      {
        parameter: 'query',
      },
    );
  }
  return { data: result as unknown as JsonValue };
}

/** SRS routes. */
export const srsRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/srs',
    versioned: true,
    summary: 'Spaced-repetition models: Ebbinghaus, Leitner and SM-2 with intervals and provenance.',
    handler: overview,
  },
  {
    method: 'GET',
    path: '/v1/srs/schedule',
    versioned: true,
    summary: 'Compare the three rehearsal models on one review step.',
    handler: schedule,
  },
  {
    method: 'GET',
    path: '/v1/srs/streak',
    versioned: true,
    summary: 'Streak arithmetic from a comma-separated list of ISO dates.',
    handler: streak,
  },
  {
    method: 'GET',
    path: '/v1/srs/calendar',
    versioned: true,
    summary: 'Deterministic demo calendar heat-map (seed → levels) for research figures.',
    handler: calendar,
  },
  {
    method: 'GET',
    path: '/v1/srs/helpers',
    versioned: true,
    summary: 'Calendar level, retention curve and mistake-priority helpers.',
    handler: helpers,
  },
];
