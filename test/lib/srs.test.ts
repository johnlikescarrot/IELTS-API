import { describe, expect, it } from 'vitest';

import {
  EBBINGHAUS_INTERVALS_MINUTES,
  LEITNER_INTERVALS_DAYS,
  SM2_DEFAULT_EASE,
  buildSrsSchedule,
  calendarLevel,
  computeStreak,
  demoCalendar,
  ebbinghausNextReview,
  forgettingRetention,
  isIsoDate,
  leitnerDueDate,
  leitnerIntervalDays,
  leitnerNextBox,
  mistakePriority,
  retentionHalfLife,
  sm2Update,
  sm2UpdatedEase,
  updateMasteryScore,
} from '../../src/lib/srs.js';

describe('isIsoDate', () => {
  it('validates ISO dates', () => {
    expect(isIsoDate('2024-02-29')).toBe(true);
    expect(isIsoDate('2023-02-29')).toBe(false);
    expect(isIsoDate('2024-02-30')).toBe(false);
    expect(isIsoDate('2024-13-01')).toBe(false);
    expect(isIsoDate('01-01-2024')).toBe(false);
    expect(isIsoDate('')).toBe(false);
    expect(isIsoDate('2024-01-01 ')).toBe(false);
  });
});

describe('ebbinghausNextReview', () => {
  it('uses the ladder for early reviews', () => {
    const now = new Date('2024-01-01T00:00:00Z');
    const due = ebbinghausNextReview(0, 0, now);
    expect(due.toISOString()).toBe(new Date(now.getTime() + 5 * 60_000).toISOString());
    const second = ebbinghausNextReview(1, 0, now);
    expect(second.toISOString()).toBe(new Date(now.getTime() + 30 * 60_000).toISOString());
    const lastBase = ebbinghausNextReview(7, 0, now);
    expect(lastBase.toISOString()).toBe(new Date(now.getTime() + 21600 * 60_000).toISOString());
  });

  it('stretches the final rung by mastery', () => {
    const now = new Date('2024-01-01T00:00:00Z');
    const base = 21600;
    const zero = ebbinghausNextReview(10, 0, now);
    const full = ebbinghausNextReview(10, 100, now);
    expect(zero.toISOString()).toBe(new Date(now.getTime() + base * 60_000).toISOString());
    expect(full.toISOString()).toBe(new Date(now.getTime() + base * 2 * 60_000).toISOString());
  });

  it('clamps reviewCount and mastery', () => {
    const now = new Date('2024-01-01T00:00:00Z');
    expect(ebbinghausNextReview(-5, -10, now).toISOString()).toBe(
      ebbinghausNextReview(0, 0, now).toISOString(),
    );
    expect(ebbinghausNextReview(0, 150, now).toISOString()).toBe(
      ebbinghausNextReview(0, 100, now).toISOString(),
    );
    expect(ebbinghausNextReview(2.9, 50, now).toISOString()).toBe(
      ebbinghausNextReview(2, 50, now).toISOString(),
    );
  });

  it('defaults to now', () => {
    const before = Date.now();
    const due = ebbinghausNextReview(0, 0);
    const after = Date.now();
    expect(due.getTime()).toBeGreaterThanOrEqual(before + 5 * 60_000 - 1000);
    expect(due.getTime()).toBeLessThanOrEqual(after + 5 * 60_000 + 1000);
  });
});

describe('updateMasteryScore', () => {
  it('raises on correct, lowers more on incorrect', () => {
    expect(updateMasteryScore(50, true, 1)).toBe(55);
    expect(updateMasteryScore(50, false, 1)).toBe(42);
    expect(updateMasteryScore(50, true, 5)).toBe(75);
    expect(updateMasteryScore(50, false, 5)).toBe(10);
  });

  it('clamps confidence and mastery', () => {
    expect(updateMasteryScore(-10, true, 10)).toBe(25);
    expect(updateMasteryScore(150, false, -5)).toBe(92);
    expect(updateMasteryScore(0, false, 5)).toBe(0);
    expect(updateMasteryScore(100, true, 5)).toBe(100);
    expect(updateMasteryScore(50.5, true, 2)).toBe(60.5);
  });

  it('rounds to two decimals', () => {
    expect(updateMasteryScore(33.333, true, 2)).toBe(43.33);
  });
});

