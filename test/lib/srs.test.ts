import { describe, expect, it } from 'vitest';

import {
  CLASSIC_INTERVAL_MINUTES,
  WHEEL_INTERVAL_DAYS,
  intervalMinutes,
  ladderDueDays,
  ladderMinutes,
  nextReview,
  progressStatus,
  projectSchedule,
  reviewWindow,
  updateMastery,
} from '../../src/lib/srs.js';

describe('ladder tables', () => {
  it('serves the classic ladder in minutes', () => {
    expect(ladderMinutes('classic')).toEqual([...CLASSIC_INTERVAL_MINUTES]);
    expect(ladderMinutes('classic')).not.toBe(CLASSIC_INTERVAL_MINUTES);
  });

  it('converts the wheel ladder from days to minutes', () => {
    expect(ladderMinutes('wheel')).toEqual(WHEEL_INTERVAL_DAYS.map((days) => days * 1440));
  });

  it('takes the rung of the ladder while stages remain', () => {
    expect(intervalMinutes('classic', 0, 0)).toBe(5);
    expect(intervalMinutes('classic', 1, 100)).toBe(30);
    expect(intervalMinutes('wheel', 7, 0)).toBe(30 * 1440);
  });

  it('grows the last rung with mastery past the ladder', () => {
    expect(intervalMinutes('classic', 8, 0)).toBe(21600);
    expect(intervalMinutes('classic', 8, 100)).toBe(43200);
    expect(intervalMinutes('classic', 9, 50)).toBe(21600 * 1.5);
    expect(intervalMinutes('wheel', 8, 40)).toBe(43200 * 1.4);
  });

  it('collapses ladder stages onto whole due days', () => {
    expect(ladderDueDays('classic')).toEqual([1, 1, 1, 2, 4, 8, 15, 30]);
    expect(ladderDueDays('wheel')).toEqual([1, 3, 7, 14, 29, 50, 80, 110]);
  });
});

describe('updateMastery', () => {
  it('gains confidence times five when correct and loses eight when wrong', () => {
    expect(updateMastery(40, true, 3)).toBe(55);
    expect(updateMastery(40, false, 3)).toBe(16);
    expect(updateMastery(33.33, true, 3)).toBe(48.33);
  });

  it('clamps to the 0-100 scale', () => {
    expect(updateMastery(95, true, 5)).toBe(100);
    expect(updateMastery(5, false, 5)).toBe(0);
    expect(updateMastery(0, false, 1)).toBe(0);
  });
});

describe('progressStatus', () => {
  it('mirrors the upstream state machine without its dead branches', () => {
    expect(progressStatus(0, 0)).toBe('new');
    expect(progressStatus(0, 0.5)).toBe('learning');
    expect(progressStatus(3, 89.99)).toBe('learning');
    expect(progressStatus(3, 90)).toBe('mastered');
    expect(progressStatus(1, 0)).toBe('learning');
  });
});

describe('nextReview', () => {
  const anchor = Date.UTC(2026, 0, 1);

  it('steps the ladder from the anchor', () => {
    const result = nextReview('classic', 0, 0, anchor);
    expect(result.intervalMinutes).toBe(5);
    expect(result.nextReviewAt).toBe('2026-01-01T00:05:00.000Z');
    expect(result.ladder).toBe('classic');
    expect(result.reviewCount).toBe(0);
    expect(result.mastery).toBe(0);
  });

  it('extends the last rung with mastery', () => {
    expect(nextReview('classic', 8, 100, anchor).nextReviewAt).toBe('2026-01-31T00:00:00.000Z');
    const extended = nextReview('classic', 9, 50, anchor);
    expect(extended.intervalMinutes).toBe(32400);
    expect(extended.nextReviewAt).toBe('2026-01-23T12:00:00.000Z');
  });
});

