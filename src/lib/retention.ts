/**
 * Review scheduling arithmetic.
 *
 * Five published schedulers, one interface. Each is expressed as a pair of pure
 * functions — "how long until the next review, given this state" and "what does
 * this state become when the review is graded" — so that a whole review
 * calendar is a fold over a seed state and every endpoint in the family is a
 * pure function of its query string. Nothing is stored, nothing is
 * authenticated, and identical requests produce byte-identical calendars.
 *
 * ## The shadow retention model
 *
 * Schedulers cannot be compared on their intervals alone: a scheduler that
 * reviews rarely is not thereby better, it is merely cheaper. To compare them
 * on retention this module evaluates every scheduler against one common model —
 * the exponential decay `p = 2^(-lag/h)` of Settles and Meeder (2016), with the
 * half-life estimated from the review history by the same regression form.
 * That gives a single, scheduler-independent answer to "how likely is the
 * learner to recall the item at the moment this scheduler chooses to show it".
 * It is a *model*, not a measurement, and is labelled as such in every response.
 */

import {
  DAY_SECONDS,
  HLR_BIAS,
  HLR_CORRECT_WEIGHT,
  HLR_INCORRECT_WEIGHT,
  HLR_MAXIMUM_HALF_LIFE,
  HLR_MINIMUM_HALF_LIFE,
  SM2_FIRST_INTERVAL,
  SM2_INITIAL_EASE,
  SM2_MINIMUM_EASE,
  SM2_SECOND_INTERVAL,
  SCHEDULERS,
  ebbinghausSavings,
} from '../data/retention.js';
import { vocabularyStats } from '../data/vocabulary.js';
import { round1, round2 } from './textstats.js';

import type {
  ReviewGrade,
  ReviewSchedule,
  ReviewState,
  ScheduledReview,
  Scheduler,
  SchedulerProjection,
  WorkloadProjection,
} from '../types.js';

/** Lowest grade that counts as a successful recall, on SM-2's 0-5 scale. */
export const PASSING_QUALITY = 3;

/** Round to four decimal places, used for probabilities. */
function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

/**
 * Estimated memory half-life, in days, from a review history.
 *
 * The half-life regression form of Settles and Meeder (2016):
 * `h = 2^(theta . x)` with `x = [1, sqrt(correct), sqrt(incorrect)]`, clamped to
 * the range the paper clamps to. Used both as the `half-life` scheduler's own
 * state and as the shadow model against which every other scheduler is scored.
 *
 * @param repetitions - Successful reviews so far.
 * @param lapses - Failed reviews so far.
 * @returns Half-life in days, clamped to 0.1-90.
 */
export function halfLifeDays(repetitions: number, lapses: number): number {
  const exponent =
    HLR_BIAS + HLR_CORRECT_WEIGHT * Math.sqrt(repetitions) + HLR_INCORRECT_WEIGHT * Math.sqrt(lapses);
  return Math.min(HLR_MAXIMUM_HALF_LIFE, Math.max(HLR_MINIMUM_HALF_LIFE, 2 ** exponent));
}

/**
 * Probability of recalling an item after a lag, under the half-life model.
 *
 * @param lagDays - Time since the previous exposure, in days.
 * @param half - Memory half-life, in days.
 */
export function recallAfter(lagDays: number, half: number): number {
  return 2 ** (-lagDays / half);
}

/**
 * The lag at which recall decays to a target probability.
 *
 * `p = 2^(-lag/h)` solved for `lag`, which is how the half-life scheduler picks
 * its interval: it schedules the review at the moment the model says the item
 * is about to be forgotten.
 *
 * @param half - Memory half-life, in days.
 * @param targetRecall - Recall probability to schedule at (0-1, exclusive).
 */
export function lagForRecall(half: number, targetRecall: number): number {
  return -half * Math.log2(targetRecall);
}

/**
 * The seed state of an item that has just been learned for the first time.
 *
 * @param scheduler - Scheduler the state belongs to.
 */
export function initialState(scheduler: Scheduler): ReviewState {
  return {
    repetitions: 0,
    lapses: 0,
    intervalSeconds: 0,
    easeFactor: scheduler.id === 'sm-2' ? SM2_INITIAL_EASE : null,
    box: scheduler.id === 'leitner-5box' ? 1 : null,
    halfLifeDays: scheduler.id === 'half-life' ? round2(halfLifeDays(0, 0)) : null,
    mastery: scheduler.id === 'ebbinghaus-folk' ? 0 : null,
  };
}