describe('forgettingRetention', () => {
  it('computes retention', () => {
    expect(forgettingRetention(0, 10)).toBe(1);
    expect(forgettingRetention(10, 10)).toBe(0.37);
    expect(forgettingRetention(5, 10)).toBeGreaterThan(0.5);
  });

  it('clamps negative and tiny stability', () => {
    expect(forgettingRetention(-5, -1)).toBe(1);
    expect(forgettingRetention(10, 0)).toBe(forgettingRetention(10, 0.1));
  });
});

describe('retentionHalfLife', () => {
  it('is stability times ln2', () => {
    expect(retentionHalfLife(10)).toBeCloseTo(6.93, 1);
    expect(retentionHalfLife(0)).toBeCloseTo(Math.log(2) * 0.1, 2);
  });
});

describe('sm2UpdatedEase', () => {
  it('updates per quality', () => {
    expect(sm2UpdatedEase(2.5, 5)).toBe(2.6);
    expect(sm2UpdatedEase(2.5, 4)).toBe(2.5);
    expect(sm2UpdatedEase(2.5, 0)).toBe(1.7);
    expect(sm2UpdatedEase(2.5, 3)).toBe(2.36);
  });

  it('clamps at 1.3', () => {
    expect(sm2UpdatedEase(1.3, 0)).toBe(1.3);
    expect(sm2UpdatedEase(1.4, 0)).toBe(1.3);
    expect(sm2UpdatedEase(10, 5)).toBe(10.1);
  });
});

describe('sm2Update', () => {
  it('resets on low quality', () => {
    const card = { interval: 10, repetitions: 3, easeFactor: 2.5 };
    const updated = sm2Update(card, 2);
    expect(updated).toEqual({ interval: 1, repetitions: 0, easeFactor: sm2UpdatedEase(2.5, 2) });
  });

  it('schedules 1 day for first repetition', () => {
    const updated = sm2Update({ interval: 1, repetitions: 0, easeFactor: 2.5 }, 5);
    expect(updated.interval).toBe(1);
    expect(updated.repetitions).toBe(1);
  });

  it('schedules 6 days for second repetition', () => {
    const updated = sm2Update({ interval: 1, repetitions: 1, easeFactor: 2.5 }, 4);
    expect(updated.interval).toBe(6);
    expect(updated.repetitions).toBe(2);
  });

  it('scales interval by ease for later repetitions', () => {
    const updated = sm2Update({ interval: 6, repetitions: 2, easeFactor: 2.5 }, 5);
    expect(updated.interval).toBe(Math.round(6 * sm2UpdatedEase(2.5, 5)));
    expect(updated.repetitions).toBe(3);
  });
});

describe('leitner helpers', () => {
  it('promotes on correct, returns to 1 on incorrect', () => {
    expect(leitnerNextBox(1, true)).toBe(2);
    expect(leitnerNextBox(5, true)).toBe(5);
    expect(leitnerNextBox(3, false)).toBe(1);
    expect(leitnerNextBox(5, false)).toBe(1);
  });

  it('clamps box numbers', () => {
    expect(leitnerNextBox(0, true)).toBe(2);
    expect(leitnerNextBox(10, true)).toBe(5);
    expect(leitnerNextBox(2.6, true)).toBe(4);
  });

  it('maps boxes to intervals', () => {
    expect(leitnerIntervalDays(1)).toBe(LEITNER_INTERVALS_DAYS[0]);
    expect(leitnerIntervalDays(5)).toBe(LEITNER_INTERVALS_DAYS[4]);
    expect(leitnerIntervalDays(0)).toBe(LEITNER_INTERVALS_DAYS[0]);
    expect(leitnerIntervalDays(10)).toBe(LEITNER_INTERVALS_DAYS[4]);
  });

  it('computes due dates', () => {
    const now = new Date('2024-01-01T00:00:00Z');
    const due = leitnerDueDate(1, true, now);
    expect(due.toISOString()).toBe(
      new Date(now.getTime() + leitnerIntervalDays(2) * 86_400_000).toISOString(),
    );
    const failed = leitnerDueDate(5, false, now);
    expect(failed.toISOString()).toBe(
      new Date(now.getTime() + leitnerIntervalDays(1) * 86_400_000).toISOString(),
    );
  });

  it('defaults to now', () => {
    const before = Date.now();
    const due = leitnerDueDate(2, true);
    const after = Date.now();
    expect(due.getTime()).toBeGreaterThanOrEqual(before + leitnerIntervalDays(3) * 86_400_000 - 1000);
    expect(due.getTime()).toBeLessThanOrEqual(after + leitnerIntervalDays(3) * 86_400_000 + 1000);
  });
});

