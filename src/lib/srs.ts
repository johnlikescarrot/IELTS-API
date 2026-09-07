/**
 * Stateless spaced repetition (Ebbinghaus) scheduling.
 *
 * The model here is a faithful, dependency-free reimplementation of the
 * scheduler published by the open IELTS memorisation system
 * <https://github.com/Iamdacai/ielts-vocab-system>: an Ebbinghaus forgetting-curve
 * ladder of review intervals, a confidence-weighted mastery score, and a
 * day-granular revision of the ladder adopted upstream on 2026-03-22. The API
 * keeps no learner state: a client stores `(reviewCount, mastery)` per word and
 * asks these pure functions what to do next, so schedules stay deterministic,
 * cacheable and citable.
 */

/** The two published ladders: the original and the 2026-03-22 day revision. */
export type SrsLadderId = 'classic' | 'wheel';

/** Review intervals in minutes for the classic Ebbinghaus ladder. */
export const CLASSIC_INTERVAL_MINUTES: readonly number[] = [5, 30, 720, 1440, 2880, 5760, 10080, 21600];

/** Review intervals in days for the day-granular ladder. */
export const WHEEL_INTERVAL_DAYS: readonly number[] = [1, 2, 4, 7, 15, 21, 30, 30];

/** Mastery at or above which a word counts as mastered (upstream rule). */
export const MASTERED_AT_MASTERY = 90;

/** Mastery points per point of self-rated confidence on a correct answer. */
export const MASTERY_GAIN_PER_CONFIDENCE = 5;

/** Mastery points per point of self-rated confidence on an incorrect answer. */
export const MASTERY_LOSS_PER_CONFIDENCE = 8;

/** Half-width of the daily review window, in hours (upstream rule). */
export const REVIEW_WINDOW_HOURS = 2;

/** Bounds of the mastery scale. */
export const MAX_MASTERY = 100;

/** Number of ladder stages; past these, intervals grow from the last rung. */
export const LADDER_STAGES = CLASSIC_INTERVAL_MINUTES.length;

/** Interval table of a ladder, in minutes. */
export function ladderMinutes(ladder: SrsLadderId): number[] {
  if (ladder === 'wheel') {
    return WHEEL_INTERVAL_DAYS.map((days) => days * 1440);
  }
  return [...CLASSIC_INTERVAL_MINUTES];
}

/**
 * Interval, in minutes, before the review after `reviewCount` successful
 * reviews. Past the last rung of the ladder the interval extends with mastery,
 * `last × (1 + mastery / 100)` - the upstream adjustment that makes near-
 * perfect words rarer and shaky ones frequent again.
 *
 * @param ladder - Which published ladder to use.
 * @param reviewCount - Completed reviews of this word (0 for a new word).
 * @param mastery - Current mastery score, 0-100.
 */
export function intervalMinutes(ladder: SrsLadderId, reviewCount: number, mastery: number): number {
  const intervals = ladderMinutes(ladder);
  if (reviewCount < intervals.length) {
    return intervals[reviewCount] as number;
  }
  return (intervals[intervals.length - 1] as number) * (1 + mastery / MAX_MASTERY);
}

/** Ladder offsets in whole days: cumulative intervals rounded up to the day. */
export function ladderDueDays(ladder: SrsLadderId): number[] {
  let cumulative = 0;
  return ladderMinutes(ladder).map((minutes) => {
    cumulative += minutes;
    return Math.ceil(cumulative / 1440);
  });
}

/**
 * Grade one review against a mastery score, upstream style: a correct answer
 * gains `confidence × 5`, a wrong one loses `confidence × 8`, the result is
 * clamped to 0-100 and kept to two decimals.
 *
 * @param mastery - Mastery before the review, 0-100.
 * @param correct - Whether the recall attempt succeeded.
 * @param confidence - Self-rated confidence, 1-5.
 */
export function updateMastery(mastery: number, correct: boolean, confidence: number): number {
  const delta = correct
    ? confidence * MASTERY_GAIN_PER_CONFIDENCE
    : -confidence * MASTERY_LOSS_PER_CONFIDENCE;
  const clamped = Math.min(MAX_MASTERY, Math.max(0, mastery + delta));
  return Math.round(clamped * 100) / 100;
}

