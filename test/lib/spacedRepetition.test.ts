import { describe, expect, it } from 'vitest';

import { sm2Chain, sm2Step } from '../../src/lib/spacedRepetition.js';

describe('sm2Step', () => {
  it('schedules a fresh card for tomorrow after a perfect recall', () => {
    expect(sm2Step({ repetitions: 0, easiness: 2.5, intervalDays: 0 }, 5)).toMatchObject({
      quality: 5,
      lapse: false,
      repetitions: 1,
      easiness: 2.6,
      intervalDays: 1,
      leitnerBox: 2,
      nextReview: 'Review tomorrow.',
    });
  });

  it('uses the six-day interval for the second pass', () => {
    expect(sm2Step({ repetitions: 1, easiness: 2.6, intervalDays: 1 }, 5)).toMatchObject({
      repetitions: 2,
      easiness: 2.7,
      intervalDays: 6,
      leitnerBox: 3,
      nextReview: 'Review in 6 days.',
    });
  });

  it('multiplies the interval by the easiness from the third pass on', () => {
    expect(sm2Step({ repetitions: 2, easiness: 2.7, intervalDays: 6 }, 4)).toMatchObject({
      repetitions: 3,
      easiness: 2.7,
      intervalDays: 16,
      leitnerBox: 4,
    });
  });

  it('lowers the easiness on a difficult pass', () => {
    expect(sm2Step({ repetitions: 2, easiness: 2.5, intervalDays: 10 }, 3)).toMatchObject({
      lapse: false,
      repetitions: 3,
      easiness: 2.36,
      intervalDays: 24,
    });
  });

  it('restarts a lapsed card at one day', () => {
    const step = sm2Step({ repetitions: 5, easiness: 2, intervalDays: 30 }, 2);
    expect(step).toMatchObject({
      lapse: true,
      repetitions: 0,
      easiness: 1.68,
      intervalDays: 1,
      leitnerBox: 1,
      nextReview: 'Review tomorrow.',
    });
    expect(step.advice).toContain('Wrong answer');
  });

  it('floors the easiness at 1.3', () => {
    expect(sm2Step({ repetitions: 0, easiness: 1.3, intervalDays: 0 }, 0)).toMatchObject({
      lapse: true,
      easiness: 1.3,
    });
  });

  it('caps the Leitner box at 5', () => {
    expect(sm2Step({ repetitions: 9, easiness: 2.5, intervalDays: 100 }, 5)).toMatchObject({
      repetitions: 10,
      leitnerBox: 5,
    });
  });

  it('advises every recall quality distinctly', () => {
    const advice = [0, 1, 2, 3, 4, 5].map(
      (quality) => sm2Step({ repetitions: 0, easiness: 2.5, intervalDays: 0 }, quality).advice,
    );
    expect(new Set(advice).size).toBe(6);
  });
});

describe('sm2Chain', () => {
  it('folds a trajectory of grades into successive states', () => {
    const steps = sm2Chain({ repetitions: 0, easiness: 2.5, intervalDays: 0 }, [5, 5, 4]);
    expect(steps.map((step) => step.intervalDays)).toEqual([1, 6, 16]);
    expect(steps[2]).toMatchObject({ repetitions: 3, easiness: 2.7, lapse: false });
  });

  it('restarts the trajectory on a lapse', () => {
    const steps = sm2Chain({ repetitions: 4, easiness: 2.5, intervalDays: 20 }, [5, 1, 5]);
    expect(steps.map((step) => step.repetitions)).toEqual([5, 0, 1]);
    expect(steps.map((step) => step.intervalDays)).toEqual([52, 1, 1]);
  });

  it('returns no steps without grades', () => {
    expect(sm2Chain({ repetitions: 0, easiness: 2.5, intervalDays: 0 }, [])).toEqual([]);
  });
});