describe('calendarLevel', () => {
  it('maps minutes to levels', () => {
    expect(calendarLevel(0)).toBe(0);
    expect(calendarLevel(1)).toBe(1);
    expect(calendarLevel(14)).toBe(1);
    expect(calendarLevel(15)).toBe(2);
    expect(calendarLevel(29)).toBe(2);
    expect(calendarLevel(30)).toBe(3);
    expect(calendarLevel(59)).toBe(3);
    expect(calendarLevel(60)).toBe(4);
    expect(calendarLevel(200)).toBe(4);
    expect(calendarLevel(-10)).toBe(0);
    expect(calendarLevel(15.9)).toBe(2);
  });
});

describe('demoCalendar', () => {
  it('generates deterministic dates and levels', () => {
    const first = demoCalendar('seed-1', 7, '2024-01-07');
    const second = demoCalendar('seed-1', 7, '2024-01-07');
    expect(first).toEqual(second);
    expect(first).toHaveLength(7);
    expect(first[0]?.date).toBe('2024-01-01');
    expect(first[6]?.date).toBe('2024-01-07');
    for (const day of first) {
      expect(day.level).toBe(calendarLevel(day.minutes));
      expect(day.minutes).toBeGreaterThanOrEqual(0);
      expect(day.minutes).toBeLessThanOrEqual(90);
    }
  });

  it('caps days at 365 and requires at least 1', () => {
    expect(demoCalendar('s', 0, '2024-01-01')).toHaveLength(1);
    expect(demoCalendar('s', 500, '2024-01-01')).toHaveLength(365);
    expect(demoCalendar('s', 10.6, '2024-01-01')).toHaveLength(11);
  });

  it('rejects invalid end dates', () => {
    expect(() => demoCalendar('s', 5, 'invalid')).toThrow('Invalid end date');
    expect(() => demoCalendar('s', 5, '2024-02-30')).toThrow('Invalid end date');
  });

  it('defaults end date to today', () => {
    const today = new Date().toISOString().slice(0, 10);
    const cal = demoCalendar('seed', 3);
    expect(cal[cal.length - 1]?.date).toBe(today);
  });
});

