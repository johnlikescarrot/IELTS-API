/**
 * Stateless spaced-repetition scheduling.
 *
 * The scheduler is a deterministic, authentication-free port of the Ebbinghaus
 * review algorithm maintained by the `Iamdacai/ielts-vocab-system` vocabulary
 * trainer (review intervals of 5 minutes, 30 minutes, 12 hours, 1, 2, 4, 7 and
 * 15 days; a 0-100 mastery score; `mastered` at 90; a two-hour review window
 * around the learner's preferred review time). The reference implementation is
 * stateful — it reads the learner's review count and mastery from SQLite and
 * anchors every computation on the server clock — so its answers can neither
 * be cited nor reproduced. This module takes the same inputs explicitly
 * (`reviews`, `mastery`, an anchor date) and returns the same ladder as a pure
 * function of its arguments: identical requests always produce byte-identical
 * schedules.
 *
 * Two adaptations were needed to make the algorithm stateless. First, the
 * reference code anchors intervals on "now"; here the caller supplies the
 * anchor (`from`/`time`), which defaults to the current UTC date at 20:00 —
 * the reference trainer's own default review time. Second, the reference
 * computes one next-review date per request; here the endpoint additionally
 * publishes the whole forward ladder, cumulatively applied from the anchor, so
 * a learner can plan a fortnight of reviews with a single request. The
 * beyond-ladder extension (`base * (1 + mastery / 100)`) is the reference
 * rule, unchanged.
 */

import { round2 } from './textstats.js';

import type { SrsSchedule, SrsStatus, SrsStep } from '../types.js';

/** The eight Ebbinghaus review intervals, in minutes. */
export const SRS_INTERVALS_MINUTES: readonly number[] = [5, 30, 720, 1440, 2880, 5760, 10080, 21600];

/** Mastery at or above which a word counts as mastered. */
export const SRS_MASTERED_AT = 90;

/** Longest interval of the ladder, extended by mastery once the ladder is exhausted. */
const LAST_INTERVAL = SRS_INTERVALS_MINUTES[SRS_INTERVALS_MINUTES.length - 1] as number;

/** Milliseconds in a minute. */
const MS_PER_MINUTE = 60_000;

/**
 * Word-knowledge state implied by a review count and a mastery score.
 *
 * A word with no completed review is `new`; a word at mastery 90 or above is
 * `mastered`; anything in between is `learning`.
 *
 * @param reviews - Completed reviews (0 or more).
 * @param mastery - Mastery score (0-100).
 */
export function srsStatusFor(reviews: number, mastery: number): SrsStatus {
  if (reviews <= 0) {
    return 'new';
  }
  return mastery >= SRS_MASTERED_AT ? 'mastered' : 'learning';
}

/**
 * Project a mastery score after one recall.
 *
 * Correct recalls add `confidence * 5`; misses subtract `confidence * 8`, so a
 * confident error costs more than a guess. The result is clamped to 0-100 and
 * rounded to two decimals.
 *
 * @param current - Current mastery score (0-100).
 * @param correct - Whether the recall was correct.
 * @param confidence - Self-reported confidence (1-5).
 */
export function updateMastery(current: number, correct: boolean, confidence: number): number {
  const change = correct ? confidence * 5 : confidence * -8;
  return round2(Math.max(0, Math.min(100, current + change)));
}

/**
 * Minutes from the anchor until the next review.
 *
 * Review `n` waits for ladder step `n` (review 0 waits 5 minutes); once the
 * eight steps are exhausted the last interval is extended by mastery:
 * `21600 * (1 + mastery / 100)`.
 *
 * @param reviews - Completed reviews (0 or more).
 * @param mastery - Mastery score (0-100).
 */
export function nextReviewOffsetMinutes(reviews: number, mastery: number): number {
  if (reviews < SRS_INTERVALS_MINUTES.length) {
    return SRS_INTERVALS_MINUTES[reviews] as number;
  }
  return LAST_INTERVAL * (1 + mastery / 100);
}

