/**
 * Retention routes (`/v1/retention`).
 *
 * The spaced-repetition layer: the schedules deployed IELTS vocabulary
 * applications actually run, the forgetting curve they all cite, the workload
 * they generate, and the word lists they are pointed at.
 */

import {
  DEFAULT_REVIEW_HORIZON,
  DEFAULT_STABILITY_GROWTH,
  EBBINGHAUS_CURVE,
  MASTERY_RULE,
  MINUTES_PER_DAY,
  OPTIMAL_SPACING_RATIO,
  REVIEW_SCHEDULES,
  SCHEDULE_FAMILIES,
  SCHEDULE_IDS,
  SCHEDULE_PROVENANCES,
  requireLibrary,
  requireSchedule,
  reviewSchedule,
  round4,
  vocabularyLibraries,
} from '../data/retention.js';
import { badRequest } from '../lib/errors.js';
import { getEnum, getInt, getIsoDate, getNumber, getString, requireString, toParams } from '../lib/query.js';
import {
  addDays,
  coverLibrary,
  compareSchedules,
  curveFit,
  ebbinghausRetention,
  masteryTrace,
  retentionProfile,
  reviewCalendar,
  round2,
  scheduleStages,
  simulateWorkload,
  studyDaysWithin,
} from '../lib/retention.js';

import type { QueryParams } from '../types.js';
import type { HandlerResult, RouteContext, RouteDefinition } from '../lib/route.js';
import type { ReviewSchedule } from '../types.js';

/** Largest number of reviews any endpoint will expand a schedule to. */
export const MAX_REVIEWS = 24;

/** Largest number of answers the mastery tracer will replay. */
export const MAX_ANSWERS = 100;

/** Modelling knobs shared by every endpoint that scores a schedule. */
interface ModelParams {
  /** Reviews to expand the schedule to. */
  reviews: number;
  /** Stability multiplier per successful review. */
  growth: number;
  /** Mastery score used by mastery-scaled terminals. */
  mastery: number;
}

/** Read the shared modelling knobs. */
function modelParams(params: QueryParams): ModelParams {
  return {
    reviews: getInt(params, 'reviews', 1, MAX_REVIEWS, DEFAULT_REVIEW_HORIZON),
    growth: getNumber(params, 'growth', 1, 10) ?? DEFAULT_STABILITY_GROWTH,
    mastery: getInt(params, 'mastery', 0, 100, 100),
  };
}

/** The assumptions every scored response has to carry. */
function modelMeta(model: ModelParams): Record<string, string | number> {
  return {
    reviews: model.reviews,
    growth: model.growth,
    mastery: model.mastery,
    curve: EBBINGHAUS_CURVE.formula,
    curveSource: EBBINGHAUS_CURVE.sourceUrl,
    assumption: `Retention is evaluated on the gap since the previous review, divided by a consolidation factor of growth^n after n successful reviews. growth=${model.growth} is an assumption of this API, not a finding of Ebbinghaus; set "growth" to test how sensitive a conclusion is to it, and "growth=1" to remove the assumption entirely.`,
    reproducibility:
      'Deterministic: identical query strings return byte-identical bodies, and no wall-clock time is read unless a date parameter is omitted.',
  };
}

/** A schedule with the numbers a reader needs to compare it with the others. */
type ScheduleSummary = ReviewSchedule & {
  /** Reviews the source itself publishes an interval for. */
  publishedReviews: number;
  /** Calendar day of the last published review. */
  publishedHorizonDays: number;
  /** Published reviews falling on the learning day. */
  sameDayReviews: number;
  /** Gap before the first review, in minutes. */
  firstReviewMinutes: number;
  /** Calendar day of each review over the requested horizon. */
  reviewDays: number[];
  /** Predicted-retention summary over the requested horizon. */
  retention: {
    floor: number;
    mean: number;
    ceiling: number;
    coefficientOfVariation: number;
    uniformity: number;
  };
};

