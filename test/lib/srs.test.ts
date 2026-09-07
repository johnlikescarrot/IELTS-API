import { describe, expect, it } from 'vitest';

import {
  SRS_INTERVALS_MINUTES,
  SRS_MASTERED_AT,
  buildSrsSchedule,
  isoUtc,
  nextReviewOffsetMinutes,
  reviewSchedule,
  reviewWindow,
  srsStatusFor,
  updateMastery,
} from '../../src/lib/srs.js';

const ANCHOR = '2026-09-07';
const TIME = '20:00';
const ANCHOR_MS = Date.parse(`${ANCHOR}T${TIME}:00Z`);

describe('srsStatusFor', () => {
  it('reports new before the first review whatever the mastery', () => {
    expect(srsStatusFor(0, 0)).toBe('new');
    expect(srsStatusFor(0, 95)).toBe('new');
  });

  it('reports mastered at mastery 90 and above', () => {
    expect(SRS_MASTERED_AT).toBe(90);
    expect(srsStatusFor(2, 90)).toBe('mastered');
    expect(srsStatusFor(2, 95)).toBe('mastered');
  });

  it('reports learning between the first review and mastery', () => {
    expect(srsStatusFor(1, 0)).toBe('learning');
    expect(srsStatusFor(2, 89.99)).toBe('learning');
  });
});

describe('updateMastery', () => {
  it('rewards correct recalls by confidence', () => {
    expect(updateMastery(50, true, 3)).toBe(65);
    expect(updateMastery(50, true, 5)).toBe(75);
  });

  it('punishes misses harder than it rewards recalls', () => {
    expect(updateMastery(50, false, 3)).toBe(26);
    expect(updateMastery(50, false, 5)).toBe(10);
  });

  it('clamps the projection to 0-100', () => {
    expect(updateMastery(99, true, 1)).toBe(100);
    expect(updateMastery(1, false, 1)).toBe(0);
  });
});

describe('nextReviewOffsetMinutes', () => {
  it('walks the Ebbinghaus ladder step by step', () => {
    expect(SRS_INTERVALS_MINUTES).toEqual([5, 30, 720, 1440, 2880, 5760, 10080, 21600]);
    expect(nextReviewOffsetMinutes(0, 0)).toBe(5);
    expect(nextReviewOffsetMinutes(1, 0)).toBe(30);
    expect(nextReviewOffsetMinutes(7, 0)).toBe(21600);
  });

  it('extends the last interval by mastery past the ladder', () => {
    expect(nextReviewOffsetMinutes(8, 0)).toBe(21600);
    expect(nextReviewOffsetMinutes(8, 50)).toBe(32400);
    expect(nextReviewOffsetMinutes(10, 100)).toBe(43200);
  });
});

describe('isoUtc', () => {
  it('formats an epoch as an ISO UTC datetime', () => {
    expect(isoUtc(0)).toBe('1970-01-01T00:00:00.000Z');
    expect(isoUtc(ANCHOR_MS)).toBe('2026-09-07T20:00:00.000Z');
  });
});

describe('reviewSchedule', () => {
  it('applies the ladder cumulatively from the anchor', () => {
    expect(reviewSchedule(ANCHOR_MS, 0, 3)).toEqual([
      { review: 1, intervalMinutes: 5, cumulativeMinutes: 5, due: '2026-09-07T20:05:00.000Z' },
      { review: 2, intervalMinutes: 30, cumulativeMinutes: 35, due: '2026-09-07T20:35:00.000Z' },
      { review: 3, intervalMinutes: 720, cumulativeMinutes: 755, due: '2026-09-08T08:35:00.000Z' },
    ]);
  });

  it('extends the last interval by mastery past the eighth step', () => {
    const schedule = reviewSchedule(ANCHOR_MS, 50, 9);
    expect(schedule).toHaveLength(9);
    const last = schedule[8] as { intervalMinutes: number; cumulativeMinutes: number };
    expect(last.intervalMinutes).toBe(32400);
    expect(last.cumulativeMinutes).toBe(42515 + 32400);
  });
});

describe('reviewWindow', () => {
  it('spans two hours on either side of the review time', () => {
    expect(reviewWindow('2026-09-07', '20:00')).toEqual({
      start: '2026-09-07T18:00:00.000Z',
      end: '2026-09-07T22:00:00.000Z',
    });
  });
});

describe('buildSrsSchedule', () => {
  it('builds the full schedule for a new word', () => {
    const schedule = buildSrsSchedule({
      reviews: 0,
      mastery: 0,
      date: ANCHOR,
      time: TIME,
      steps: 8,
      recall: undefined,
    });
    expect(schedule.anchor).toBe('2026-09-07T20:00:00.000Z');
    expect(schedule.status).toBe('new');
    expect(schedule.nextReviewInMinutes).toBe(5);
    expect(schedule.nextReviewAt).toBe('2026-09-07T20:05:00.000Z');
    expect(schedule.ladderMinutes).toHaveLength(8);
    expect(schedule.upcoming).toHaveLength(8);
    expect(schedule.upcoming[0]).toMatchObject({ review: 1, cumulativeMinutes: 5 });
    expect(schedule.reviewWindow).toEqual({
      date: ANCHOR,
      time: TIME,
      start: '2026-09-07T18:00:00.000Z',
      end: '2026-09-07T22:00:00.000Z',
    });
    expect(schedule.masteryProjection).toBeNull();
  });

  it('projects mastery after a reported correct recall', () => {
    const schedule = buildSrsSchedule({
      reviews: 3,
      mastery: 70,
      date: ANCHOR,
      time: TIME,
      steps: 2,
      recall: { correct: true, confidence: 4 },
    });
    expect(schedule.status).toBe('learning');
    expect(schedule.nextReviewInMinutes).toBe(1440);
    expect(schedule.masteryProjection).toEqual({
      correct: true,
      confidence: 4,
      from: 70,
      to: 90,
      status: 'mastered',
    });
  });

  it('projects mastery after a reported miss', () => {
    const schedule = buildSrsSchedule({
      reviews: 3,
      mastery: 70,
      date: ANCHOR,
      time: TIME,
      steps: 2,
      recall: { correct: false, confidence: 2 },
    });
    expect(schedule.masteryProjection).toEqual({
      correct: false,
      confidence: 2,
      from: 70,
      to: 54,
      status: 'learning',
    });
  });
});
