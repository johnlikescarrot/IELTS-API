import { describe, expect, it } from 'vitest';

import { parseQuality, rankQueue, retentionCurve, scheduleSrs } from '../../src/lib/srs.js';

import type { SrsCardState } from '../../src/types.js';

const baseState: SrsCardState = { easeFactor: 2.5, intervalDays: 0, repetitions: 0, lapses: 0 };

describe('parseQuality', () => {
  it('parses numeric quality', () => {
    expect(parseQuality(5, undefined)).toBe(5);
    expect(parseQuality(0, undefined)).toBe(0);
  });

  it('parses result shorthand case-insensitively', () => {
    expect(parseQuality(undefined, 'again')).toBe(0);
    expect(parseQuality(undefined, 'HARD')).toBe(3);
    expect(parseQuality(undefined, 'Good')).toBe(4);
    expect(parseQuality(undefined, 'easy')).toBe(5);
  });

  it('rejects both supplied', () => {
    expect(() => parseQuality(3, 'good')).toThrow();
  });

  it('rejects missing both', () => {
    expect(() => parseQuality(undefined, undefined)).toThrow();
  });

  it('rejects unknown result', () => {
    expect(() => parseQuality(undefined, 'unknown')).toThrow();
  });

  it('rejects non-integer quality', () => {
    expect(() => parseQuality(2.5 as unknown as number, undefined)).toThrow();
    expect(() => parseQuality(-1, undefined)).toThrow();
    expect(() => parseQuality(6, undefined)).toThrow();
  });
});

describe('scheduleSrs', () => {
  it('schedules first success (interval 1)', () => {
    const result = scheduleSrs(4, baseState);
    expect(result.nextIntervalDays).toBe(1);
    expect(result.nextRepetitions).toBe(1);
    expect(result.success).toBe(true);
    expect(result.leitnerBox).toBe(2);
    expect(result.recommendation).toContain('Good');
  });

  it('schedules second success (interval 6)', () => {
    const second = scheduleSrs(5, { easeFactor: 2.5, intervalDays: 1, repetitions: 1, lapses: 0 });
    expect(second.nextIntervalDays).toBe(6);
    expect(second.nextRepetitions).toBe(2);
    expect(second.estimatedRetention).toBeGreaterThanOrEqual(0);
  });

  it('grows interval on later repetitions', () => {
    const third = scheduleSrs(5, { easeFactor: 2.5, intervalDays: 6, repetitions: 2, lapses: 0 });
    expect(third.nextIntervalDays).toBeGreaterThan(6);
  });

  it('resets on failure (quality <3)', () => {
    const failed = scheduleSrs(1, { easeFactor: 2.5, intervalDays: 10, repetitions: 3, lapses: 0 });
    expect(failed.success).toBe(false);
    expect(failed.nextIntervalDays).toBe(1);
    expect(failed.nextRepetitions).toBe(0);
    expect(failed.leitnerBox).toBe(1);
    expect(failed.recommendation).toContain('Quality');
  });

  it('handles hard quality', () => {
    const hard = scheduleSrs(3, baseState);
    expect(hard.success).toBe(true);
    expect(hard.recommendation).toContain('Hard');
  });

  it('handles easy quality', () => {
    const easy = scheduleSrs(5, baseState);
    expect(easy.recommendation).toContain('Easy');
  });

  it('clamps ease factor to [1.3,3.0]', () => {
    const low = scheduleSrs(0, { easeFactor: 1.3, intervalDays: 0, repetitions: 0, lapses: 0 });
    expect(low.nextEaseFactor).toBe(1.3);
    const high = scheduleSrs(5, { easeFactor: 3.0, intervalDays: 0, repetitions: 0, lapses: 0 });
    expect(high.nextEaseFactor).toBeLessThanOrEqual(3.0);
  });

  it('clamps interval to 36500', () => {
    const long = scheduleSrs(5, { easeFactor: 3.0, intervalDays: 20000, repetitions: 10, lapses: 0 });
    expect(long.nextIntervalDays).toBeLessThanOrEqual(36500);
  });

  it('clamps interval below 1 to 1', () => {
    const tiny = scheduleSrs(5, { easeFactor: 1.3, intervalDays: 0, repetitions: 2, lapses: 0 });
    expect(tiny.nextIntervalDays).toBe(1);
  });

  it('handles leitner box max 5', () => {
    const maxBox = scheduleSrs(5, { easeFactor: 2.5, intervalDays: 10, repetitions: 10, lapses: 0 });
    expect(maxBox.leitnerBox).toBe(5);
  });

  it('rejects invalid state', () => {
    expect(() => scheduleSrs(4, { easeFactor: 1.0, intervalDays: 0, repetitions: 0, lapses: 0 })).toThrow();
    expect(() => scheduleSrs(4, { easeFactor: 2.5, intervalDays: -1, repetitions: 0, lapses: 0 })).toThrow();
    expect(() => scheduleSrs(4, { easeFactor: 2.5, intervalDays: 0, repetitions: -1, lapses: 0 })).toThrow();
    expect(() => scheduleSrs(4, { easeFactor: 2.5, intervalDays: 0, repetitions: 0, lapses: -1 })).toThrow();
    expect(() =>
      scheduleSrs(4, { easeFactor: Number.NaN, intervalDays: 0, repetitions: 0, lapses: 0 }),
    ).toThrow();
    expect(() => scheduleSrs(4, { easeFactor: 2.5, intervalDays: 0.5, repetitions: 0, lapses: 0 })).toThrow();
    expect(() => scheduleSrs(4, { easeFactor: 5, intervalDays: 0, repetitions: 0, lapses: 0 })).toThrow();
  });
});

describe('retentionCurve', () => {
  it('builds curve of correct length and values', () => {
    const curve = retentionCurve(7, 3);
    expect(curve).toHaveLength(3);
    expect(curve[0]?.days).toBe(1);
    expect(curve[0]?.retention).toBeGreaterThan(0);
    expect(curve[0]?.retention).toBeLessThan(1);
  });

  it('rejects invalid strength', () => {
    expect(() => retentionCurve(0, 10)).toThrow();
    expect(() => retentionCurve(400, 10)).toThrow();
    expect(() => retentionCurve(Number.NaN, 10)).toThrow();
  });

  it('rejects invalid days', () => {
    expect(() => retentionCurve(7, 0)).toThrow();
    expect(() => retentionCurve(7, 400)).toThrow();
    expect(() => retentionCurve(7, 1.5)).toThrow();
  });
});

describe('rankQueue', () => {
  it('orders by due ascending then ease descending', () => {
    const cards = [
      { nextReviewInDays: 2, easeFactor: 2.5, id: 1 },
      { nextReviewInDays: 1, easeFactor: 1.3, id: 2 },
      { nextReviewInDays: 1, easeFactor: 2.5, id: 3 },
    ];
    const ranked = rankQueue(cards);
    expect(ranked.map((c) => c.id)).toEqual([3, 2, 1]);
  });

  it('returns copy without mutating input', () => {
    const cards = [{ nextReviewInDays: 1, easeFactor: 2.5 }];
    const ranked = rankQueue(cards);
    expect(ranked).not.toBe(cards);
  });

  it('handles empty input', () => {
    expect(rankQueue([])).toEqual([]);
  });
});
