import { describe, expect, it } from 'vitest';

import { DAY_SECONDS, SCHEDULERS, schedulerById } from '../../src/data/retention.js';
import {
  PASSING_QUALITY,
  advance,
  atCeiling,
  buildSchedule,
  gradeReview,
  halfLifeDays,
  initialState,
  lagForRecall,
  nextInterval,
  projectSchedulers,
  projectWorkload,
  recallAfter,
  updateEase,
  updateMastery,
  updateMasteryFrom,
} from '../../src/lib/retention.js';

import type { ScheduleOptions, WorkloadOptions } from '../../src/lib/retention.js';
import type { ReviewState } from '../../src/types.js';

/** Schedule options with everything defaulted, overridable per test. */
function options(overrides: Partial<ScheduleOptions> = {}): ScheduleOptions {
  return {
    start: '2026-01-01T00:00:00.000Z',
    quality: 5,
    horizonDays: 365,
    maxReviews: 200,
    targetRecall: 0.9,
    ...overrides,
  };
}

describe('halfLifeDays', () => {
  it('starts at the bias weight with no history', () => {
    expect(halfLifeDays(0, 0)).toBeCloseTo(2 ** 0.5, 6);
  });

  it('grows with the square root of the successful reviews', () => {
    expect(halfLifeDays(1, 0)).toBeCloseTo(2 ** 1.5, 6);
    expect(halfLifeDays(4, 0)).toBeCloseTo(2 ** 2.5, 6);
  });

  it('clamps at the published ceiling of 90 days', () => {
    expect(halfLifeDays(36, 0)).toBe(90);
    expect(halfLifeDays(1000, 0)).toBe(90);
  });

  it('clamps at the published floor of 0.1 days', () => {
    expect(halfLifeDays(0, 25)).toBe(0.1);
    expect(halfLifeDays(1, 100)).toBe(0.1);
  });
});

describe('recallAfter and lagForRecall', () => {
  it('is certain at zero lag and even at one half-life', () => {
    expect(recallAfter(0, 3)).toBe(1);
    expect(recallAfter(3, 3)).toBe(0.5);
  });

  it('inverts itself', () => {
    const lag = lagForRecall(7, 0.9);
    expect(recallAfter(lag, 7)).toBeCloseTo(0.9, 10);
  });

  it('schedules sooner for a higher target', () => {
    expect(lagForRecall(7, 0.99)).toBeLessThan(lagForRecall(7, 0.8));
  });
});

describe('initialState', () => {
  it('gives every scheduler exactly the state it needs and no more', () => {
    expect(initialState(schedulerById('ebbinghaus-folk'))).toEqual({
      repetitions: 0,
      lapses: 0,
      intervalSeconds: 0,
      easeFactor: null,
      box: null,
      halfLifeDays: null,
      mastery: 0,
    });
    expect(initialState(schedulerById('sm-2')).easeFactor).toBe(2.5);
    expect(initialState(schedulerById('leitner-5box')).box).toBe(1);
    expect(initialState(schedulerById('half-life')).halfLifeDays).toBe(1.41);
    const pimsleur = initialState(schedulerById('pimsleur-1967'));
    expect([pimsleur.easeFactor, pimsleur.box, pimsleur.halfLifeDays, pimsleur.mastery]).toEqual([
      null,
      null,
      null,
      null,
    ]);
  });
});

describe('updateEase', () => {
  it('rewards a perfect grade and punishes a poor one', () => {
    expect(updateEase(2.5, 5)).toBe(2.6);
    expect(updateEase(2.5, 4)).toBe(2.5);
    expect(updateEase(2.5, 3)).toBe(2.36);
    expect(updateEase(2.5, 0)).toBe(1.7);
  });

  it('floors the easiness factor at 1.3 however often the item is failed', () => {
    let ease = 2.5;
    for (let index = 0; index < 20; index += 1) {
      ease = updateEase(ease, 0);
    }
    expect(ease).toBe(1.3);
  });
});

