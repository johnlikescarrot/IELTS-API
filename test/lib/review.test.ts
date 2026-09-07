import { describe, expect, it } from 'vitest';

import {
  DEFAULT_REVIEW_DAYS,
  DEFAULT_STABILITY_DAYS,
  DEFAULT_STABILITY_GROWTH,
  addDays,
  buildReviewSchedule,
  compareWords,
  daysUntilRetention,
  orderEntries,
  retentionAfter,
  retentionResult,
  reviewsForDay,
  roundTo,
  wordsForDay,
} from '../../src/lib/review.js';

import type { PartOfSpeech, ScheduledWord, VocabularyEntry } from '../../src/types.js';

/** Build a minimal vocabulary entry for scheduling tests. */
function entry(id: string, word: string, volumes: number[], pos: PartOfSpeech = 'noun'): VocabularyEntry {
  return {
    id,
    word,
    phonetic: null,
    partOfSpeech: pos,
    definition: `definition of ${word}`,
    senses: [{ pos, text: `definition of ${word}` }],
    morphemes: null,
    volumes,
  };
}

const A = entry('w00001', 'alpha', [1, 2]);
const B = entry('w00002', 'beta', [2]);
const C = entry('w00003', 'gamma', [1, 2, 3]);
const D = entry('w00004', 'delta', [4]);
const E = entry('w00005', 'epsilon', [1, 2, 3, 4]);

describe('rounding', () => {
  it('rounds to a fixed number of decimals', () => {
    expect(roundTo(0.123456789, 4)).toBe(0.1235);
    expect(roundTo(1.005, 2)).toBe(1.01);
    expect(roundTo(3.14159, 2)).toBe(3.14);
  });
});

describe('the exponential forgetting curve', () => {
  it('predicts full retention at zero elapsed days', () => {
    expect(retentionAfter(0, 1)).toBe(1);
  });

  it('evaluates exp(-days / stability)', () => {
    expect(retentionAfter(1, DEFAULT_STABILITY_DAYS)).toBeCloseTo(Math.exp(-1), 10);
    expect(retentionAfter(2, 2)).toBeCloseTo(Math.exp(-1), 10);
    expect(retentionAfter(7, 7)).toBeCloseTo(Math.exp(-1), 10);
    expect(retentionAfter(30, 1)).toBeCloseTo(Math.exp(-30), 10);
  });

  it('inverts the curve for a target retention', () => {
    expect(daysUntilRetention(0.5, 2)).toBeCloseTo(-2 * Math.log(0.5), 10);
    expect(daysUntilRetention(0.34, 1)).toBeCloseTo(1.0788, 3);
  });
});

describe('retentionResult', () => {
  it('reports the retention, half-life and formula at the requested point', () => {
    const result = retentionResult(7, 7, undefined);
    expect(result.formula).toBe('R = exp(-days / stabilityDays)');
    expect(result.days).toBe(7);
    expect(result.stabilityDays).toBe(7);
    expect(result.retention).toBe(0.3679);
    expect(result.halfLifeDays).toBeCloseTo(7 * Math.LN2, 2);
    expect(result.target).toBeNull();
  });

  it('reports the largest whole day above a target when one is given', () => {
    const result = retentionResult(7, 7, 0.5);
    const expected = -7 * Math.log(0.5);
    expect(result.target).toEqual({
      retention: 0.5,
      daysUntil: Math.round((expected + Number.EPSILON) * 100) / 100,
      lastWholeDay: Math.floor(expected),
      retentionAtLastWholeDay: Math.round(Math.exp(-Math.floor(expected) / 7) * 10000) / 10000,
    });
  });

  it('keeps a very near-term target on whole day zero', () => {
    const result = retentionResult(0, 0.05, 0.999);
    expect(result.target?.lastWholeDay).toBe(0);
    expect(result.target?.retentionAtLastWholeDay).toBe(1);
  });
});