/**
 * ISO-8601 UTC datetime of a millisecond epoch.
 *
 * @param epochMs - Milliseconds since the Unix epoch.
 */
export function isoUtc(epochMs: number): string {
  return new Date(epochMs).toISOString();
}

/**
 * Forward review schedule from an anchor.
 *
 * Each step applies its ladder interval cumulatively, so step 2 falls 35
 * minutes after the anchor (5 + 30), step 3 twelve hours and 35 minutes after
 * it, and so on. Steps past the eighth extend the last interval by mastery, as
 * {@link nextReviewOffsetMinutes} does.
 *
 * @param anchorMs - Anchor as milliseconds since the Unix epoch.
 * @param mastery - Mastery score (0-100), used past the eighth step.
 * @param steps - How many forward steps to publish (1 or more).
 */
export function reviewSchedule(anchorMs: number, mastery: number, steps: number): SrsStep[] {
  const upcoming: SrsStep[] = [];
  let cumulative = 0;
  for (let review = 1; review <= steps; review += 1) {
    const interval = nextReviewOffsetMinutes(review - 1, mastery);
    cumulative += interval;
    upcoming.push({
      review,
      intervalMinutes: round2(interval),
      cumulativeMinutes: round2(cumulative),
      due: isoUtc(anchorMs + cumulative * MS_PER_MINUTE),
    });
  }
  return upcoming;
}

/**
 * Daily review window around a preferred review time.
 *
 * The window spans two hours on either side of `time` on `date`, in UTC.
 *
 * @param date - Calendar date (`YYYY-MM-DD`).
 * @param time - Preferred review time (`HH:MM`, 24-hour clock).
 */
export function reviewWindow(date: string, time: string): { start: string; end: string } {
  const centre = Date.parse(`${date}T${time}:00Z`);
  const halfWindow = 2 * 60 * MS_PER_MINUTE;
  return { start: isoUtc(centre - halfWindow), end: isoUtc(centre + halfWindow) };
}

/** Inputs accepted by {@link buildSrsSchedule}; all values are pre-validated. */
export interface SrsOptions {
  /** Completed reviews (0 or more). */
  reviews: number;
  /** Mastery score (0-100). */
  mastery: number;
  /** Anchor calendar date (`YYYY-MM-DD`). */
  date: string;
  /** Anchor clock time (`HH:MM`, 24-hour clock). */
  time: string;
  /** Forward steps to publish (1 or more). */
  steps: number;
  /** Reported recall, when the caller wants a mastery projection. */
  recall: { correct: boolean; confidence: number } | undefined;
}

/**
 * Build the full spaced-repetition schedule for validated inputs.
 *
 * @param options - Pre-validated inputs.
 */
export function buildSrsSchedule(options: SrsOptions): SrsSchedule {
  const { reviews, mastery, date, time, steps, recall } = options;
  const anchorMs = Date.parse(`${date}T${time}:00Z`);
  const offset = nextReviewOffsetMinutes(reviews, mastery);
  const shared = {
    anchor: isoUtc(anchorMs),
    reviews,
    mastery,
    status: srsStatusFor(reviews, mastery),
    nextReviewInMinutes: round2(offset),
    nextReviewAt: isoUtc(anchorMs + offset * MS_PER_MINUTE),
    ladderMinutes: SRS_INTERVALS_MINUTES,
    upcoming: reviewSchedule(anchorMs, mastery, steps),
    reviewWindow: { date, time, ...reviewWindow(date, time) },
  };
  if (recall === undefined) {
    return { ...shared, masteryProjection: null };
  }
  const projected = updateMastery(mastery, recall.correct, recall.confidence);
  return {
    ...shared,
    masteryProjection: {
      correct: recall.correct,
      confidence: recall.confidence,
      from: mastery,
      to: projected,
      status: srsStatusFor(reviews + 1, projected),
    },
  };
}