/** Options that affect interval selection. */
export interface IntervalOptions {
  /** Recall probability the half-life scheduler aims for (0-1, exclusive). */
  targetRecall: number;
}

/**
 * Interval to wait before the next review, in seconds.
 *
 * @param scheduler - Scheduler in use.
 * @param state - Current state of the item.
 * @param options - Interval options.
 */
export function nextInterval(scheduler: Scheduler, state: ReviewState, options: IntervalOptions): number {
  switch (scheduler.id) {
    case 'ebbinghaus-folk': {
      // The deployed implementation indexes the ladder by the *total* number of
      // reviews and never rewinds it, so a failed review advances the schedule
      // exactly as a successful one does.
      const seen = state.repetitions + state.lapses;
      const step = scheduler.ladder[seen];
      if (step !== undefined) {
        return step;
      }
      const last = scheduler.ladder[scheduler.ladder.length - 1] as number;
      return Math.round(last * (1 + (state.mastery as number) / 100));
    }
    case 'pimsleur-1967': {
      const step = scheduler.ladder[state.repetitions];
      if (step !== undefined) {
        return step;
      }
      const last = scheduler.ladder[scheduler.ladder.length - 1] as number;
      const beyond = state.repetitions - scheduler.ladder.length + 1;
      return Math.round(last * (scheduler.growth as number) ** beyond);
    }
    case 'leitner-5box':
      return scheduler.ladder[(state.box as number) - 1] as number;
    case 'sm-2': {
      if (state.repetitions === 0) {
        return SM2_FIRST_INTERVAL;
      }
      if (state.repetitions === 1) {
        return SM2_SECOND_INTERVAL;
      }
      return Math.round(state.intervalSeconds * (state.easeFactor as number));
    }
    case 'half-life':
      return Math.round(lagForRecall(state.halfLifeDays as number, options.targetRecall) * DAY_SECONDS);
  }
}

/**
 * Whether a scheduler has run out of room to grow the interval.
 *
 * Pimsleur and SM-2 answer `false` unconditionally: both multiply without a
 * bound, so there is no interval either of them cannot eventually reach.
 *
 * @param scheduler - Scheduler in use.
 * @param state - Current state of the item.
 */
export function atCeiling(scheduler: Scheduler, state: ReviewState): boolean {
  switch (scheduler.id) {
    case 'ebbinghaus-folk':
      return state.repetitions + state.lapses >= scheduler.ladder.length && state.mastery === 100;
    case 'leitner-5box':
      return state.box === 5;
    case 'half-life':
      return state.halfLifeDays === HLR_MAXIMUM_HALF_LIFE;
    case 'pimsleur-1967':
    case 'sm-2':
      return false;
  }
}

/**
 * Update the SM-2 easiness factor.
 *
 * `EF += 0.1 - (5-q) * (0.08 + (5-q) * 0.02)`, floored at 1.3. The floor is the
 * reason SM-2 cannot be driven arbitrarily slow by repeated failure.
 *
 * @param ease - Current easiness factor.
 * @param quality - Grade on the 0-5 scale.
 */
export function updateEase(ease: number, quality: number): number {
  const penalty = 5 - quality;
  const updated = ease + (0.1 - penalty * (0.08 + penalty * 0.02));
  return Math.max(SM2_MINIMUM_EASE, round2(updated));
}

/**
 * Update the folk ladder's mastery score.
 *
 * The deployed implementation reads a 1-5 self-reported confidence and moves
 * mastery by `+5 * confidence` on success and `-8 * confidence` on failure, so
 * a single failure at full confidence costs more than a success at full
 * confidence earns. Grades are clamped into 1-5, which is the identity over the
 * range the two scales share.
 *
 * @param mastery - Current mastery score, 0-100.
 * @param quality - Grade on the 0-5 scale.
 */
export function updateMastery(mastery: number, quality: number): number {
  const confidence = Math.min(5, Math.max(1, quality));
  const change = quality >= PASSING_QUALITY ? confidence * 5 : -confidence * 8;
  return Math.min(100, Math.max(0, round2(mastery + change)));
}

/**
 * Grade a review and return the state it produces.
 *
 * @param scheduler - Scheduler in use.
 * @param state - State before the review.
 * @param quality - Grade on the 0-5 scale.
 * @param waited - Interval that preceded the review, in seconds.
 */