/** A schedule with the numbers a reader needs to compare it with the others. */
function summarise(schedule: ReviewSchedule, model: ModelParams): ScheduleSummary {
  const stages = scheduleStages(schedule, model.reviews, model.mastery);
  const profile = retentionProfile(schedule, model.reviews, model.growth, model.mastery);
  const published = scheduleStages(schedule, schedule.intervalsMinutes.length, model.mastery);
  const last = published.at(-1);
  return {
    ...schedule,
    publishedReviews: schedule.intervalsMinutes.length,
    publishedHorizonDays: (last as (typeof published)[number]).calendarDay,
    sameDayReviews: published.filter((stage) => stage.sameDay).length,
    firstReviewMinutes: schedule.intervalsMinutes[0] as number,
    reviewDays: stages.map((stage) => stage.calendarDay),
    retention: {
      floor: profile.floor,
      mean: profile.mean,
      ceiling: profile.ceiling,
      coefficientOfVariation: profile.coefficientOfVariation,
      uniformity: profile.uniformity,
    },
  };
}

/** Family index. */
function index(): HandlerResult {
  const libraries = vocabularyLibraries();
  return {
    data: {
      name: 'retention',
      summary:
        'Spaced-repetition schedules used in IELTS vocabulary preparation, scored against the forgetting curve they all cite.',
      schedules: REVIEW_SCHEDULES.length,
      families: SCHEDULE_FAMILIES,
      provenances: SCHEDULE_PROVENANCES,
      scheduleIds: SCHEDULE_IDS,
      curve: { id: EBBINGHAUS_CURVE.id, formula: EBBINGHAUS_CURVE.formula, fit: curveFit() },
      masteryRule: MASTERY_RULE,
      optimalSpacing: OPTIMAL_SPACING_RATIO,
      libraries: libraries.map((library) => ({
        id: library.id,
        englishName: library.englishName,
        words: library.words,
        partitions: library.partitions,
      })),
      endpoints: [
        '/v1/retention/schedules',
        '/v1/retention/schedules/:id',
        '/v1/retention/curve',
        '/v1/retention/plan',
        '/v1/retention/workload',
        '/v1/retention/compare',
        '/v1/retention/libraries',
        '/v1/retention/coverage',
        '/v1/retention/mastery',
      ],
    },
    meta: {
      caveat:
        'Every schedule here is recorded as published or as deployed, never as recommended. Two of them come from a single running application and disagree with each other; that disagreement is the finding, not a defect in the transcription.',
      dataLicense: 'CC BY 4.0',
    },
  };
}

/** The schedule catalogue. */
function schedules(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const model = modelParams(params);
  const family = getEnum(params, 'family', SCHEDULE_FAMILIES);
  const provenance = getEnum(params, 'provenance', SCHEDULE_PROVENANCES);
  const matched = REVIEW_SCHEDULES.filter(
    (schedule) =>
      (family === undefined || schedule.family === family) &&
      (provenance === undefined || schedule.provenance === provenance),
  );
  const ranked = [...matched].sort(
    (a, b) =>
      retentionProfile(b, model.reviews, model.growth, model.mastery).uniformity -
      retentionProfile(a, model.reviews, model.growth, model.mastery).uniformity,
  );
  return {
    data: matched.map((schedule) => summarise(schedule, model)),
    meta: {
      count: matched.length,
      total: REVIEW_SCHEDULES.length,
      ...modelMeta(model),
      rankedByUniformity: ranked.map((schedule) => schedule.id),
      uniformityNote:
        'uniformity is 1 - the coefficient of variation of predicted retention across the scheduled reviews. Algorithms designed around a constant target retention score near 1; interval lists assembled from round numbers do not.',
    },
  };
}

/** One schedule, expanded and scored. */
function schedule(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const model = modelParams(params);
  const found = reviewSchedule(context.params.id as string);
  return {
    data: {
      ...summarise(found, model),
      stages: scheduleStages(found, model.reviews, model.mastery),
      profile: retentionProfile(found, model.reviews, model.growth, model.mastery),
    },
    meta: {
      ...modelMeta(model),
      terminalNote:
        found.intervalsMinutes.length >= model.reviews
          ? 'Every review shown is published by the source.'
          : `Reviews ${found.intervalsMinutes.length} and later are produced by the schedule's terminal rule (${found.terminal.kind}), not published as literal intervals.`,
    },
  };
}

