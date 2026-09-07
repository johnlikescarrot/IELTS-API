/**
 * Spaced-repetition review scheduling.
 *
 * The scheduler turns a set of headwords into a deterministic review calendar
 * on the exponential-forgetting model introduced by Ebbinghaus (1885) and
 * formalised for language learning by half-life regression (Settles & Meeder,
 * 2016): the probability of recalling a word decays as `2^(-t/H)`, where `H`
 * is the memory's half-life in days. Each scheduled review doubles the
 * half-life — the Leitner assumption — so the next review is due after a
 * longer interval.
 *
 * Two published interval schemes are offered. `ebbinghaus` uses the classic
 * day-level review table (1, 2, 4, 7, 15, 30 days after the learning day);
 * `leitner` doubles the interval at every box (1, 2, 4, 8, 16, 32). The model
 * is a teaching approximation, not a measured learner state: the API is
 * stateless, so retention is predicted from the schedule alone.
 */

/** Day offsets of each scheduled review from the learning day, per scheme. */
export const REVIEW_SCHEDULES = {
  /** The classic Ebbinghaus day-level review table. */
  ebbinghaus: [1, 2, 4, 7, 15, 30],
  /** Leitner-style box doubling: every interval is twice the previous one. */
  leitner: [1, 2, 4, 8, 16, 32],
} as const;

/** Identifier of a supported interval scheme. */
export type ReviewScheme = keyof typeof REVIEW_SCHEDULES;

/** Scheme identifiers, for parameter validation. */
export const REVIEW_SCHEMES = Object.keys(REVIEW_SCHEDULES) as ReviewScheme[];

/**
 * Days after the final review over which retention is projected. One month
 * matches the longest interval of both schemes.
 */
export const RETENTION_HORIZON_DAYS = 30;

/** Round to three decimals: retention is a probability, not a measurement. */
function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Memory half-life, in days, after a number of completed reviews.
 *
 * The half-life doubles with every review (Leitner's boxes): `H(k) = 2^k`,
 * starting from one day for freshly learned material.
 *
 * @param completedReviews - Number of successfully completed reviews.
 */
export function halfLifeDays(completedReviews: number): number {
  return 2 ** completedReviews;
}

/**
 * Predicted retention — the probability of recall — after an elapsed time.
 *
 * @param days - Days elapsed since the memory was last strengthened.
 * @param halfLife - Memory half-life in days.
 */
export function predictedRetention(days: number, halfLife: number): number {
  return round3(2 ** (-days / halfLife));
}

/**
 * The calendar date a number of days after an ISO date.
 *
 * @param isoDate - Anchor date (`YYYY-MM-DD`).
 * @param days - Whole days to add.
 */
export function addDays(isoDate: string, days: number): string {
  return new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

/** One scheduled review of one word. */
export type ReviewEvent = {
  /** 1-based review number within the scheme. */
  stage: number;
  /** Days after the learning day. */
  day: number;
  /** Calendar date of the review. */
  date: string;
  /** Modelled probability of recall immediately before this review. */
  predictedRetention: number;
};

/** The review schedule of a single word. */
export type ReviewWord = {
  /** Stable dataset identifier (`w00001`). */
  id: string;
  /** Headword. */
  word: string;
  /** Scheduled reviews, in chronological order. */
  events: ReviewEvent[];
};

/** Review load of one calendar date. */
export type ReviewCalendarDay = {
  /** Calendar date. */
  date: string;
  /** Number of reviews due on that date, across all words. */
  reviews: number;
};

/** A complete, deterministic review plan. */
export type ReviewPlan = {
  /** Interval scheme used. */
  scheme: ReviewScheme;
  /** Day offsets of the scheme's reviews. */
  intervals: number[];
  /** Learning day (`YYYY-MM-DD`). */
  start: string;
  /**
   * Modelled retention `RETENTION_HORIZON_DAYS` days after the final review,
   * assuming every review succeeds.
   */
  retentionAfterPlan: number;
  /** Per-word schedules. */
  words: ReviewWord[];
  /** Aggregated review load per calendar date, ascending. */
  calendar: ReviewCalendarDay[];
  /** Plan totals. */
  totals: {
    /** Words scheduled. */
    words: number;
    /** Reviews per word. */
    reviewsPerWord: number;
    /** Reviews in total. */
    totalReviews: number;
    /** Date of the first review. */
    firstReview: string;
    /** Date of the last review. */
    lastReview: string;
    /** Days between the learning day and the last review. */
    spanDays: number;
  };
};

/** Options accepted by {@link buildReviewPlan}. */
export type ReviewPlanOptions = {
  /** Entries to schedule; only the identifier and headword are used. */
  entries: readonly { id: string; word: string }[];
  /** Learning day (`YYYY-MM-DD`). */
  start: string;
  /** Interval scheme. */
  scheme: ReviewScheme;
};

/**
 * Build a deterministic spaced-repetition plan for a set of words.
 *
 * @param options - Entries, learning day and scheme.
 * @returns The per-word schedules, the aggregated calendar and the totals.
 */
export function buildReviewPlan(options: ReviewPlanOptions): ReviewPlan {
  const intervals = [...REVIEW_SCHEDULES[options.scheme]];
  const words = options.entries.map((entry) => {
    let previousDay = 0;
    const events = intervals.map((day, index) => {
      const event: ReviewEvent = {
        stage: index + 1,
        day,
        date: addDays(options.start, day),
        predictedRetention: predictedRetention(day - previousDay, halfLifeDays(index)),
      };
      previousDay = day;
      return event;
    });
    return { id: entry.id, word: entry.word, events };
  });

  const load = new Map<string, number>();
  for (const word of words) {
    for (const event of word.events) {
      load.set(event.date, (load.get(event.date) ?? 0) + 1);
    }
  }
  const calendar = [...load.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([date, reviews]) => ({ date, reviews }));

  const first = intervals[0] as number;
  const last = intervals[intervals.length - 1] as number;
  return {
    scheme: options.scheme,
    intervals,
    start: options.start,
    retentionAfterPlan: predictedRetention(RETENTION_HORIZON_DAYS, halfLifeDays(intervals.length)),
    words,
    calendar,
    totals: {
      words: words.length,
      reviewsPerWord: intervals.length,
      totalReviews: words.length * intervals.length,
      firstReview: addDays(options.start, first),
      lastReview: addDays(options.start, last),
      spanDays: last,
    },
  };
}