describe('reviewWindow', () => {
  it('centres a ±2-hour window on the chosen time', () => {
    const window = reviewWindow('2026-05-04', '07:30');
    expect(window.start).toBe('2026-05-04T05:30:00.000Z');
    expect(window.end).toBe('2026-05-04T09:30:00.000Z');
    expect(window.date).toBe('2026-05-04');
    expect(window.time).toBe('07:30');
  });

  it('spans midnight when the window starts before daybreak', () => {
    const window = reviewWindow('2026-01-01', '00:00');
    expect(window.start).toBe('2025-12-31T22:00:00.000Z');
    expect(window.end).toBe('2026-01-01T02:00:00.000Z');
  });
});

describe('projectSchedule', () => {
  it('runs a whole day-one cohort through the wheel', () => {
    const plan = projectSchedule({ words: 2, perDay: 2, ladder: 'wheel', start: '2026-01-01', horizon: 400 });
    expect(plan.summary.studyDays).toBe(1);
    expect(plan.summary.totalReviews).toBe(16);
    expect(plan.summary.lastActivityDay).toBe(110);
    expect(plan.summary.completionDate).toBe('2026-04-21');
    expect(plan.horizonDays).toBe(111);
    expect(plan.days).toHaveLength(111);
    expect(plan.days[0]).toEqual({
      day: 0,
      date: '2026-01-01',
      newWords: 2,
      reviews: 0,
      total: 2,
    });
    expect(plan.days[1]).toEqual({ day: 1, date: '2026-01-02', newWords: 0, reviews: 2, total: 2 });
    expect(plan.days[2]?.reviews).toBe(0);
    expect(plan.summary.peak).toEqual({ day: 0, date: '2026-01-01', newWords: 2, reviews: 0, total: 2 });
    expect(plan.summary.meanReviewsPerDay).toBe(Math.round((16 / 111) * 100) / 100);
    expect(plan.summary.peakMultiplier).toBe(1);
  });

  it('staggered cohorts pile up on the first review days', () => {
    const plan = projectSchedule({
      words: 25,
      perDay: 10,
      ladder: 'wheel',
      start: '2026-01-01',
      horizon: 42,
    });
    expect(plan.dueDays).toEqual([1, 3, 7, 14, 29, 50, 80, 110]);
    expect(plan.summary.studyDays).toBe(3);
    expect(plan.days[0]?.newWords).toBe(10);
    expect(plan.days[1]?.newWords).toBe(10);
    expect(plan.days[1]?.reviews).toBe(10);
    expect(plan.days[2]?.newWords).toBe(5);
    expect(plan.days[3]?.reviews).toBe(15);
    expect(plan.summary.lastActivityDay).toBe(112);
    expect(plan.summary.completionDate).toBe('2026-04-23');
    expect(plan.summary.peak).toEqual({ day: 1, date: '2026-01-02', newWords: 10, reviews: 10, total: 20 });
    expect(plan.summary.peakMultiplier).toBe(2);
    expect(plan.summary.totalReviews).toBe(200);
    expect(plan.summary.meanReviewsPerDay).toBe(1.77);
    expect(plan.horizonDays).toBe(42);
  });

  it('collapses the three first sub-day rungs of the classic ladder onto day one', () => {
    const plan = projectSchedule({
      words: 10,
      perDay: 10,
      ladder: 'classic',
      start: '2026-01-01',
      horizon: 42,
    });
    expect(plan.days[1]?.reviews).toBe(30);
    expect(plan.summary.totalReviews).toBe(80);
    expect(plan.summary.peak).toEqual({ day: 1, date: '2026-01-02', newWords: 0, reviews: 30, total: 30 });
    expect(plan.summary.peakMultiplier).toBe(3);
    expect(plan.summary.meanReviewsPerDay).toBe(2.58);
    expect(plan.days).toHaveLength(31);
    expect(plan.horizonDays).toBe(31);
    expect(plan.summary.completionDate).toBe('2026-01-31');
  });

  it('fills the last study day only as far as the book goes', () => {
    const plan = projectSchedule({ words: 21, perDay: 10, ladder: 'wheel', start: '2026-02-27', horizon: 7 });
    expect(plan.days[2]?.newWords).toBe(1);
    expect(plan.summary.studyDays).toBe(3);
    expect(plan.days).toHaveLength(7);
  });
});
