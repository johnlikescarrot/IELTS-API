import { describe, expect, it } from 'vitest';

import {
  DEFAULT_EASINESS,
  MIN_EASINESS,
  PROJECTED_REVIEWS,
  addDays,
  buildReviewSchedule,
  describeQuality,
  nextState,
} from '../../src/lib/review.js';

import type { RecallQuality, ReviewSchedule } from '../../src/types.js';

describe('describeQuality', () => {
  it('maps every grade onto its SM-2 description', () => {
    expect(describeQuality(0)).toBe('complete blackout');
    expect(describeQuality(1)).toBe('incorrect response; the correct one remembered');
    expect(describeQuality(2)).toBe('incorrect response; the correct one seemed easy to recall');
    expect(describeQuality(3)).toBe('correct response recalled with serious difficulty');
    expect(describeQuality(4)).toBe('correct response recalled after a hesitation');
    expect(describeQuality(5)).toBe('perfect response');
  });
});

describe('nextState', () => {
  it('resets a forgotten item and leaves the easiness factor untouched', () => {
    expect(nextState(2, 5, 2.8, 10)).toEqual({ easiness: 2.8, repetitions: 0, interval: 1 });
    expect(nextState(0, 3, 2.5, 6)).toEqual({ easiness: 2.5, repetitions: 0, interval: 1 });
  });

  it('schedules the first successful review for tomorrow', () => {
    expect(nextState(4, 0, DEFAULT_EASINESS, 0)).toEqual({ easiness: 2.5, repetitions: 1, interval: 1 });
  });

  it('schedules the second successful review for six days out', () => {
    expect(nextState(4, 1, DEFAULT_EASINESS, 1)).toEqual({ easiness: 2.5, repetitions: 2, interval: 6 });
  });

  it('scales later intervals by the easiness factor', () => {
    expect(nextState(4, 2, DEFAULT_EASINESS, 6)).toEqual({ easiness: 2.5, repetitions: 3, interval: 15 });
    expect(nextState(4, 3, DEFAULT_EASINESS, 15)).toEqual({ easiness: 2.5, repetitions: 4, interval: 38 });
  });

  it('raises the easiness factor for a perfect response', () => {
    expect(nextState(5, 0, DEFAULT_EASINESS, 0).easiness).toBe(2.6);
  });

  it('lowers the easiness factor for a hesitant response', () => {
    expect(nextState(3, 0, DEFAULT_EASINESS, 0).easiness).toBe(2.36);
  });

  it('never lets the easiness factor fall below the SM-2 floor', () => {
    expect(nextState(3, 0, 1.3, 0).easiness).toBe(MIN_EASINESS);
    expect(nextState(0, 0, 1.3, 0).easiness).toBe(MIN_EASINESS);
  });
});

describe('addDays', () => {
  it('adds days inside the same month', () => {
    expect(addDays('2026-09-07', 1)).toBe('2026-09-08');
    expect(addDays('2026-09-07', 0)).toBe('2026-09-07');
  });

  it('rolls over the month boundary', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
  });

  it('rolls over the year boundary', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('respects leap years', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2023-02-28', 1)).toBe('2023-03-01');
  });
});

describe('buildReviewSchedule', () => {
  function schedule(overrides: Partial<Parameters<typeof buildReviewSchedule>[0]> = {}): ReviewSchedule {
    return buildReviewSchedule({
      quality: 4,
      repetitions: 0,
      easiness: DEFAULT_EASINESS,
      interval: 0,
      today: '2026-09-07',
      ...overrides,
    });
  }

  it('echoes the inputs and reports the recall interpretation', () => {
    const result = schedule();
    expect(result.inputs).toEqual({
      quality: 4,
      repetitions: 0,
      easiness: 2.5,
      interval: 0,
      today: '2026-09-07',
    });
    expect(result.recall).toEqual({
      quality: 4,
      description: 'correct response recalled after a hesitation',
      forgotten: false,
    });
  });

  it('schedules the first review for tomorrow and projects the classic SM-2 ladder', () => {
    const result = schedule();
    expect(result.schedule).toEqual({ easiness: 2.5, repetitions: 1, interval: 1, due: '2026-09-08' });
    expect(result.projected).toHaveLength(PROJECTED_REVIEWS);
    expect(result.projected[0]).toEqual({ easiness: 2.5, repetitions: 2, interval: 6, due: '2026-09-14' });
    expect(result.projected[1]).toEqual({ easiness: 2.5, repetitions: 3, interval: 15, due: '2026-09-29' });
    expect(result.projected[2]).toEqual({ easiness: 2.5, repetitions: 4, interval: 38, due: '2026-11-06' });
  });

  it('marks a forgotten item and keeps re-scheduling it for tomorrow', () => {
    const result = schedule({ quality: 0, repetitions: 7, easiness: 2.8, interval: 20 });
    expect(result.recall.forgotten).toBe(true);
    expect(result.schedule).toEqual({ easiness: 2.8, repetitions: 0, interval: 1, due: '2026-09-08' });
    expect(result.projected.every((review) => review.interval === 1)).toBe(true);
    expect(result.projected.every((review) => review.repetitions === 0)).toBe(true);
  });

  it('is deterministic for identical inputs', () => {
    expect(JSON.stringify(schedule())).toBe(JSON.stringify(schedule()));
  });

  it('lets the easiness floor and the interval carry into the projection', () => {
    const result = schedule({ quality: 3, easiness: MIN_EASINESS });
    expect(result.schedule.easiness).toBe(MIN_EASINESS);
    expect(result.projected.every((review) => review.easiness === MIN_EASINESS)).toBe(true);
  });
});

describe('recall quality union', () => {
  it('accepts every grade as a RecallQuality', () => {
    const grades: RecallQuality[] = [0, 1, 2, 3, 4, 5];
    for (const quality of grades) {
      expect(describeQuality(quality).length).toBeGreaterThan(0);
    }
  });
});