describe('updateMastery', () => {
  it('moves mastery by five per confidence point on a pass', () => {
    expect(updateMastery(0, 5)).toBe(25);
    expect(updateMastery(0, 3)).toBe(15);
  });

  it('punishes a failure harder than a pass is rewarded', () => {
    expect(updateMastery(50, 0)).toBe(42);
    expect(updateMastery(50, 5)).toBe(75);
    // A grade of 0 is clamped onto the trainer's 1-5 confidence scale.
    expect(updateMastery(50, 1)).toBe(42);
    expect(updateMastery(50, 2)).toBe(34);
  });

  it('clamps to the 0-100 range', () => {
    expect(updateMastery(95, 5)).toBe(100);
    expect(updateMastery(5, 0)).toBe(0);
  });
});

describe('updateMasteryFrom', () => {
  it('replays a clean history to the ceiling', () => {
    expect(updateMasteryFrom(0, 0)).toBe(0);
    expect(updateMasteryFrom(4, 0)).toBe(100);
    expect(updateMasteryFrom(10, 0)).toBe(100);
  });

  it('replays failures after the successes', () => {
    // Four successes saturate the score at 100 before the failure is applied,
    // so the reconstruction is path-dependent: the clamp discards history.
    expect(updateMasteryFrom(4, 1)).toBe(92);
    expect(updateMasteryFrom(1, 1)).toBe(17);
    expect(updateMasteryFrom(0, 3)).toBe(0);
  });
});

describe('nextInterval', () => {
  it('walks the folk ladder rung by rung', () => {
    const folk = schedulerById('ebbinghaus-folk');
    let state = initialState(folk);
    const seen: number[] = [];
    for (let index = 0; index < 8; index += 1) {
      const interval = nextInterval(folk, state, { targetRecall: 0.9 });
      seen.push(interval);
      state = advance(folk, state, 5, interval);
    }
    expect(seen).toEqual(folk.ladder);
  });

  it('caps the folk ladder at 30 days once mastery saturates', () => {
    const folk = schedulerById('ebbinghaus-folk');
    const state: ReviewState = {
      repetitions: 12,
      lapses: 0,
      intervalSeconds: 0,
      easeFactor: null,
      box: null,
      halfLifeDays: null,
      mastery: 100,
    };
    expect(nextInterval(folk, state, { targetRecall: 0.9 })).toBe(30 * DAY_SECONDS);
    expect(atCeiling(folk, state)).toBe(true);
  });

  it('advances the folk ladder even when the review is failed', () => {
    // The deployed implementation indexes the ladder by total reviews, so a
    // lapse moves the item forward exactly as a success does.
    const folk = schedulerById('ebbinghaus-folk');
    const failed = advance(folk, initialState(folk), 0, 300);
    expect(failed.lapses).toBe(1);
    expect(nextInterval(folk, failed, { targetRecall: 0.9 })).toBe(folk.ladder[1]);
  });

  it('continues Pimsleur geometrically past the printed ladder', () => {
    const pimsleur = schedulerById('pimsleur-1967');
    const state: ReviewState = { ...initialState(pimsleur), repetitions: 11 };
    expect(nextInterval(pimsleur, state, { targetRecall: 0.9 })).toBe(5 ** 12);
    expect(atCeiling(pimsleur, state)).toBe(false);
  });

  it('reads the Leitner interval straight off the box', () => {
    const leitner = schedulerById('leitner-5box');
    for (let box = 1; box <= 5; box += 1) {
      const state: ReviewState = { ...initialState(leitner), box };
      expect(nextInterval(leitner, state, { targetRecall: 0.9 })).toBe(leitner.ladder[box - 1]);
    }
  });

  it('follows the SM-2 sequence of 1 day, 6 days, then multiplication', () => {
    const sm2 = schedulerById('sm-2');
    const seed = initialState(sm2);
    expect(nextInterval(sm2, seed, { targetRecall: 0.9 })).toBe(DAY_SECONDS);
    const afterFirst = advance(sm2, seed, 5, DAY_SECONDS);
    expect(nextInterval(sm2, afterFirst, { targetRecall: 0.9 })).toBe(6 * DAY_SECONDS);
    const afterSecond = advance(sm2, afterFirst, 5, 6 * DAY_SECONDS);
    expect(nextInterval(sm2, afterSecond, { targetRecall: 0.9 })).toBe(
      Math.round(6 * DAY_SECONDS * (afterSecond.easeFactor as number)),
    );
  });

  it('schedules the half-life scheduler at the target recall', () => {
    const hlr = schedulerById('half-life');
    const seed = initialState(hlr);
    const interval = nextInterval(hlr, seed, { targetRecall: 0.9 });
    expect(recallAfter(interval / DAY_SECONDS, seed.halfLifeDays as number)).toBeCloseTo(0.9, 3);
    const eager = nextInterval(hlr, seed, { targetRecall: 0.99 });
    expect(eager).toBeLessThan(interval);
  });
});