/** The forgetting curve itself. */
function curve(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const raw = getString(params, 'at');
  const samples =
    raw === undefined
      ? [1, 5, 20, 60, 240, MINUTES_PER_DAY, 2 * MINUTES_PER_DAY, 7 * MINUTES_PER_DAY, 30 * MINUTES_PER_DAY]
      : raw.split(',').map((token) => {
          const value = Number.parseFloat(token.trim());
          if (!Number.isFinite(value) || value < 0 || value > 5_256_000) {
            throw badRequest(
              'Parameter "at" must be a comma-separated list of minutes between 0 and 5256000.',
              {
                parameter: 'at',
                received: token.trim(),
              },
            );
          }
          return value;
        });
  if (samples.length > 100) {
    throw badRequest('Parameter "at" accepts at most 100 values.', {
      parameter: 'at',
      received: String(samples.length),
    });
  }
  return {
    data: {
      model: EBBINGHAUS_CURVE,
      fit: curveFit(),
      samples: samples.map((minutes) => ({
        minutes,
        days: round4(minutes / MINUTES_PER_DAY),
        retention: round4(ebbinghausRetention(minutes)),
      })),
    },
    meta: {
      count: samples.length,
      formula: EBBINGHAUS_CURVE.formula,
      source: EBBINGHAUS_CURVE.sourceUrl,
      validation:
        "The equation and the observations are both Ebbinghaus's. Refitting one against the other on every request is the check that the transcription is right; the residuals are published in full so the check can be repeated by hand.",
      caveat: EBBINGHAUS_CURVE.note,
    },
  };
}

/** A dated review calendar for a single item. */
function plan(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const model = modelParams(params);
  const found = requireSchedule(requireString(params, 'schedule'), 'schedule');
  const start = getIsoDate(params, 'start', new Date().toISOString().slice(0, 10));
  const examIn = getInt(params, 'examIn', 1, 730, 0);
  const calendar = reviewCalendar(found, start, model.reviews, model.mastery);
  return {
    data: {
      scheduleId: found.id,
      scheduleName: found.name,
      start,
      reviews: calendar,
      lastReviewDate: (calendar.at(-1) as (typeof calendar)[number]).date,
      exam:
        examIn === 0
          ? null
          : {
              days: examIn,
              date: addDays(start, examIn),
              reviewsBeforeExam: calendar.filter((entry) => entry.calendarDay <= examIn).length,
              optimalGapDays: {
                low: round2(examIn * OPTIMAL_SPACING_RATIO.low),
                high: round2(examIn * OPTIMAL_SPACING_RATIO.high),
                source: OPTIMAL_SPACING_RATIO.sourceUrl,
              },
            },
    },
    meta: {
      ...modelMeta(model),
      count: calendar.length,
      spacingNote:
        examIn === 0
          ? 'Pass "examIn" (days until the test) to have the Cepeda et al. (2008) optimal-gap band reported alongside the fixed schedule.'
          : OPTIMAL_SPACING_RATIO.note,
    },
  };
}

/** Daily load produced by a schedule. */
function workload(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const model = modelParams(params);
  const found = requireSchedule(requireString(params, 'schedule'), 'schedule');
  const simulation = simulateWorkload(found, {
    newPerDay: getInt(params, 'newPerDay', 1, 200, 20),
    daysPerWeek: getInt(params, 'daysPerWeek', 1, 7, 7),
    days: getInt(params, 'days', 1, 365, 90),
    reviews: model.reviews,
    mastery: model.mastery,
    startDate: getIsoDate(params, 'start', new Date().toISOString().slice(0, 10)),
  });
  return {
    data: simulation,
    meta: {
      ...modelMeta(model),
      count: simulation.timeline.length,
      studyDayPlacement:
        'New words are introduced on the first `daysPerWeek` days of each seven-day block. Reviews fall due whenever the schedule places them, including on non-study days: no schedule in the catalogue defers a review to the next study day, and none of them says so.',
      steadyStateNote:
        'steadyStateDailyTotal is the exact weekly mean once every stage of the first cohort has fired: newPerDay x daysPerWeek x (1 + reviews) / 7. It is the number that decides whether a learner keeps going.',
    },
  };
}