export function advance(
  scheduler: Scheduler,
  state: ReviewState,
  quality: number,
  waited: number,
): ReviewState {
  const correct = quality >= PASSING_QUALITY;
  const repetitions = correct ? state.repetitions + 1 : state.repetitions;
  const lapses = correct ? state.lapses : state.lapses + 1;
  const next: ReviewState = {
    repetitions,
    lapses,
    intervalSeconds: waited,
    easeFactor: null,
    box: null,
    halfLifeDays: null,
    mastery: null,
  };
  switch (scheduler.id) {
    case 'ebbinghaus-folk':
      next.mastery = updateMastery(state.mastery as number, quality);
      break;
    case 'leitner-5box':
      next.box = correct ? Math.min(5, (state.box as number) + 1) : 1;
      break;
    case 'sm-2':
      next.easeFactor = updateEase(state.easeFactor as number, quality);
      // SM-2 sends a lapsed item back to the start of the interval sequence but
      // keeps the easiness it has earned, so difficulty survives a bad day.
      next.repetitions = correct ? repetitions : 0;
      break;
    case 'half-life':
      next.halfLifeDays = round2(halfLifeDays(repetitions, lapses));
      break;
    case 'pimsleur-1967':
      // Pimsleur's schedule is open-loop: it carries no state beyond the count
      // of successful recalls, and the paper specifies no failure branch at all.
      break;
  }
  return next;
}

/** Inputs accepted by {@link buildSchedule}; all values are pre-validated. */
export interface ScheduleOptions {
  /** Instant the item was first learned, ISO-8601 in UTC. */
  start: string;
  /** Grade applied to every review, on the 0-5 scale. */
  quality: number;
  /** Length of the calendar, in days. */
  horizonDays: number;
  /** Hard cap on the number of reviews returned. */
  maxReviews: number;
  /** Recall probability the half-life scheduler aims for. */
  targetRecall: number;
}

/** One step of the fold, shared by the calendar and the projections. */
interface Step {
  intervalSeconds: number;
  elapsedSeconds: number;
  before: ReviewState;
  after: ReviewState;
}

/**
 * Roll a scheduler forward until it leaves the horizon or runs out of reviews.
 *
 * @param scheduler - Scheduler in use.
 * @param options - Schedule options.
 */
function rollForward(scheduler: Scheduler, options: ScheduleOptions): Step[] {
  const horizonSeconds = options.horizonDays * DAY_SECONDS;
  const steps: Step[] = [];
  let state = initialState(scheduler);
  let elapsed = 0;
  while (steps.length < options.maxReviews) {
    const interval = Math.max(1, nextInterval(scheduler, state, options));
    if (elapsed + interval > horizonSeconds) {
      break;
    }
    elapsed += interval;
    const after = advance(scheduler, state, options.quality, interval);
    steps.push({ intervalSeconds: interval, elapsedSeconds: elapsed, before: state, after });
    state = after;
  }
  return steps;
}

/**
 * Turn a rolled-forward scheduler into a dated review calendar.
 *
 * @param scheduler - Scheduler in use.
 * @param options - Schedule options.
 * @returns The calendar, its summary and the caveats that belong with it.
 */