describe('addDays', () => {
  it('shifts dates across month boundaries in UTC', () => {
    expect(addDays('2026-09-07', 0)).toBe('2026-09-07');
    expect(addDays('2026-09-07', 30)).toBe('2026-10-07');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('respects leap years', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2024-02-28', 2)).toBe('2024-03-01');
  });
});

describe('compareWords', () => {
  it('compares headwords by code point', () => {
    expect(compareWords('alpha', 'beta')).toBe(-1);
    expect(compareWords('beta', 'alpha')).toBe(1);
    expect(compareWords('alpha', 'alpha')).toBe(0);
  });
});

describe('orderEntries', () => {
  it('keeps dataset order for the list ordering', () => {
    const entries = [B, A, E];
    expect(orderEntries(entries, 'list')).toBe(entries);
  });

  it('orders by length with word tie-breaks', () => {
    const words = [A, B, C, D];
    expect(orderEntries(words, 'length').map((e) => e.word)).toEqual(['beta', 'alpha', 'delta', 'gamma']);
  });

  it('orders by cross-volume recurrence, most volumes first', () => {
    const entries = [A, B, C, D, E];
    expect(orderEntries(entries, 'recurrence').map((e) => e.word)).toEqual([
      'epsilon',
      'gamma',
      'alpha',
      'beta',
      'delta',
    ]);
  });
});

describe('wordsForDay', () => {
  it('assigns a deterministic slice of the ordered scope to each day', () => {
    const entries = [A, B, C, D, E];
    expect(wordsForDay(entries, 0, 2, 2).map((w) => w.word)).toEqual(['alpha', 'beta']);
    expect(wordsForDay(entries, 1, 2, 2).map((w) => w.word)).toEqual(['gamma', 'delta']);
  });

  it('cycles the scope once every day after one pass', () => {
    const entries = [A, B, C, D, E];
    expect(wordsForDay(entries, 2, 2, 2).map((w) => w.word)).toEqual(['epsilon', 'alpha']);
    // Day 5 starts at (5 * 2) mod 5 = 0 again: the second pass begins.
    expect(wordsForDay(entries, 5, 2, 2).map((w) => w.word)).toEqual(['alpha', 'beta']);
  });

  it('caps the daily slice at the scope size', () => {
    const entries = [A, B, C];
    expect(wordsForDay(entries, 0, 10, 3).map((w) => w.word)).toEqual(['alpha', 'beta', 'gamma']);
    // Day 1 starts at (1 * 10) mod 3 = 1, so the whole scope rotates.
    expect(wordsForDay(entries, 1, 10, 3).map((w) => w.word)).toEqual(['beta', 'gamma', 'alpha']);
  });
});

describe('reviewsForDay', () => {
  const ladder = [1, 2, 4];

  /** One day of newly studied words, as produced by {@link wordsForDay}. */
  const one = (words: ScheduledWord[]): readonly ScheduledWord[] => words;

  it('schedules no reviews on days before the first gap has elapsed', () => {
    const newByDay = [one([{ id: A.id, word: A.word }])];
    expect(reviewsForDay(newByDay, 0, ladder, 1, 2)).toEqual([]);
  });

  it('skips days with no studied words', () => {
    const newByDay: (readonly ScheduledWord[] | undefined)[] = [
      one([{ id: A.id, word: A.word }]),
      undefined,
      undefined,
    ];
    // Day 3: gap 1 points at an unset day (skipped), gap 3 at day 0 (due).
    const due = reviewsForDay(newByDay, 3, [1, 3], 1, 2);
    expect(due.map((review) => review.word)).toEqual(['alpha']);
  });

  it('uses the current stability for each ladder position', () => {
    const newByDay = [one([{ id: A.id, word: A.word }])];
    // gap 3 at ladder index 1 => stability 1 * 2^1 = 2 => R = exp(-3/2).
    const due = reviewsForDay(newByDay, 3, [1, 3], 1, 2);
    expect(due).toEqual([{ id: 'w00001', word: 'alpha', reviewDay: 3, gapDays: 3, retention: 0.2231 }]);
  });

  it('assembles reviews from every earlier study day whose gap is on the ladder', () => {
    const newByDay = [
      one([{ id: A.id, word: A.word }]),
      one([{ id: B.id, word: B.word }]),
      one([{ id: C.id, word: C.word }]),
    ];
    const due = reviewsForDay(newByDay, 2, [1, 2], 1, 2);
    // Day 1 words at gap 1 (stability 1) and day 0 words at gap 2 (stability 2).
    expect(due.map((review) => [review.word, review.reviewDay])).toEqual([
      ['beta', 1],
      ['alpha', 2],
    ]);
    expect(due[0]?.retention).toBe(0.3679);
    expect(due[1]?.retention).toBe(0.3679);
  });
});

describe('buildReviewSchedule', () => {
  it('plans new words and reviews across the window with a one-pass cycle', () => {
    const schedule = buildReviewSchedule({
      startDate: '2026-09-07',
      windowDays: 8,
      newPerDay: 1,
      entries: [A, B, C],
      reviewDays: [1, 2],
      stabilityDays: 1,
      stabilityGrowth: 2,
      order: 'list',
    });

    expect(schedule.window).toEqual({ from: '2026-09-07', days: 8, newPerDay: 1 });
    expect(schedule.scope).toEqual({ headwords: 3, onePassDays: 3 });
    expect(schedule.schedule).toEqual({
      reviewDays: [1, 2],
      stabilityDays: 1,
      stabilityGrowth: 2,
      formula: 'R = exp(-reviewDay / (stabilityDays * stabilityGrowth^completedReviews))',
    });
    expect(schedule.days[0]?.new.map((word) => word.word)).toEqual(['alpha']);
    expect(schedule.days[1]?.new.map((word) => word.word)).toEqual(['beta']);
    expect(schedule.days[2]?.new.map((word) => word.word)).toEqual(['gamma']);
    // Day 3 wraps back to the start of the list.
    expect(schedule.days[3]?.new.map((word) => word.word)).toEqual(['alpha']);
    expect(schedule.days[3]?.date).toBe('2026-09-10');

    const reviewsByDay = schedule.days.map((day) => day.reviews.map((review) => review.word));
    expect(reviewsByDay[0]).toEqual([]);
    expect(reviewsByDay[1]).toEqual(['alpha']);
    expect(reviewsByDay[2]).toEqual(['beta', 'alpha']);
    expect(reviewsByDay[3]).toEqual(['gamma', 'beta']);
    expect(schedule.totals.newWords).toBe(8);
    expect(schedule.totals.reviews).toBe(13);
    expect(schedule.days.every((day) => day.counts.new === 1)).toBe(true);
  });

  it('produces identical schedules for identical inputs', () => {
    const options = {
      startDate: '2026-09-07',
      windowDays: 7,
      newPerDay: 10,
      entries: [A, B, C, D, E],
      reviewDays: [...DEFAULT_REVIEW_DAYS],
      stabilityDays: DEFAULT_STABILITY_DAYS,
      stabilityGrowth: DEFAULT_STABILITY_GROWTH,
      order: 'list' as const,
    };
    expect(JSON.stringify(buildReviewSchedule(options))).toBe(JSON.stringify(buildReviewSchedule(options)));
  });

  it('answers an empty scope with an empty plan', () => {
    const schedule = buildReviewSchedule({
      startDate: '2026-09-07',
      windowDays: 3,
      newPerDay: 10,
      entries: [],
      reviewDays: [1],
      stabilityDays: 1,
      stabilityGrowth: 2,
      order: 'list',
    });
    expect(schedule.scope).toEqual({ headwords: 0, onePassDays: 0 });
    expect(schedule.days).toHaveLength(3);
    expect(schedule.days[0]?.new).toEqual([]);
    expect(schedule.totals).toEqual({ newWords: 0, reviews: 0 });
  });
});
