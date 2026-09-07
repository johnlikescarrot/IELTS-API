/**
 * Stateless vocabulary-learning model: the forgetting curve and the review
 * calendar.
 *
 * The reference design for this module is the family of spaced-repetition
 * "wordbook" systems observed in the wild — most directly the unlicensed
 * WeChat vocabulary-learning system at
 * <https://github.com/Iamdacai/ielts-vocab-system>, whose pedagogy is: learn a
 * fixed number of new headwords a day from a word list, then re-present every
 * word on a ladder of expanding review days (1-2-4-7-15-30 in that system).
 * That system cannot be copied from — it declares no licence and mixes
 * commercial wordbook content with live learner data — so this module
 * re-implements the *method* as a pure, transparent model over this API's own
 * CC BY 4.0 Cambridge headword set.
 *
 * The retention model is the classic single-exponential forgetting curve
 * `R = exp(-t/S)` (Ebbinghaus 1885; replicated by Murre & Dros 2015). `S` is a
 * free "stability" parameter in days; after each successful review the model
 * multiplies stability by a growth factor, following the expanding-rehearsal
 * result that successful retrievals lengthen the safe gap (Landauer & Bjork
 * 1978; Cepeda et al. 2006). Every default is explicit and every parameter can
 * be overridden, because the curve is a working model, not a measurement:
 * researchers should fit `S` and the growth factor to their own retention
 * data.
 *
 * All functions are pure and deterministic: identical inputs produce
 * byte-identical outputs, so a study plan archived today can be reproduced on
 * any replica or in ten years' time.
 */

import type {
  DueReview,
  RetentionResult,
  ReviewDay,
  ReviewOrder,
  ReviewSchedule,
  ScheduledWord,
  VocabularyEntry,
} from '../types.js';

/** Default spacing ladder: reviews fall this many days after first study. */
export const DEFAULT_REVIEW_DAYS: readonly number[] = [1, 2, 4, 7, 15, 30];

/** Default initial stability, in days. */
export const DEFAULT_STABILITY_DAYS = 1;

/** Default stability multiplier applied after each completed review. */
export const DEFAULT_STABILITY_GROWTH = 2;

/** Precision used when rounding predicted retention values. */
const RETENTION_PRECISION = 4;

/** Precision used when rounding computed day counts. */
const DAYS_PRECISION = 2;

/**
 * Round a number to a fixed number of decimals without floating-point drift.
 */
export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Predicted retention after `days` elapsed with stability `stabilityDays`.
 *
 * Uses the single-exponential forgetting curve `R = exp(-days / stability)`.
 *
 * @param days - Days elapsed since learning (0 returns 1).
 * @param stabilityDays - Memory-stability parameter in days.
 */
export function retentionAfter(days: number, stabilityDays: number): number {
  return Math.exp(-days / stabilityDays);
}

/**
 * Days until predicted retention decays to `target`.
 *
 * Inverts the forgetting curve: `t = -S * ln(target)`.
 *
 * @param target - Retention target in (0, 1).
 * @param stabilityDays - Memory-stability parameter in days.
 */
export function daysUntilRetention(target: number, stabilityDays: number): number {
  return -stabilityDays * Math.log(target);
}

/**
 * Evaluate the forgetting-curve model at a point.
 *
 * @param days - Days elapsed since learning.
 * @param stabilityDays - Memory-stability parameter in days.
 * @param target - Optional retention target; when given, the response also
 *   reports how many whole days retention stays at or above it.
 */
export function retentionResult(
  days: number,
  stabilityDays: number,
  target: number | undefined,
): RetentionResult {
  const retention = roundTo(retentionAfter(days, stabilityDays), RETENTION_PRECISION);
  const halfLifeDays = roundTo(stabilityDays * Math.LN2, DAYS_PRECISION);
  const inversion =
    target === undefined
      ? null
      : (() => {
          const daysUntil = roundTo(daysUntilRetention(target, stabilityDays), DAYS_PRECISION);
          const lastWholeDay = Math.max(0, Math.floor(daysUntil));
          return {
            retention: target,
            daysUntil,
            lastWholeDay,
            retentionAtLastWholeDay: roundTo(
              retentionAfter(lastWholeDay, stabilityDays),
              RETENTION_PRECISION,
            ),
          };
        })();
  return {
    formula: 'R = exp(-days / stabilityDays)',
    days,
    stabilityDays,
    retention,
    halfLifeDays,
    target: inversion,
  };
}

/**
 * Add whole UTC days to an ISO-8601 calendar date.
 *
 * @param isoDate - Date in `YYYY-MM-DD` form.
 * @param days - Number of days to add (may be negative).
 * @returns The shifted date in `YYYY-MM-DD` form.
 */