describe('atCeiling', () => {
  it('answers for every scheduler', () => {
    const folk = schedulerById('ebbinghaus-folk');
    expect(atCeiling(folk, initialState(folk))).toBe(false);
    const leitner = schedulerById('leitner-5box');
    expect(atCeiling(leitner, initialState(leitner))).toBe(false);
    expect(atCeiling(leitner, { ...initialState(leitner), box: 5 })).toBe(true);
    const hlr = schedulerById('half-life');
    expect(atCeiling(hlr, initialState(hlr))).toBe(false);
    expect(atCeiling(hlr, { ...initialState(hlr), halfLifeDays: 90 })).toBe(true);
    expect(atCeiling(schedulerById('sm-2'), initialState(schedulerById('sm-2')))).toBe(false);
    expect(atCeiling(schedulerById('pimsleur-1967'), initialState(schedulerById('pimsleur-1967')))).toBe(
      false,
    );
  });
});

describe('advance', () => {
  it('counts a passing grade as a repetition and a failing one as a lapse', () => {
    const pimsleur = schedulerById('pimsleur-1967');
    expect(advance(pimsleur, initialState(pimsleur), PASSING_QUALITY, 5).repetitions).toBe(1);
    expect(advance(pimsleur, initialState(pimsleur), PASSING_QUALITY - 1, 5).lapses).toBe(1);
  });

  it('sends a failed Leitner card back to box 1 from anywhere', () => {
    const leitner = schedulerById('leitner-5box');
    const high: ReviewState = { ...initialState(leitner), box: 5, repetitions: 4 };
    expect(advance(leitner, high, 0, DAY_SECONDS).box).toBe(1);
    expect(advance(leitner, high, 5, DAY_SECONDS).box).toBe(5);
  });

  it('resets the SM-2 repetition count on a lapse but keeps the easiness earned', () => {
    const sm2 = schedulerById('sm-2');
    const mature: ReviewState = { ...initialState(sm2), repetitions: 6, easeFactor: 2.7 };
    const lapsed = advance(sm2, mature, 1, 30 * DAY_SECONDS);
    expect(lapsed.repetitions).toBe(0);
    expect(lapsed.lapses).toBe(1);
    expect(lapsed.easeFactor).toBe(updateEase(2.7, 1));
    expect(nextInterval(sm2, lapsed, { targetRecall: 0.9 })).toBe(DAY_SECONDS);
  });

  it('recomputes the half-life from the updated counters', () => {
    const hlr = schedulerById('half-life');
    const after = advance(hlr, initialState(hlr), 5, 1000);
    expect(after.halfLifeDays).toBeCloseTo(2 ** 1.5, 1);
  });

  it('records the interval that produced the state', () => {
    const folk = schedulerById('ebbinghaus-folk');
    expect(advance(folk, initialState(folk), 5, 4242).intervalSeconds).toBe(4242);
  });
});

