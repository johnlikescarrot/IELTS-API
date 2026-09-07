/**
 * Retention and review-scheduling routes (`/v1/retention`).
 */

import {
  EBBINGHAUS_C,
  EBBINGHAUS_EQUATION,
  EBBINGHAUS_K,
  FORGETTING_OBSERVATIONS,
  FORGETTING_STUDIES,
  FORGETTING_STUDY_IDS,
  SCHEDULERS,
  SCHEDULER_IDS,
  SCHEDULER_VARIANTS,
  ebbinghausSavings,
  formatInterval,
  retentionStats,
  schedulerById,
  variantDisagreements,
} from '../data/retention.js';
import { badRequest } from '../lib/errors.js';
import { getEnum, getInt, getIsoDate, getNumber, toParams } from '../lib/query.js';
import { buildSchedule, gradeReview, projectSchedulers, projectWorkload } from '../lib/retention.js';
import { round2 } from '../lib/textstats.js';

import type { ScheduleOptions } from '../lib/retention.js';
import type { HandlerResult, RouteContext, RouteDefinition } from '../lib/route.js';
import type { QueryParams, SchedulerId } from '../types.js';

/** Default recall probability the half-life scheduler aims for. */
const DEFAULT_TARGET_RECALL = 0.9;

/** Default horizon shared by the calendar, the comparison and the workload. */
const DEFAULT_HORIZON_DAYS = 365;

/** The correction the family exists to publish, repeated wherever it is due. */
const ATTRIBUTION_CAVEAT =
  'Ebbinghaus (1885) measured savings on relearning at seven delays; he did not study repeated retrieval and published no review schedule. Interval ladders attributed to him are later inventions, and the API labels them folk-pedagogical rather than repeating the attribution.';

/** Read the schedule options every scheduling endpoint shares. */
function scheduleOptions(params: QueryParams, maxReviewCap: number): ScheduleOptions {
  return {
    start: `${getIsoDate(params, 'start', new Date().toISOString().slice(0, 10))}T00:00:00.000Z`,
    quality: getInt(params, 'quality', 0, 5, 5),
    horizonDays: getInt(params, 'horizonDays', 1, 3650, DEFAULT_HORIZON_DAYS),
    maxReviews: getInt(params, 'maxReviews', 1, maxReviewCap, maxReviewCap),
    targetRecall: getNumber(params, 'targetRecall', 0.5, 0.99) ?? DEFAULT_TARGET_RECALL,
  };
}

/** Read the required `scheduler` parameter. */
function requireScheduler(params: QueryParams): SchedulerId {
  const id = getEnum(params, 'scheduler', SCHEDULER_IDS);
  if (id === undefined) {
    throw badRequest('Parameter "scheduler" is required.', {
      parameter: 'scheduler',
      allowed: SCHEDULER_IDS.join(','),
    });
  }
  return id;
}

/** Family index. */
function index(): HandlerResult {
  const stats = retentionStats();
  return {
    data: {
      ...stats,
      studies: FORGETTING_STUDIES.map((study) => ({
        id: study.id,
        name: study.name,
        role: study.role,
      })),
      schedulers: SCHEDULERS.map((scheduler) => ({
        id: scheduler.id,
        name: scheduler.name,
        family: scheduler.family,
        provenance: scheduler.provenance,
        year: scheduler.year,
        claimsEbbinghaus: scheduler.claimsEbbinghaus,
      })),
      endpoints: [
        '/v1/retention/curve',
        '/v1/retention/schedulers',
        '/v1/retention/schedulers/:id',
        '/v1/retention/schedule',
        '/v1/retention/grade',
        '/v1/retention/compare',
        '/v1/retention/workload',
      ],
    },
    meta: {
      count: stats.schedulers,
      caveat: ATTRIBUTION_CAVEAT,
      stateless:
        'Every endpoint in this family is a pure function of its query string. Nothing is stored, nothing is authenticated, and identical requests return identical responses.',
    },
  };
}