export function addDays(isoDate: string, days: number): string {
  const shifted = new Date(`${isoDate}T00:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

/** Options accepted by {@link buildReviewSchedule}; values are pre-validated. */
export interface ReviewScheduleOptions {
  /** First day of the plan (`YYYY-MM-DD`, UTC). */
  startDate: string;
  /** Number of calendar days in the window (1-90). */
  windowDays: number;
  /** New headwords to schedule per day. */
  newPerDay: number;
  /** Headwords available to schedule, already filtered. */
  entries: readonly VocabularyEntry[];
  /** Days after first study at which reviews fall; strictly increasing. */
  reviewDays: readonly number[];
  /** Initial stability in days. */
  stabilityDays: number;
  /** Stability multiplier applied after each completed review. */
  stabilityGrowth: number;
  /** Ordering of the headword list. */
  order: ReviewOrder;
}

/**
 * Order the available entries for the plan.
 *
 * `list` keeps the dataset order (alphabetical by headword, stable across
 * releases); `length` puts shorter headwords first; `recurrence` puts
 * headwords that appear in more Cambridge volumes first — cross-volume words
 * are the only frequency-like signal the corpus itself publishes. Ties are
 * broken alphabetically with a locale-independent comparison.
 *
 * @param entries - Available entries.
 * @param order - Requested ordering.
 */
export function orderEntries(
  entries: readonly VocabularyEntry[],
  order: ReviewOrder,
): readonly VocabularyEntry[] {
  if (order === 'list') {
    return entries;
  }
  const sorted = [...entries];
  if (order === 'length') {
    sorted.sort((left, right) => left.word.length - right.word.length || compareWords(left.word, right.word));
  } else {
    sorted.sort(
      (left, right) => right.volumes.length - left.volumes.length || compareWords(left.word, right.word),
    );
  }
  return sorted;
}

/**
 * Byte-deterministic ASCII headword comparison.
 *
 * `localeCompare` is ICU-dependent and would break byte-identical
 * reproducibility across Node builds, so ordering compares code points
 * directly.
 *
 * @param left - First headword.
 * @param right - Second headword.
 */
export function compareWords(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

/**
 * Which headwords are scheduled for first study on a given day.
 *
 * Day `d` receives a slice of the ordered scope of size `chunk`, starting at
 * position `(d * newPerDay) mod headwords`. Once every headword has been
 * scheduled (`onePassDays` days), the list is re-walked from the start, so any
 * window length is answerable without state.
 *
 * @param entries - Ordered available entries.
 * @param day - Zero-based day index.
 * @param newPerDay - Requested words per day.
 * @param chunk - Actual words per day (`min(newPerDay, entries.length)`).
 */
export function wordsForDay(
  entries: readonly VocabularyEntry[],
  day: number,
  newPerDay: number,
  chunk: number,
): ScheduledWord[] {
  const start = (day * newPerDay) % Math.max(1, entries.length);
  const scheduled: ScheduledWord[] = [];
  for (let step = 0; step < chunk; step += 1) {
    const entry = entries[(start + step) % entries.length] as VocabularyEntry;
    scheduled.push({ id: entry.id, word: entry.word });
  }
  return scheduled;
}

/**
 * Build the reviews due on one day for words first studied inside the window.
 *
 * A word first studied on day `p` is due again on day `p + g` for every
 * review-day `g` in the spacing ladder. The stability at that review is
 * `stabilityDays * stabilityGrowth^i` where `i` is the number of earlier
 * reviews the word has already completed; retention follows the forgetting
 * curve with that stability and a gap of `g` days. The model assumes every
 * earlier review succeeded — a stateless API cannot know otherwise — which is
 * documented in the response and in RESEARCH.md Part VIII.
 *
 * @param newByDay - Headwords first studied on each window day.
 * @param day - Zero-based day whose due reviews are wanted.
 * @param reviewDays - Spacing ladder.
 * @param stabilityDays - Initial stability in days.
 * @param stabilityGrowth - Stability multiplier per completed review.
 * @returns Due reviews, ordered by review day then headword.
 */
export function reviewsForDay(
  newByDay: readonly (readonly ScheduledWord[] | undefined)[],
  day: number,
  reviewDays: readonly number[],
  stabilityDays: number,
  stabilityGrowth: number,
): DueReview[] {
  const due: DueReview[] = [];
  for (let gapIndex = 0; gapIndex < reviewDays.length; gapIndex += 1) {
    const gap = reviewDays[gapIndex] as number;
    const studiedOn = day - gap;
    if (studiedOn < 0) {
      break;
    }
    const words = newByDay[studiedOn];
    if (words === undefined || words.length === 0) {
      continue;
    }
    const stability = stabilityDays * stabilityGrowth ** gapIndex;
    const retention = roundTo(retentionAfter(gap, stability), RETENTION_PRECISION);
    for (const word of words) {
      due.push({ id: word.id, word: word.word, reviewDay: gap, gapDays: gap, retention });
    }
  }
  return due;
}

/**
 * Build a deterministic review plan over the vocabulary dataset.
 *
 * @param options - Plan options, all pre-validated by the route.
 * @returns The day-by-day plan.
 */
export function buildReviewSchedule(options: ReviewScheduleOptions): ReviewSchedule {
  const ordered = orderEntries(options.entries, options.order);
  const chunk = Math.min(options.newPerDay, Math.max(0, ordered.length));
  const onePassDays = ordered.length === 0 ? 0 : Math.max(1, Math.ceil(ordered.length / chunk));

  const newByDay: (readonly ScheduledWord[] | undefined)[] = [];
  const days: ReviewDay[] = [];
  for (let day = 0; day < options.windowDays; day += 1) {
    const newWords = ordered.length === 0 ? [] : wordsForDay(ordered, day, options.newPerDay, chunk);
    newByDay.push(newWords);
    const reviews = reviewsForDay(
      newByDay,
      day,
      options.reviewDays,
      options.stabilityDays,
      options.stabilityGrowth,
    );
    days.push({
      date: addDays(options.startDate, day),
      index: day,
      new: newWords,
      reviews,
      counts: { new: newWords.length, reviews: reviews.length },
    });
  }

  return {
    window: { from: options.startDate, days: options.windowDays, newPerDay: options.newPerDay },
    scope: { headwords: ordered.length, onePassDays },
    schedule: {
      reviewDays: options.reviewDays,
      stabilityDays: options.stabilityDays,
      stabilityGrowth: options.stabilityGrowth,
      formula: 'R = exp(-reviewDay / (stabilityDays * stabilityGrowth^completedReviews))',
    },
    days,
    totals: {
      newWords: days.reduce((sum, day) => sum + day.counts.new, 0),
      reviews: days.reduce((sum, day) => sum + day.counts.reviews, 0),
    },
  };
}