describe('buildSchedule', () => {
  it('dates every review from the learning instant', () => {
    const schedule = buildSchedule(schedulerById('ebbinghaus-folk'), options({ horizonDays: 40 }));
    expect(schedule.reviews[0]?.at).toBe('2026-01-01T00:05:00.000Z');
    expect(schedule.reviews[1]?.at).toBe('2026-01-01T00:35:00.000Z');
    expect(schedule.reviews.at(-1)?.at).toBe('2026-01-30T12:35:00.000Z');
    expect(schedule.summary.reviews).toBe(8);
    expect(schedule.summary.terminalIntervalDays).toBe(15);
  });

  it('is byte-identical for identical inputs', () => {
    const first = buildSchedule(schedulerById('sm-2'), options());
    const second = buildSchedule(schedulerById('sm-2'), options());
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('keeps elapsed time equal to the cumulative interval', () => {
    const schedule = buildSchedule(schedulerById('leitner-5box'), options({ horizonDays: 90 }));
    let cumulative = 0;
    for (const review of schedule.reviews) {
      cumulative += review.intervalSeconds;
      expect(review.elapsedDays).toBeCloseTo(cumulative / DAY_SECONDS, 4);
    }
    expect(schedule.summary.coveredDays).toBeCloseTo(cumulative / DAY_SECONDS, 2);
  });

  it('stops at the horizon rather than overshooting it', () => {
    const schedule = buildSchedule(schedulerById('leitner-5box'), options({ horizonDays: 30 }));
    expect(schedule.summary.coveredDays).toBeLessThanOrEqual(30);
    expect(schedule.summary.reachedHorizon).toBe(false);
  });

  it('stops at maxReviews and says that it did', () => {
    const schedule = buildSchedule(schedulerById('half-life'), options({ maxReviews: 3 }));
    expect(schedule.reviews).toHaveLength(3);
    expect(schedule.summary.reachedHorizon).toBe(true);
  });

  it('returns an empty calendar when nothing fits inside the horizon', () => {
    const schedule = buildSchedule(schedulerById('sm-2'), options({ horizonDays: 0.5 }));
    expect(schedule.reviews).toEqual([]);
    expect(schedule.summary).toMatchObject({
      reviews: 0,
      firstIntervalDays: 0,
      terminalIntervalDays: 0,
      coveredDays: 0,
      meanPredictedRecall: 0,
    });
  });

  it('holds the half-life scheduler at its target recall by construction', () => {
    const schedule = buildSchedule(schedulerById('half-life'), options({ maxReviews: 20 }));
    for (const review of schedule.reviews) {
      expect(review.predictedRecall).toBeCloseTo(0.9, 2);
    }
  });

  it('warns that a misattributed scheduler is misattributed', () => {
    const folk = buildSchedule(schedulerById('ebbinghaus-folk'), options());
    expect(folk.notes.some((note) => note.includes('It does not'))).toBe(true);
    const sm2 = buildSchedule(schedulerById('sm-2'), options());
    expect(sm2.notes.some((note) => note.includes('It does not'))).toBe(false);
    expect(sm2.notes.some((note) => note.includes('SuperMemo'))).toBe(true);
  });

  it('reports the no-review savings baseline alongside the schedule', () => {
    const schedule = buildSchedule(schedulerById('pimsleur-1967'), options({ horizonDays: 60 }));
    const savings = schedule.reviews.map((review) => review.predictedSavings);
    for (let index = 1; index < savings.length; index += 1) {
      expect(savings[index] as number).toBeLessThanOrEqual(savings[index - 1] as number);
    }
    // Pimsleur's first two reviews land inside the first minute, where the 1885
    // equation is clamped at its ceiling; everything after that decays.
    const past = schedule.reviews.filter((review) => review.elapsedDays * 1440 > 1);
    for (let index = 1; index < past.length; index += 1) {
      expect(past[index]?.predictedSavings).toBeLessThan(past[index - 1]?.predictedSavings as number);
    }
    expect(schedule.reviews[0]?.predictedSavings).toBe(100);
  });
});

describe('projectSchedulers', () => {
  it('rolls every scheduler forward over one shared horizon', () => {
    const rows = projectSchedulers(options({ maxReviews: 500 }));
    expect(rows).toHaveLength(SCHEDULERS.length);
    expect(rows.map((row) => row.scheduler)).toEqual(SCHEDULERS.map((scheduler) => scheduler.id));
  });

  it('finds an order-of-magnitude spread in the yearly review count', () => {
    const rows = projectSchedulers(options({ maxReviews: 500 }));
    const counts = Object.fromEntries(rows.map((row) => [row.scheduler, row.reviews]));
    expect(counts['sm-2']).toBe(5);
    expect(counts['half-life']).toBe(49);
    expect(counts['ebbinghaus-folk']).toBe(19);
    expect(counts['leitner-5box']).toBe(25);
    expect(counts['pimsleur-1967']).toBe(10);
  });

  it('shows the capped ladders reviewing more often and retaining less', () => {
    const rows = projectSchedulers(options({ maxReviews: 500 }));
    const folk = rows.find((row) => row.scheduler === 'ebbinghaus-folk');
    const sm2 = rows.find((row) => row.scheduler === 'sm-2');
    expect(folk?.terminalIntervalDays).toBe(30);
    expect(folk?.reviews).toBeGreaterThan(sm2?.reviews as number);
    // The folk ladder shows the item at roughly even odds of recall.
    expect(folk?.meanPredictedRecall).toBeLessThan(0.55);
    expect(folk?.meanPredictedRecall).toBeGreaterThan(0.45);
  });

  it('scales the yearly rate to the horizon', () => {
    const rows = projectSchedulers(options({ horizonDays: 730, maxReviews: 500 }));
    for (const row of rows) {
      expect(row.reviewsPerYear).toBeCloseTo((row.reviews / 730) * 365, 1);
    }
  });
});

describe('projectWorkload', () => {
  /** Workload options with everything defaulted, overridable per test. */
  function workloadOptions(overrides: Partial<WorkloadOptions> = {}): WorkloadOptions {
    return { ...options(), wordsPerDay: 20, ...overrides };
  }

  it('convolves the intake with the interval sequence', () => {
    const folk = projectWorkload(schedulerById('ebbinghaus-folk'), workloadOptions());
    expect(folk.reviewsPerWord).toBe(19);
    expect(folk.peakDailyReviews).toBe(380);
    expect(folk.peakDailyItems).toBe(400);
    expect(folk.steadyStateDailyReviews).toBeGreaterThan(300);
  });

  it('makes the capped ladder three times as expensive as SM-2', () => {
    const folk = projectWorkload(schedulerById('ebbinghaus-folk'), workloadOptions());
    const sm2 = projectWorkload(schedulerById('sm-2'), workloadOptions());
    expect(sm2.steadyStateDailyReviews).toBeLessThan(folk.steadyStateDailyReviews / 3);
    expect(sm2.totalReviews).toBeLessThan(folk.totalReviews);
  });

  it('ties the coverage estimate to the Cambridge headword list', () => {
    const projection = projectWorkload(schedulerById('sm-2'), workloadOptions({ wordsPerDay: 20 }));
    expect(projection.inputs.headwords).toBeGreaterThan(4000);
    expect(projection.daysToCoverHeadwords).toBe(Math.ceil(projection.inputs.headwords / 20));
    expect(projection.notes.some((note) => note.includes('Cambridge IELTS 1-22'))).toBe(true);
  });

  it('scales linearly with the intake', () => {
    const ten = projectWorkload(schedulerById('leitner-5box'), workloadOptions({ wordsPerDay: 10 }));
    const twenty = projectWorkload(schedulerById('leitner-5box'), workloadOptions({ wordsPerDay: 20 }));
    expect(twenty.totalReviews).toBe(ten.totalReviews * 2);
    expect(twenty.daysToCoverHeadwords).toBeLessThan(ten.daysToCoverHeadwords);
  });

  it('handles a horizon with no days in it', () => {
    const projection = projectWorkload(
      schedulerById('sm-2'),
      workloadOptions({ horizonDays: 0, wordsPerDay: 5 }),
    );
    expect(projection.totalReviews).toBe(0);
    expect(projection.peakDailyReviews).toBe(0);
    expect(projection.steadyStateDailyReviews).toBe(0);
  });
});

describe('gradeReview', () => {
  it('grades a first review under every scheduler', () => {
    for (const scheduler of SCHEDULERS) {
      const graded = gradeReview(scheduler, {
        repetitions: 0,
        lapses: 0,
        quality: 5,
        previousIntervalSeconds: 0,
        easeFactor: 2.5,
        targetRecall: 0.9,
      });
      expect(graded.scheduler).toBe(scheduler.id);
      expect(graded.correct).toBe(true);
      expect(graded.intervalSeconds).toBeGreaterThan(0);
      expect(graded.after.repetitions).toBe(1);
      expect(graded.predictedRecall).toBeGreaterThan(0);
      expect(graded.predictedRecall).toBeLessThanOrEqual(1);
    }
  });

  it('reconstructs the state a stateful trainer would have stored', () => {
    const graded = gradeReview(schedulerById('leitner-5box'), {
      repetitions: 3,
      lapses: 1,
      quality: 5,
      previousIntervalSeconds: 4 * DAY_SECONDS,
      easeFactor: 2.5,
      targetRecall: 0.9,
    });
    expect(graded.before.box).toBe(3);
    expect(graded.after.box).toBe(4);
    expect(graded.intervalSeconds).toBe(4 * DAY_SECONDS);
  });

  it('clamps a reconstructed Leitner box into 1-5', () => {
    const high = gradeReview(schedulerById('leitner-5box'), {
      repetitions: 40,
      lapses: 0,
      quality: 5,
      previousIntervalSeconds: 0,
      easeFactor: 2.5,
      targetRecall: 0.9,
    });
    expect(high.before.box).toBe(5);
    expect(high.atCeiling).toBe(true);
    const low = gradeReview(schedulerById('leitner-5box'), {
      repetitions: 0,
      lapses: 9,
      quality: 5,
      previousIntervalSeconds: 0,
      easeFactor: 2.5,
      targetRecall: 0.9,
    });
    expect(low.before.box).toBe(1);
  });

  it('uses the supplied easiness factor and previous interval for SM-2', () => {
    const graded = gradeReview(schedulerById('sm-2'), {
      repetitions: 4,
      lapses: 0,
      quality: 4,
      previousIntervalSeconds: 20 * DAY_SECONDS,
      easeFactor: 2.8,
      targetRecall: 0.9,
    });
    expect(graded.before.easeFactor).toBe(2.8);
    expect(graded.intervalSeconds).toBe(Math.round(20 * DAY_SECONDS * 2.8));
    expect(graded.after.easeFactor).toBe(updateEase(2.8, 4));
    expect(graded.atCeiling).toBe(false);
  });

  it('marks a failing grade as such', () => {
    const graded = gradeReview(schedulerById('ebbinghaus-folk'), {
      repetitions: 2,
      lapses: 0,
      quality: 2,
      previousIntervalSeconds: 0,
      easeFactor: 2.5,
      targetRecall: 0.9,
    });
    expect(graded.correct).toBe(false);
    expect(graded.after.lapses).toBe(1);
    expect(graded.after.mastery).toBeLessThan(graded.before.mastery as number);
  });

  it('reports the half-life ceiling once it is reached', () => {
    const graded = gradeReview(schedulerById('half-life'), {
      repetitions: 40,
      lapses: 0,
      quality: 5,
      previousIntervalSeconds: 0,
      easeFactor: 2.5,
      targetRecall: 0.9,
    });
    expect(graded.before.halfLifeDays).toBe(90);
    expect(graded.atCeiling).toBe(true);
  });

  it('reports the folk ceiling once mastery saturates', () => {
    const graded = gradeReview(schedulerById('ebbinghaus-folk'), {
      repetitions: 10,
      lapses: 0,
      quality: 5,
      previousIntervalSeconds: 0,
      easeFactor: 2.5,
      targetRecall: 0.9,
    });
    expect(graded.before.mastery).toBe(100);
    expect(graded.intervalSeconds).toBe(30 * DAY_SECONDS);
    expect(graded.atCeiling).toBe(true);
  });

  it('never reports a ceiling for the unbounded schedulers', () => {
    for (const id of ['sm-2', 'pimsleur-1967'] as const) {
      const graded = gradeReview(schedulerById(id), {
        repetitions: 30,
        lapses: 0,
        quality: 5,
        previousIntervalSeconds: 300 * DAY_SECONDS,
        easeFactor: 2.5,
        targetRecall: 0.9,
      });
      expect(graded.atCeiling).toBe(false);
    }
  });
});