/** The forgetting curve: the measurements, the fit and the residuals. */
function curve(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const at = getNumber(params, 'minutes', 1, 5_256_000);
  const studies = FORGETTING_STUDIES.map((study) => {
    const savings = FORGETTING_OBSERVATIONS.map((row) => row.savings[study.id]);
    const mean = savings.reduce((total, value) => total + value, 0) / savings.length;
    return {
      ...study,
      meanSavings: Math.round(mean * 1000) / 1000,
      terminalSavings: savings[savings.length - 1] as number,
    };
  });
  const residuals = FORGETTING_OBSERVATIONS.map((row) => Math.abs(row.residual));
  return {
    data: {
      equation: {
        formula: EBBINGHAUS_EQUATION,
        k: EBBINGHAUS_K,
        c: EBBINGHAUS_C,
        units: 'minutes, counted from one minute before the end of learning',
        domain: 'Clamped at one minute: the equation is undefined at t = 1 and diverges below it.',
      },
      studies,
      observations: FORGETTING_OBSERVATIONS,
      fitQuality: {
        maximumAbsoluteResidual: Math.round(Math.max(...residuals) * 1000) / 1000,
        meanAbsoluteResidual:
          Math.round((residuals.reduce((total, value) => total + value, 0) / residuals.length) * 1000) / 1000,
      },
      evaluated:
        at === undefined ? null : { minutes: at, savings: round2(ebbinghausSavings(at)), unit: 'percent' },
    },
    meta: {
      count: FORGETTING_OBSERVATIONS.length,
      studies: FORGETTING_STUDY_IDS.join(','),
      source: 'Murre and Dros (2015), table 3, https://doi.org/10.1371/journal.pone.0120644',
      measure:
        'Savings, not recall: the proportion of relearning effort spared by the earlier learning. A savings of 0.337 at one day does not mean a third of the syllables could be recalled.',
      caveat: ATTRIBUTION_CAVEAT,
      generalisability:
        'Every series is a single subject learning nonsense syllables. The shape replicates; the levels do not transfer to meaningful vocabulary, and none of these subjects was learning IELTS headwords.',
    },
  };
}

/** The scheduler catalogue, with the divergence between competing renderings. */
function schedulers(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const provenance = getEnum(params, 'provenance', [
    'published-algorithm',
    'published-schedule',
    'folk-pedagogical',
  ] as const);
  const rows = SCHEDULERS.filter(
    (scheduler) => provenance === undefined || scheduler.provenance === provenance,
  );
  const variants = SCHEDULER_VARIANTS.filter((variant) =>
    rows.some((scheduler) => scheduler.id === variant.scheduler),
  ).map((variant) => {
    const disagreements = variantDisagreements(variant);
    return {
      ...variant,
      ladderLabels: variant.ladder.map(formatInterval),
      disagreements,
      disagreeingReviews: disagreements.length,
    };
  });
  return {
    data: { schedulers: rows, variants },
    meta: {
      count: rows.length,
      variants: variants.length,
      caveat: ATTRIBUTION_CAVEAT,
      disagreementMethod:
        "Each variant rendering is compared with its scheduler's canonical ladder review by review over the length of the longer ladder; a review that only one rendering defines is reported with 0 for the other.",
    },
  };
}

/** One scheduler, with its ladder expanded into a readable table. */
function scheduler(context: RouteContext): HandlerResult {
  const found = schedulerById(context.params.id as string);
  const variants = SCHEDULER_VARIANTS.filter((variant) => variant.scheduler === found.id).map((variant) => ({
    ...variant,
    disagreements: variantDisagreements(variant),
  }));
  return {
    data: {
      ...found,
      ladderTable: found.ladder.map((seconds, position) => ({
        review: position + 1,
        seconds,
        days: Math.round((seconds / 86_400) * 10_000) / 10_000,
        label: found.ladderLabels[position] as string,
        exact: formatInterval(seconds),
      })),
      variants,
    },
    meta: {
      ladderLength: found.ladder.length,
      unbounded: found.ceilingSeconds === null,
      caveat: found.claimsEbbinghaus ? ATTRIBUTION_CAVEAT : found.note,
    },
  };
}

/** A dated review calendar for one scheduler. */
function schedule(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const found = schedulerById(requireScheduler(params));
  const options = scheduleOptions(params, 200);
  const built = buildSchedule(found, options);
  return {
    data: built,
    meta: {
      count: built.reviews.length,
      provenance: found.provenance,
      source: found.source,
      sourceUrl: found.sourceUrl,
      determinism:
        'Byte-identical for identical query strings: the calendar is folded from a seed state with no randomness and no stored progress.',
    },
  };
}