export function buildSchedule(scheduler: Scheduler, options: ScheduleOptions): ReviewSchedule {
  const startMs = Date.parse(options.start);
  const steps = rollForward(scheduler, options);
  const reviews: ScheduledReview[] = steps.map((step, index) => {
    const lagDays = step.intervalSeconds / DAY_SECONDS;
    const shadow = halfLifeDays(step.before.repetitions, step.before.lapses);
    return {
      review: index + 1,
      intervalSeconds: step.intervalSeconds,
      intervalDays: round4(lagDays),
      elapsedDays: round4(step.elapsedSeconds / DAY_SECONDS),
      at: new Date(startMs + step.elapsedSeconds * 1000).toISOString(),
      predictedSavings: round2(ebbinghausSavings(step.elapsedSeconds / 60)),
      predictedRecall: round4(recallAfter(lagDays, shadow)),
      state: step.after,
    };
  });
  const last = steps.at(-1);
  const meanRecall =
    reviews.length === 0
      ? 0
      : reviews.reduce((total, review) => total + review.predictedRecall, 0) / reviews.length;
  return {
    scheduler: scheduler.id,
    schedulerName: scheduler.name,
    inputs: {
      start: options.start,
      quality: options.quality,
      horizonDays: options.horizonDays,
      maxReviews: options.maxReviews,
      targetRecall: options.targetRecall,
    },
    reviews,
    summary: {
      reviews: reviews.length,
      firstIntervalDays: round4((steps[0]?.intervalSeconds ?? 0) / DAY_SECONDS),
      terminalIntervalDays: round4((last?.intervalSeconds ?? 0) / DAY_SECONDS),
      coveredDays: round2((last?.elapsedSeconds ?? 0) / DAY_SECONDS),
      reachedHorizon: reviews.length === options.maxReviews,
      meanPredictedRecall: round4(meanRecall),
    },
    notes: [
      `Every review is graded ${options.quality} out of 5. The calendar is a pure function of the query string: no state is stored and identical requests return identical calendars.`,
      "predictedSavings is what Ebbinghaus's own 1885 equation says would survive at that lag with no reviews at all; it is the baseline the schedule is trying to beat, not a prediction of the schedule.",
      'predictedRecall is the shadow half-life model applied to the review history, so it is comparable across schedulers. It is a model, not a measurement.',
      scheduler.claimsEbbinghaus
        ? 'This scheduler is documented by its authors as implementing the Ebbinghaus forgetting curve. It does not: Ebbinghaus published retention measurements, not a review ladder.'
        : `Intervals are those published in ${scheduler.source}`,
    ],
  };
}

/**
 * Roll every scheduler forward over one shared horizon.
 *
 * This is the comparison the field lacks. The schedulers are not variants of
 * one method — they disagree about how many times an item must be seen, about
 * whether the interval may grow without bound, and about what a failed review
 * costs — and over a year those disagreements are large enough to change the
 * shape of a study plan.
 *
 * @param options - Schedule options shared by every scheduler.
 * @returns One row per scheduler.
 */
export function projectSchedulers(options: ScheduleOptions): SchedulerProjection[] {
  return SCHEDULERS.map((scheduler) => {
    const schedule = buildSchedule(scheduler, options);
    return {
      scheduler: scheduler.id,
      name: scheduler.name,
      family: scheduler.family,
      provenance: scheduler.provenance,
      reviews: schedule.summary.reviews,
      terminalIntervalDays: schedule.summary.terminalIntervalDays,
      coveredDays: schedule.summary.coveredDays,
      reachedHorizon: schedule.summary.reachedHorizon,
      meanPredictedRecall: schedule.summary.meanPredictedRecall,
      reviewsPerYear: round1((schedule.summary.reviews / options.horizonDays) * 365),
    };
  });
}

/** Inputs accepted by {@link projectWorkload}; all values are pre-validated. */
export interface WorkloadOptions extends ScheduleOptions {
  /** New headwords introduced every day. */
  wordsPerDay: number;
}

/**
 * Project the daily review load of a steady intake of new words.
 *
 * A learner who starts `wordsPerDay` new words every morning inherits every
 * review those words will ever generate. The load is not the intake: it is the
 * intake convolved with the scheduler's interval sequence, and it keeps rising
 * until the earliest cohorts reach the scheduler's terminal interval. For a
 * scheduler whose interval is capped — the folk ladder caps at 30 days — the
 * load never stops rising in proportion to the size of the collection, which is
 * the arithmetic behind every abandoned vocabulary app.
 *
 * @param scheduler - Scheduler in use.
 * @param options - Workload options.
 */
