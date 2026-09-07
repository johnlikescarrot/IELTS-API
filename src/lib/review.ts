/**
 * Spaced-repetition review scheduling (SuperMemo SM-2).
 *
 * {@link buildReviewSchedule} turns a learner's self-assessed recall quality
 * into the next review date and a projection of the reviews after it, using
 * the SM-2 algorithm published by Piotr Wozniak for the SuperMemo system
 * [@wozniak1998sm2]. SM-2 is the canonical spaced-repetition schedule: it was
 * the first to separate the interval from the item itself and to adapt the
 * interval to the learner's performance, and it remains the reference against
 * which later schedulers are benchmarked.
 *
 * The schedule is a pure function of its inputs — the grade, the item's
 * repetition history and the reference date — so identical requests produce
 * byte-identical schedules, the same property the rest of the API guarantees.
 */

import { round2 } from './textstats.js';

import type { RecallQuality, ReviewSchedule, ScheduledReview } from '../types.js';

/** Easiness factor below which SM-2 refuses to descend. */
export const MIN_EASINESS = 1.3;

/** Easiness factor assigned to a newly introduced item. */
export const DEFAULT_EASINESS = 2.5;

/** Number of future reviews projected past the next one. */
export const PROJECTED_REVIEWS = 5;

/** SM-2 descriptions of each response-quality grade. */
const QUALITY_DESCRIPTIONS: Record<RecallQuality, string> = {
  0: 'complete blackout',
  1: 'incorrect response; the correct one remembered',
  2: 'incorrect response; the correct one seemed easy to recall',
  3: 'correct response recalled with serious difficulty',
  4: 'correct response recalled after a hesitation',
  5: 'perfect response',
};

/**
 * Human-readable SM-2 description of a response-quality grade.
 *
 * @param quality - The grade the learner reported.
 */
export function describeQuality(quality: RecallQuality): string {
  return QUALITY_DESCRIPTIONS[quality];
}

/**
 * Apply the SM-2 easiness-factor update, floored at {@link MIN_EASINESS}.
 *
 * @param quality - The grade the learner reported.
 * @param easiness - The easiness factor before the review.
 */
function updatedEasiness(quality: RecallQuality, easiness: number): number {
  const delta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  const next = easiness + delta;
  return next < MIN_EASINESS ? MIN_EASINESS : next;
}

/**
 * Compute the next SM-2 state of an item after one review.
 *
 * A grade below 3 means the item was forgotten: the repetition counter is
 * reset and the item is due again tomorrow, with the easiness factor left
 * untouched. A grade of 3 or more lengthens the interval — 1 day, then 6 days,
 * then the previous interval scaled by the updated easiness factor — and
 * advances the repetition counter.
 *
 * @param quality - The grade the learner reported (0-5).
 * @param repetitions - Consecutive successful repetitions before this review.
 * @param easiness - Easiness factor before this review.
 * @param interval - Current interval in days before this review.
 */
export function nextState(
  quality: RecallQuality,
  repetitions: number,
  easiness: number,
  interval: number,
): { easiness: number; repetitions: number; interval: number } {
  if (quality < 3) {
    return { easiness, repetitions: 0, interval: 1 };
  }
  const ease = round2(updatedEasiness(quality, easiness));
  let nextInterval: number;
  if (repetitions === 0) {
    nextInterval = 1;
  } else if (repetitions === 1) {
    nextInterval = 6;
  } else {
    nextInterval = Math.round(interval * ease);
  }
  return { easiness: ease, repetitions: repetitions + 1, interval: nextInterval };
}

/**
 * Add a whole number of days to an ISO date, in UTC.
 *
 * @param iso - ISO date (`YYYY-MM-DD`).
 * @param days - Days to add (non-negative).
 */
export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Inputs accepted by {@link buildReviewSchedule}; all values are pre-validated. */
export interface ReviewScheduleInput {
  /** Response quality graded by the learner (0-5). */
  quality: RecallQuality;
  /** Consecutive successful repetitions before this review. */
  repetitions: number;
  /** Easiness factor before this review. */
  easiness: number;
  /** Current interval in days before this review. */
  interval: number;
  /** Reference date (YYYY-MM-DD) the schedule is computed from. */
  today: string;
}

/**
 * Build a spaced-repetition schedule for one item.
 *
 * @param input - Pre-validated inputs.
 */
export function buildReviewSchedule(input: ReviewScheduleInput): ReviewSchedule {
  const { quality, repetitions, easiness, interval, today } = input;

  const next = nextState(quality, repetitions, easiness, interval);
  const schedule: ScheduledReview = { ...next, due: addDays(today, next.interval) };

  const projected: ScheduledReview[] = [];
  let state = next;
  let due = schedule.due;
  for (let step = 0; step < PROJECTED_REVIEWS; step += 1) {
    const following = nextState(quality, state.repetitions, state.easiness, state.interval);
    due = addDays(due, following.interval);
    projected.push({ ...following, due });
    state = following;
  }

  return {
    inputs: { quality, repetitions, easiness, interval, today },
    recall: {
      quality,
      description: describeQuality(quality),
      forgotten: quality < 3,
    },
    schedule,
    projected,
    note:
      'SuperMemo SM-2: a grade below 3 resets the repetition counter and reschedules the item for ' +
      'tomorrow with the easiness factor unchanged; grades 3-5 lengthen the interval (1 day, 6 days, ' +
      'then the previous interval times the easiness factor, floored at 1.3). Dates are computed from ' +
      'the supplied `today` in UTC.',
  };
}