/** Grade a single review. */
function grade(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const found = schedulerById(requireScheduler(params));
  const quality = getInt(params, 'quality', 0, 5, -1);
  if (quality < 0) {
    throw badRequest('Parameter "quality" is required (0-5, SM-2 grading scale).', {
      parameter: 'quality',
    });
  }
  const result = gradeReview(found, {
    repetitions: getInt(params, 'repetitions', 0, 1000, 0),
    lapses: getInt(params, 'lapses', 0, 1000, 0),
    quality,
    previousIntervalSeconds: getInt(params, 'previousIntervalSeconds', 0, 315_360_000, 0),
    easeFactor: getNumber(params, 'easeFactor', 1.3, 5) ?? 2.5,
    targetRecall: getNumber(params, 'targetRecall', 0.5, 0.99) ?? DEFAULT_TARGET_RECALL,
  });
  return {
    data: result,
    meta: {
      scale:
        'quality uses the SM-2 0-5 grading scale, where 3 is the lowest passing grade. Schedulers with a different native scale are mapped onto it and the mapping is documented on the scheduler.',
      stateless:
        'The caller supplies the history and the API supplies the arithmetic. No progress is stored on either side, which is why this endpoint needs no account.',
      provenance: found.provenance,
      source: found.source,
    },
  };
}

/** Every scheduler over one shared horizon. */
function compare(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const options = scheduleOptions(params, 500);
  const rows = projectSchedulers(options);
  const reviews = rows.map((row) => row.reviews);
  const bounded = rows.filter((row) => !row.reachedHorizon);
  return {
    data: {
      horizonDays: options.horizonDays,
      quality: options.quality,
      targetRecall: options.targetRecall,
      projections: rows,
      spread: {
        fewestReviews: Math.min(...reviews),
        mostReviews: Math.max(...reviews),
        ratio: round2(Math.max(...reviews) / Math.max(1, Math.min(...reviews))),
        longestTerminalIntervalDays: Math.max(...rows.map((row) => row.terminalIntervalDays)),
        shortestTerminalIntervalDays: Math.min(...rows.map((row) => row.terminalIntervalDays)),
      },
    },
    meta: {
      count: rows.length,
      exhausted: bounded.length,
      method: `Every scheduler is rolled forward from a single learning event over ${options.horizonDays} days with every review graded ${options.quality} out of 5, then scored against one shared retention model so that the rows are comparable.`,
      model:
        'meanPredictedRecall is the shadow half-life model p = 2^(-lag/h) with h estimated from the review history. It is a model, not a measurement, and it flatters no scheduler in particular.',
      caveat: ATTRIBUTION_CAVEAT,
    },
  };
}

/** Daily review load implied by a steady intake of new words. */
function workload(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const found = schedulerById(requireScheduler(params));
  const base = scheduleOptions(params, 200);
  const projection = projectWorkload(found, {
    ...base,
    horizonDays: getInt(params, 'horizonDays', 7, 730, DEFAULT_HORIZON_DAYS),
    wordsPerDay: getInt(params, 'wordsPerDay', 1, 200, 20),
  });
  return {
    data: projection,
    meta: {
      count: projection.reviewsPerWord,
      provenance: found.provenance,
      warning:
        'The load is the intake convolved with the interval sequence, not the intake. A scheduler whose interval is capped cannot amortise a growing collection, and the steady state keeps rising for as long as new words are added.',
      dataset: 'Headword count from the Cambridge IELTS 1-22 vocabulary dataset (/v1/vocabulary/stats).',
    },
  };
}

/** Retention routes. */
export const retentionRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/retention',
    versioned: true,
    summary: 'Index of the forgetting-curve data and the review schedulers built on it.',
    handler: index,
  },
  {
    method: 'GET',
    path: '/v1/retention/curve',
    versioned: true,
    summary: 'The Ebbinghaus savings data, three replications, and the residuals of the 1885 fit.',
    handler: curve,
  },
  {
    method: 'GET',
    path: '/v1/retention/schedulers',
    versioned: true,
    summary: 'The review schedulers, their provenance and the divergence between renderings.',
    handler: schedulers,
  },
  {
    method: 'GET',
    path: '/v1/retention/schedule',
    versioned: true,
    summary: 'A deterministic, stateless review calendar for one scheduler.',
    handler: schedule,
  },
  {
    method: 'GET',
    path: '/v1/retention/grade',
    versioned: true,
    summary: 'Grade one review and return the interval and state it earns.',
    handler: grade,
  },
  {
    method: 'GET',
    path: '/v1/retention/compare',
    versioned: true,
    summary: 'Every scheduler rolled forward over one shared horizon and scored on one model.',
    handler: compare,
  },
  {
    method: 'GET',
    path: '/v1/retention/workload',
    versioned: true,
    summary: 'Daily review load implied by a steady intake of new headwords.',
    handler: workload,
  },
  {
    method: 'GET',
    path: '/v1/retention/schedulers/:id',
    versioned: true,
    summary: 'One scheduler, with its interval ladder expanded.',
    handler: scheduler,
  },
];