/** Divergence between two schedules. */
function compare(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const mastery = getInt(params, 'mastery', 0, 100, 100);
  const first = requireSchedule(requireString(params, 'a'), 'a');
  const second = requireSchedule(requireString(params, 'b'), 'b');
  if (first.id === second.id) {
    throw badRequest('Parameters "a" and "b" must name different schedules.', {
      parameter: 'b',
      received: second.id,
    });
  }
  return {
    data: compareSchedules(first, second, mastery),
    meta: {
      method:
        'The two schedules are compared review by review over their published intervals only. Terminal rules are not applied: extending a two-interval publication to eight reviews would compare an assumption with a fact. Rows where only one schedule publishes an interval are reported with a null difference and excluded from the agreement rate.',
      unit: 'calendar days from the day the item was first learned, counting that day as day 0',
      a: { id: first.id, name: first.name, sourceUrl: first.sourceUrl },
      b: { id: second.id, name: second.name, sourceUrl: second.sourceUrl },
    },
  };
}

/** The word lists schedules are applied to. */
function libraries(): HandlerResult {
  const all = vocabularyLibraries();
  return {
    data: all,
    meta: {
      count: all.length,
      totalWords: all.reduce((total, library) => total + library.words, 0),
      comparability:
        'These counts are not comparable with one another. None of the three sources states its lemmatisation or its inclusion rule, so a difference in headword count between two IELTS word lists is at least as likely to be a difference in counting as a difference in coverage.',
      validated:
        'The twenty-two published scene sizes of the Zhenjing list sum exactly to its published total, which is the only internal consistency check any of the three lists permits.',
    },
  };
}

/** How long a word list takes under a schedule. */
function coverage(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const model = modelParams(params);
  const found = requireSchedule(requireString(params, 'schedule'), 'schedule');
  const library = requireLibrary(requireString(params, 'library'), 'library');
  const deadlineRaw = getInt(params, 'deadline', 1, 1095, 0);
  const daysPerWeek = getInt(params, 'daysPerWeek', 1, 7, 7);
  const report = coverLibrary(library, found, {
    newPerDay: getInt(params, 'newPerDay', 1, 200, 20),
    daysPerWeek,
    reviews: model.reviews,
    mastery: model.mastery,
    deadline: deadlineRaw === 0 ? undefined : deadlineRaw,
  });
  return {
    data: report,
    meta: {
      ...modelMeta(model),
      tailNote: `The gap between firstPassDays (${report.firstPassDays}) and maturityDays (${report.maturityDays}) is the schedule's tail: the time after the last new word during which reviews keep arriving. Preparation guides publish the first number and never the second.`,
      deadlineNote:
        deadlineRaw === 0
          ? 'Pass "deadline" (days until the test) to have the required daily rate and the feasibility of the plan reported.'
          : `Study days inside the deadline are counted as ${daysPerWeek} per seven-day block, giving ${studyDaysWithin(deadlineRaw, daysPerWeek)} study days.`,
    },
  };
}

/** Parse the answer list of the mastery tracer. */
function parseAnswers(raw: string): boolean[] {
  const tokens = raw.split(',').map((token) => token.trim().toLowerCase());
  if (tokens.length > MAX_ANSWERS) {
    throw badRequest(`Parameter "answers" accepts at most ${MAX_ANSWERS} answers.`, {
      parameter: 'answers',
      received: String(tokens.length),
    });
  }
  return tokens.map((token) => {
    if (['1', 'true', 'y', 'yes', 'correct', 'c'].includes(token)) {
      return true;
    }
    if (['0', 'false', 'n', 'no', 'wrong', 'w'].includes(token)) {
      return false;
    }
    throw badRequest('Parameter "answers" must be a comma-separated list of 1/0 (or correct/wrong).', {
      parameter: 'answers',
      received: token,
    });
  });
}