/** Learner-facing progress status, using the upstream mastered threshold. */
export type SrsStatus = 'new' | 'learning' | 'mastered';

/**
 * Map `(reviewCount, mastery)` to the progress status. A word stays `new`
 * until its first review is recorded; at or above the mastered threshold it is
 * `mastered`; the upstream state machine's third state (`forgotten`, allowed by
 * its schema but never written) is not part of the contract.
 *
 * @param reviewCount - Completed reviews of this word.
 * @param mastery - Current mastery score, 0-100.
 */
export function progressStatus(reviewCount: number, mastery: number): SrsStatus {
  if (reviewCount <= 0 && mastery <= 0) {
    return 'new';
  }
  return mastery >= MASTERED_AT_MASTERY ? 'mastered' : 'learning';
}

/** Next-review computation for one word. */
export type SrsNextReview = {
  /** Ladder used. */
  ladder: SrsLadderId;
  /** Reviews already completed for the word. */
  reviewCount: number;
  /** Mastery score assumed for interval growth past the ladder. */
  mastery: number;
  /** Minutes until the next review. */
  intervalMinutes: number;
  /** ISO timestamp of the due moment. */
  nextReviewAt: string;
};

/**
 * Compute when a word is next due.
 *
 * @param ladder - Which published ladder to use.
 * @param reviewCount - Completed reviews of this word.
 * @param mastery - Current mastery score, 0-100.
 * @param fromMs - Epoch milliseconds of the review just completed.
 */
export function nextReview(
  ladder: SrsLadderId,
  reviewCount: number,
  mastery: number,
  fromMs: number,
): SrsNextReview {
  const interval = intervalMinutes(ladder, reviewCount, mastery);
  return {
    ladder,
    reviewCount,
    mastery,
    intervalMinutes: Math.round(interval * 100) / 100,
    nextReviewAt: new Date(fromMs + interval * 60_000).toISOString(),
  };
}

/** The ±2-hour daily window around a review time, upstream style. */
export type SrsWindow = {
  /** The date the window sits on (YYYY-MM-DD). */
  date: string;
  /** The configured review time (HH:MM). */
  time: string;
  /** ISO timestamp opening the window. */
  start: string;
  /** ISO timestamp closing the window. */
  end: string;
};

/**
 * Center a review window on `date` at `time` (UTC), extending it by
 * {@link REVIEW_WINDOW_HOURS} in both directions.
 *
 * @param date - Calendar date of the study day.
 * @param time - Review time of day, `HH:MM`.
 */
export function reviewWindow(date: string, time: string): SrsWindow {
  const [hours, minutes] = time.split(':').map((part) => Number.parseInt(part, 10));
  const anchorMs = Date.UTC(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10)),
    hours as number,
    minutes as number,
  );
  const spanMs = REVIEW_WINDOW_HOURS * 3_600_000;
  return {
    date,
    time,
    start: new Date(anchorMs - spanMs).toISOString(),
    end: new Date(anchorMs + spanMs).toISOString(),
  };
}

/** One projected study day. */
export type SrsProjectionDay = {
  /** Zero-based day index from the plan start. */
  day: number;
  /** Calendar date of the day. */
  date: string;
  /** New words introduced that day. */
  newWords: number;
  /** Reviews falling due that day. */
  reviews: number;
  /** New words plus reviews. */
  total: number;
};

/** Aggregates over the full (untruncated) projection. */
export type SrsProjectionSummary = {
  /** Days on which new words are introduced. */
  studyDays: number;
  /** Day index on which the last scheduled review falls. */
  lastActivityDay: number;
  /** Calendar date of the last scheduled review. */
  completionDate: string;
  /** Ladder stages every word passes through. */
  stages: number;
  /** Words × stages: one review per word per ladder stage. */
  totalReviews: number;
  /** Mean reviews per calendar day across the whole projection. */
  meanReviewsPerDay: number;
  /** Day with the largest combined workload. */
  peak: { day: number; date: string; newWords: number; reviews: number; total: number };
  /** Peak-day workload divided by the daily new-word quota. */
  peakMultiplier: number;
};

