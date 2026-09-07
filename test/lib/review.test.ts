import { describe, expect, it } from 'vitest';

import {
  RETENTION_HORIZON_DAYS,
  REVIEW_SCHEDULES,
  REVIEW_SCHEMES,
  addDays,
  buildReviewPlan,
  halfLifeDays,
  predictedRetention,
} from '../../src/lib/review.js';

const ENTRIES = [
  { id: 'w00001', word: 'abandon' },
  { id: 'w02041', word: 'hydrogen' },
];

describe('the review schemes', () => {
  it('publishes the two documented interval tables', () => {
    expect(REVIEW_SCHEMES).toEqual(['ebbinghaus', 'leitner']);
    expect(REVIEW_SCHEDULES.ebbinghaus).toEqual([1, 2, 4, 7, 15, 30]);
    expect(REVIEW_SCHEDULES.leitner).toEqual([1, 2, 4, 8, 16, 32]);
    expect(RETENTION_HORIZON_DAYS).toBe(30);
  });
});

describe('halfLifeDays', () => {
  it('doubles the half-life with every completed review', () => {
    expect(halfLifeDays(0)).toBe(1);
    expect(halfLifeDays(1)).toBe(2);
    expect(halfLifeDays(6)).toBe(64);
  });
});

describe('predictedRetention', () => {
  it('halves at the half-life', () => {
    expect(predictedRetention(1, 1)).toBe(0.5);
    expect(predictedRetention(4, 4)).toBe(0.5);
  });

  it('rounds to three decimals', () => {
    expect(predictedRetention(1, 2)).toBe(0.707);
    expect(predictedRetention(0, 8)).toBe(1);
  });
});

describe('addDays', () => {
  it('advances within a month', () => {
    expect(addDays('2026-03-01', 1)).toBe('2026-03-02');
    expect(addDays('2026-03-01', 0)).toBe('2026-03-01');
  });

  it('crosses month, year and leap-day boundaries', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-01-01', 30)).toBe('2026-01-31');
  });
});

describe('buildReviewPlan', () => {
  it('schedules every interval with predicted retention before each review', () => {
    const plan = buildReviewPlan({ entries: ENTRIES, start: '2026-03-01', scheme: 'ebbinghaus' });
    expect(plan.scheme).toBe('ebbinghaus');
    expect(plan.intervals).toEqual([1, 2, 4, 7, 15, 30]);
    expect(plan.start).toBe('2026-03-01');
    expect(plan.words).toHaveLength(2);
    expect(plan.words[0]).toMatchObject({ id: 'w00001', word: 'abandon' });
    expect(plan.words[0]?.events).toHaveLength(6);
    expect(plan.words[0]?.events[0]).toEqual({
      stage: 1,
      day: 1,
      date: '2026-03-02',
      predictedRetention: 0.5,
    });
    // Gaps between consecutive Ebbinghaus reviews are 1, 1, 2, 3, 8, 15 days
    // against half-lives 1, 2, 4, 8, 16, 32 days.
    expect(plan.words[0]?.events.map((event) => event.predictedRetention)).toEqual([
      0.5, 0.707, 0.707, 0.771, 0.707, 0.723,
    ]);
    expect(plan.words[1]?.events[5]).toEqual({
      stage: 6,
      day: 30,
      date: '2026-03-31',
      predictedRetention: 0.723,
    });
  });

  it('projects retention one horizon after the final review', () => {
    const plan = buildReviewPlan({ entries: ENTRIES, start: '2026-03-01', scheme: 'ebbinghaus' });
    // 30 days after the last review, half-life 2^6 = 64 days: 2^(-30/64).
    expect(plan.retentionAfterPlan).toBe(0.723);
  });

  it('aggregates the review load per calendar date, ascending', () => {
    const plan = buildReviewPlan({ entries: ENTRIES, start: '2026-03-01', scheme: 'ebbinghaus' });
    expect(plan.calendar).toEqual([
      { date: '2026-03-02', reviews: 2 },
      { date: '2026-03-03', reviews: 2 },
      { date: '2026-03-05', reviews: 2 },
      { date: '2026-03-08', reviews: 2 },
      { date: '2026-03-16', reviews: 2 },
      { date: '2026-03-31', reviews: 2 },
    ]);
  });

  it('reports plan totals', () => {
    const plan = buildReviewPlan({ entries: ENTRIES, start: '2026-03-01', scheme: 'ebbinghaus' });
    expect(plan.totals).toEqual({
      words: 2,
      reviewsPerWord: 6,
      totalReviews: 12,
      firstReview: '2026-03-02',
      lastReview: '2026-03-31',
      spanDays: 30,
    });
  });

  it('schedules the Leitner scheme with doubled intervals', () => {
    const plan = buildReviewPlan({ entries: [ENTRIES[0]!], start: '2026-03-01', scheme: 'leitner' });
    expect(plan.intervals).toEqual([1, 2, 4, 8, 16, 32]);
    // Every Leitner gap equals the running half-life, so retention is constant.
    expect(plan.words[0]?.events.map((event) => event.predictedRetention)).toEqual([
      0.5, 0.707, 0.707, 0.707, 0.707, 0.707,
    ]);
    expect(plan.totals.lastReview).toBe('2026-04-02');
    expect(plan.totals.spanDays).toBe(32);
    expect(plan.calendar.every((day) => day.reviews === 1)).toBe(true);
  });
});