/** Parse the confidence list, which may be a single value applied to every answer. */
function parseConfidences(raw: string | undefined, count: number): number[] {
  const [low, high] = MASTERY_RULE.confidenceRange;
  const tokens = raw === undefined ? ['3'] : raw.split(',').map((token) => token.trim());
  const values = tokens.map((token) => {
    if (!/^\d+$/.test(token)) {
      throw badRequest('Parameter "confidence" must be a comma-separated list of integers.', {
        parameter: 'confidence',
        received: token,
      });
    }
    const value = Number.parseInt(token, 10);
    if (value < low || value > high) {
      throw badRequest(`Parameter "confidence" must be between ${low} and ${high}.`, {
        parameter: 'confidence',
        received: token,
      });
    }
    return value;
  });
  if (values.length === 1) {
    return Array.from({ length: count }, () => values[0] as number);
  }
  if (values.length !== count) {
    throw badRequest('Parameter "confidence" must supply either one value or one value per answer.', {
      parameter: 'confidence',
      received: String(values.length),
      expected: String(count),
    });
  }
  return values;
}

/** Replay the deployed mastery rule. */
function mastery(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const answers = parseAnswers(requireString(params, 'answers'));
  const confidences = parseConfidences(getString(params, 'confidence'), answers.length);
  const initial = getInt(params, 'initial', 0, 100, 0);
  const trace = masteryTrace(MASTERY_RULE, answers, confidences, initial);
  const [lowest, highest] = MASTERY_RULE.confidenceRange;
  const perConfidence = Array.from({ length: highest - lowest + 1 }, (_unused, offset) => {
    const confidence = lowest + offset;
    return {
      confidence,
      correctAnswersToFullMastery: Math.ceil(100 / (MASTERY_RULE.rewardPerConfidence * confidence)),
      wrongAnswersToZeroFromFull: Math.ceil(100 / (MASTERY_RULE.penaltyPerConfidence * confidence)),
    };
  });
  return {
    data: { rule: MASTERY_RULE, trace, perConfidence },
    meta: {
      count: trace.steps.length,
      asymmetry: `One wrong answer costs exactly ${MASTERY_RULE.penaltyRatio} correct answers at the same confidence, so mastery is stable at an accuracy of ${round2(trace.breakEvenAccuracy * 100)}%. The upstream documents neither figure.`,
      confidenceNote:
        'Confidence is self-reported and multiplies reward and penalty alike, so it scales the speed of movement in both directions without changing the break-even accuracy. A learner who reports 5 everywhere reaches full mastery in four answers and loses it in three.',
      source: MASTERY_RULE.sourceUrl,
    },
  };
}

/** Retention routes. */
export const retentionRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/retention',
    versioned: true,
    summary: 'Index of the spaced-repetition layer: schedules, curve, mastery rule and word lists.',
    handler: index,
  },
  {
    method: 'GET',
    path: '/v1/retention/schedules',
    versioned: true,
    summary: 'The catalogue of published and deployed review schedules, scored against the forgetting curve.',
    handler: schedules,
  },
  {
    method: 'GET',
    path: '/v1/retention/curve',
    versioned: true,
    summary: 'The Ebbinghaus retention function, its seven observations and the residuals between them.',
    handler: curve,
  },
  {
    method: 'GET',
    path: '/v1/retention/plan',
    versioned: true,
    summary: 'A dated review calendar for one item under a chosen schedule.',
    handler: plan,
  },
  {
    method: 'GET',
    path: '/v1/retention/workload',
    versioned: true,
    summary: 'Simulate the daily review load a schedule produces at a chosen intake rate.',
    handler: workload,
  },
  {
    method: 'GET',
    path: '/v1/retention/compare',
    versioned: true,
    summary: 'Measured divergence between two review schedules, review by review.',
    handler: compare,
  },
  {
    method: 'GET',
    path: '/v1/retention/libraries',
    versioned: true,
    summary: 'The IELTS vocabulary lists these schedules are applied to, with their published sizes.',
    handler: libraries,
  },
  {
    method: 'GET',
    path: '/v1/retention/coverage',
    versioned: true,
    summary: 'How long a vocabulary list takes to cover and to mature under a schedule.',
    handler: coverage,
  },
  {
    method: 'GET',
    path: '/v1/retention/mastery',
    versioned: true,
    summary: 'Replay the deployed mastery-score rule over a sequence of answers.',
    handler: mastery,
  },
  {
    method: 'GET',
    path: '/v1/retention/schedules/:id',
    versioned: true,
    summary: 'One review schedule, expanded to a horizon and scored review by review.',
    handler: schedule,
  },
];