/** A projected Ebbinghaus study schedule. */
export type SrsProjection = {
  /** Calendar date the projection starts on. */
  start: string;
  /** Ladder used for due dates. */
  ladder: SrsLadderId;
  /** New words introduced per study day. */
  wordsPerDay: number;
  /** Ladder stage offsets in whole days, learning day included. */
  dueDays: number[];
  /** Days before the projection is truncated for readability. */
  horizonDays: number;
  /** The first `horizonDays` of the schedule. */
  days: SrsProjectionDay[];
  /** Aggregates over the full schedule. */
  summary: SrsProjectionSummary;
};

/** Epoch milliseconds of a UTC calendar date (YYYY-MM-DD). */
function dayMs(date: string): number {
  return Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)));
}

/** ISO calendar date `offset` days after `startMs`. */
function dateAfter(startMs: number, offsetDays: number): string {
  return new Date(startMs + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Project a whole wordbook through an Ebbinghaus schedule and return the daily
 * workload. Words learned on day `d` are reviewed on `d + Δ` for each ladder
 * stage offset `Δ` (sub-day stages collapse onto their due day); a study day is
 * added every day until the book is exhausted. The result is a pure function of
 * its arguments.
 *
 * @param options - Book size, daily quota, ladder, start date, horizon.
 */
export function projectSchedule(options: {
  /** Words in the book. */
  words: number;
  /** New words per study day. */
  perDay: number;
  /** Ladder whose day-collapsed offsets drive the reviews. */
  ladder: SrsLadderId;
  /** Start date (YYYY-MM-DD). */
  start: string;
  /** Days of per-day detail to return (aggregates cover the whole plan). */
  horizon: number;
}): SrsProjection {
  const { words, perDay, ladder, start, horizon } = options;
  const offsets = ladderDueDays(ladder);
  const studyDays = Math.ceil(words / perDay);

  const newByDay = new Array<number>(studyDays).fill(0);
  for (let day = 0; day < studyDays; day += 1) {
    newByDay[day] = Math.min(perDay, words - day * perDay);
  }
  const reviewsByDay = new Array<number>(studyDays - 1 + (offsets[offsets.length - 1] as number) + 1).fill(0);
  for (let day = 0; day < studyDays; day += 1) {
    const count = newByDay[day] as number;
    for (const offset of offsets) {
      reviewsByDay[day + offset] = (reviewsByDay[day + offset] as number) + count;
    }
  }

  const startMs = dayMs(start);
  const lastActivityDay = reviewsByDay.length - 1;
  let peak = {
    day: 0,
    date: dateAfter(startMs, 0),
    newWords: newByDay[0] as number,
    reviews: 0,
    total: newByDay[0] as number,
  };
  let reviewSum = 0;
  for (let day = 0; day <= lastActivityDay; day += 1) {
    const newWords = day < studyDays ? (newByDay[day] as number) : 0;
    const reviews = reviewsByDay[day] as number;
    reviewSum += reviews;
    const total = newWords + reviews;
    if (total > peak.total) {
      peak = { day, date: dateAfter(startMs, day), newWords, reviews, total };
    }
  }
  const days: SrsProjectionDay[] = [];
  for (let day = 0; day <= lastActivityDay && day < horizon; day += 1) {
    const newWords = day < studyDays ? (newByDay[day] as number) : 0;
    const reviews = reviewsByDay[day] as number;
    days.push({ day, date: dateAfter(startMs, day), newWords, reviews, total: newWords + reviews });
  }

  return {
    start,
    ladder,
    wordsPerDay: perDay,
    dueDays: offsets,
    horizonDays: Math.min(horizon, lastActivityDay + 1),
    days,
    summary: {
      studyDays,
      lastActivityDay,
      completionDate: dateAfter(startMs, lastActivityDay),
      stages: offsets.length,
      totalReviews: words * offsets.length,
      meanReviewsPerDay: Math.round((reviewSum / (lastActivityDay + 1)) * 100) / 100,
      peak,
      peakMultiplier: Math.round((peak.total / perDay) * 100) / 100,
    },
  };
}