export function projectWorkload(scheduler: Scheduler, options: WorkloadOptions): WorkloadProjection {
  const steps = rollForward(scheduler, options);
  // Day offsets on which one cohort's reviews fall, relative to its intake day.
  const offsets = steps.map((step) => Math.floor(step.elapsedSeconds / DAY_SECONDS));
  const daily = new Array<number>(options.horizonDays).fill(0);
  for (let intake = 0; intake < options.horizonDays; intake += 1) {
    for (const offset of offsets) {
      const day = intake + offset;
      if (day < options.horizonDays) {
        daily[day] = (daily[day] as number) + options.wordsPerDay;
      }
    }
  }
  const secondHalf = daily.slice(Math.floor(options.horizonDays / 2));
  const steady =
    secondHalf.length === 0 ? 0 : secondHalf.reduce((total, value) => total + value, 0) / secondHalf.length;
  const peak = daily.reduce((highest, value) => Math.max(highest, value), 0);
  const headwords = vocabularyStats().words;
  return {
    scheduler: scheduler.id,
    schedulerName: scheduler.name,
    inputs: {
      wordsPerDay: options.wordsPerDay,
      horizonDays: options.horizonDays,
      quality: options.quality,
      headwords,
    },
    reviewsPerWord: steps.length,
    peakDailyReviews: peak,
    steadyStateDailyReviews: round1(steady),
    totalReviews: daily.reduce((total, value) => total + value, 0),
    daysToCoverHeadwords: Math.ceil(headwords / options.wordsPerDay),
    peakDailyItems: peak + options.wordsPerDay,
    notes: [
      `Each of the ${options.horizonDays} days introduces ${options.wordsPerDay} new headwords, and every cohort carries the ${steps.length} reviews this scheduler schedules inside the horizon.`,
      'Reviews are bucketed into whole days, so a scheduler with several sub-day steps loads them all onto the intake day, exactly as a learner would meet them.',
      'steadyStateDailyReviews averages the second half of the horizon, by which point the earliest cohorts have reached their terminal interval.',
      `The Cambridge IELTS 1-22 headword list holds ${headwords} words, so introducing ${options.wordsPerDay} a day covers it in ${Math.ceil(headwords / options.wordsPerDay)} days.`,
    ],
  };
}

/** Inputs accepted by {@link gradeReview}; all values are pre-validated. */
export interface GradeOptions extends IntervalOptions {
  /** Successful reviews before this one. */
  repetitions: number;
  /** Failed reviews before this one. */
  lapses: number;
  /** Grade being applied, on the 0-5 scale. */
  quality: number;
  /** Interval that preceded this review, in seconds; `0` when unknown. */
  previousIntervalSeconds: number;
  /** SM-2 easiness factor before this review. */
  easeFactor: number;
}

/**
 * Grade one review and report the interval it earns.
 *
 * The stateless equivalent of the `POST /progress` endpoint every vocabulary
 * trainer implements behind a login. The caller supplies the history, the API
 * supplies the arithmetic, and nothing is retained on either side.
 *
 * @param scheduler - Scheduler in use.
 * @param options - Grade options.
 */
export function gradeReview(scheduler: Scheduler, options: GradeOptions): ReviewGrade {
  const seed = initialState(scheduler);
  const before: ReviewState = {
    repetitions: options.repetitions,
    lapses: options.lapses,
    intervalSeconds: options.previousIntervalSeconds,
    easeFactor: seed.easeFactor === null ? null : options.easeFactor,
    box: seed.box === null ? null : Math.min(5, Math.max(1, options.repetitions - options.lapses + 1)),
    halfLifeDays:
      seed.halfLifeDays === null ? null : round2(halfLifeDays(options.repetitions, options.lapses)),
    mastery: seed.mastery === null ? null : updateMasteryFrom(options.repetitions, options.lapses),
  };
  const interval = Math.max(1, nextInterval(scheduler, before, options));
  const after = advance(scheduler, before, options.quality, interval);
  const shadow = halfLifeDays(after.repetitions, after.lapses);
  return {
    scheduler: scheduler.id,
    schedulerName: scheduler.name,
    quality: options.quality,
    correct: options.quality >= PASSING_QUALITY,
    before,
    after,
    intervalSeconds: interval,
    intervalDays: round4(interval / DAY_SECONDS),
    predictedRecall: round4(recallAfter(interval / DAY_SECONDS, shadow)),
    atCeiling: atCeiling(scheduler, after),
  };
}

/**
 * Reconstruct a folk-ladder mastery score from a review history.
 *
 * The deployed implementation stores mastery rather than the history that
 * produced it, so a stateless endpoint has to rebuild it. Replaying the update
 * rule at the passing grade for every success and at the failing grade for
 * every lapse reproduces the score any client that graded consistently would
 * hold.
 *
 * @param repetitions - Successful reviews.
 * @param lapses - Failed reviews.
 */
export function updateMasteryFrom(repetitions: number, lapses: number): number {
  let mastery = 0;
  for (let index = 0; index < repetitions; index += 1) {
    mastery = updateMastery(mastery, 5);
  }
  for (let index = 0; index < lapses; index += 1) {
    mastery = updateMastery(mastery, 0);
  }
  return mastery;
}