describe('computeStreak', () => {
  it('handles empty and invalid-only inputs', () => {
    expect(computeStreak([])).toEqual({
      totalDays: 0,
      longestStreak: 0,
      currentStreak: 0,
      firstDate: null,
      lastDate: null,
    });
    expect(computeStreak(['invalid', '2024-02-30'])).toEqual({
      totalDays: 0,
      longestStreak: 0,
      currentStreak: 0,
      firstDate: null,
      lastDate: null,
    });
  });

  it('counts single day', () => {
    expect(computeStreak(['2024-01-01'])).toEqual({
      totalDays: 1,
      longestStreak: 1,
      currentStreak: 1,
      firstDate: '2024-01-01',
      lastDate: '2024-01-01',
    });
  });

  it('computes longest and current streaks', () => {
    const dates = ['2024-01-01', '2024-01-02', '2024-01-04', '2024-01-05', '2024-01-06'];
    const result = computeStreak(dates);
    expect(result.totalDays).toBe(5);
    expect(result.longestStreak).toBe(3);
    expect(result.currentStreak).toBe(3);
    expect(result.firstDate).toBe('2024-01-01');
    expect(result.lastDate).toBe('2024-01-06');
  });

  it('handles gaps resetting current but not longest', () => {
    const dates = ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-10', '2024-01-11'];
    const result = computeStreak(dates);
    expect(result.longestStreak).toBe(3);
    expect(result.currentStreak).toBe(2);
  });

  it('deduplicates, ignores invalid, and sorts', () => {
    const dates = ['2024-01-03', '2024-01-01', '2024-01-03', 'bad', '2024-01-02'];
    const result = computeStreak(dates);
    expect(result.totalDays).toBe(3);
    expect(result.longestStreak).toBe(3);
    expect(result.currentStreak).toBe(3);
  });

  it('handles non-consecutive isolated days', () => {
    const result = computeStreak(['2024-01-01', '2024-01-03', '2024-01-05']);
    expect(result.longestStreak).toBe(1);
    expect(result.currentStreak).toBe(1);
  });
});

describe('mistakePriority', () => {
  it('scores errors, recency and mastery', () => {
    expect(mistakePriority(1, 0, 100)).toBe(10);
    expect(mistakePriority(2, 10, 50)).toBe(20 + 5 + 10);
  });

  it('adds leech penalty at 5+ errors', () => {
    const withoutLeech = mistakePriority(4, 0, 50);
    const withLeech = mistakePriority(5, 0, 50);
    expect(withLeech).toBe(withoutLeech + 15);
  });

  it('clamps inputs', () => {
    expect(mistakePriority(0, -5, 150)).toBe(mistakePriority(1, 0, 100));
    expect(mistakePriority(1.9, 0, 50)).toBe(mistakePriority(1, 0, 50));
  });
});

describe('buildSrsSchedule', () => {
  it('produces ebbinghaus ladder, leitner and sm2 next due', () => {
    const now = new Date('2024-01-01T00:00:00Z');
    const result = buildSrsSchedule({
      reviewCount: 2,
      masteryScore: 50,
      sm2Card: { interval: 1, repetitions: 1, easeFactor: 2.5 },
      quality: 4,
      leitnerBox: 2,
      leitnerCorrect: true,
      now,
    });
    expect(result.ebbinghaus.steps).toHaveLength(5);
    expect(result.ebbinghaus.steps[0]?.repetition).toBe(2);
    expect(result.ebbinghaus.nextDueAt).toBe(ebbinghausNextReview(2, 50, now).toISOString());
    expect(result.leitner.box).toBe(leitnerNextBox(2, true));
    expect(result.sm2.updated.easeFactor).toBe(sm2UpdatedEase(2.5, 4));
    expect(result.retention.halfLifeDays).toBe(retentionHalfLife(result.sm2.updated.interval));
  });

  it('handles high reviewCount beyond ladder', () => {
    const now = new Date('2024-01-01T00:00:00Z');
    const result = buildSrsSchedule({
      reviewCount: 10,
      masteryScore: 0,
      sm2Card: { interval: 10, repetitions: 5, easeFactor: 2.5 },
      quality: 5,
      leitnerBox: 5,
      leitnerCorrect: false,
      now,
    });
    expect(result.ebbinghaus.steps[0]?.intervalMinutes).toBe(Math.round(21600 * 1));
    expect(result.leitner.box).toBe(1);
    expect(result.ebbinghaus.nextDueAt).toBeTruthy();
  });

  it('round-trips intervals arrays', () => {
    expect(EBBINGHAUS_INTERVALS_MINUTES).toEqual([5, 30, 720, 1440, 2880, 5760, 10080, 21600]);
    expect(LEITNER_INTERVALS_DAYS).toEqual([1, 3, 7, 14, 30]);
    expect(SM2_DEFAULT_EASE).toBe(2.5);
  });
});
