import { describe, expect, it } from 'vitest';

import {
  EBBINGHAUS_CURVE,
  MINUTES_PER_DAY,
  requireLibrary,
  reviewSchedule,
} from '../../src/data/retention.js';
import {
  addDays,
  compareSchedules,
  coverLibrary,
  curveFit,
  ebbinghausRetention,
  instantAfter,
  intervalsFor,
  masteryTrace,
  retentionProfile,
  reviewCalendar,
  round2,
  scheduleStages,
  simulateWorkload,
  studyDayIndex,
  studyDaysWithin,
} from '../../src/lib/retention.js';
import { MASTERY_RULE } from '../../src/data/retention.js';

const intraday = reviewSchedule('ielts-app-intraday');
const current = reviewSchedule('ielts-app-daily-current');
const previous = reviewSchedule('ielts-app-daily-2026-03');
const leitner = reviewSchedule('leitner-5box');
const sm2 = reviewSchedule('supermemo-2');
const pimsleur = reviewSchedule('pimsleur-gir');

describe('round2', () => {
  it('rounds to two decimal places', () => {
    expect(round2(1.005)).toBe(1);
    expect(round2(2.346)).toBe(2.35);
  });
});

describe('ebbinghausRetention', () => {
  it('returns full retention at the shortest time the curve is defined for', () => {
    expect(ebbinghausRetention(1)).toBe(1);
  });

  it('clamps sub-minute gaps rather than extrapolating below the data', () => {
    expect(ebbinghausRetention(0.0833)).toBe(1);
    expect(ebbinghausRetention(0)).toBe(1);
  });

  it('decreases monotonically with time', () => {
    const points = [1, 19, 63, 525, 1440, 44640].map((minutes) => ebbinghausRetention(minutes));
    for (let index = 1; index < points.length; index += 1) {
      expect(points[index] as number).toBeLessThan(points[index - 1] as number);
    }
  });

  it('accepts an explicit curve', () => {
    expect(ebbinghausRetention(1440, EBBINGHAUS_CURVE)).toBeCloseTo(0.3041, 4);
  });
});

describe('curveFit', () => {
  it('reproduces the seven published observations to within 3.3 percentage points', () => {
    const fit = curveFit();
    expect(fit.residuals).toHaveLength(7);
    expect(fit.maxAbsoluteResidual).toBeLessThan(3.3);
    expect(fit.rmse).toBeLessThan(2);
    for (const residual of fit.residuals) {
      expect(Math.abs(residual.residual)).toBeLessThanOrEqual(fit.maxAbsoluteResidual);
      expect(residual.predicted).toBeGreaterThan(0);
    }
  });

  it('accepts an explicit curve', () => {
    expect(curveFit(EBBINGHAUS_CURVE).rmse).toBe(curveFit().rmse);
  });
});

describe('intervalsFor', () => {
  it('returns the published intervals unchanged inside the published list', () => {
    expect(intervalsFor(leitner, 5, 100)).toEqual([...leitner.intervalsMinutes]);
  });

  it('repeats the last interval for a repeat-last terminal', () => {
    const intervals = intervalsFor(leitner, 7, 100);
    expect(intervals).toHaveLength(7);
    expect(intervals[5]).toBe(intervals[4]);
    expect(intervals[6]).toBe(intervals[4]);
  });

  it('multiplies by the ease factor for a multiplicative terminal', () => {
    const intervals = intervalsFor(sm2, 4, 100);
    expect(intervals).toEqual([1440, 8640, 21600, 54000]);
  });

  it('scales the terminal interval by mastery for a mastery-scaled terminal', () => {
    expect(intervalsFor(intraday, 9, 100).at(-1)).toBe(43200);
    expect(intervalsFor(intraday, 9, 0).at(-1)).toBe(21600);
    expect(intervalsFor(intraday, 9, 50).at(-1)).toBe(32400);
  });
});

describe('scheduleStages', () => {
  it('accumulates the intervals into calendar days', () => {
    const stages = scheduleStages(current, 8, 100);
    expect(stages.map((stage) => stage.calendarDay)).toEqual([1, 3, 7, 14, 29, 50, 80, 110]);
    expect(stages.every((stage) => !stage.sameDay)).toBe(true);
    expect(stages[0]?.elapsedDays).toBe(1);
  });

  it('marks the reviews that fall on the learning day', () => {
    const stages = scheduleStages(intraday, 8, 100);
    expect(stages.filter((stage) => stage.sameDay)).toHaveLength(3);
    expect(stages[0]?.elapsedMinutes).toBe(5);
    expect(stages[1]?.elapsedMinutes).toBe(35);
  });
});

describe('retentionProfile', () => {
  it('keeps the summary statistics consistent with the points', () => {
    const profile = retentionProfile(current, 8, 2, 100);
    expect(profile.points).toHaveLength(8);
    expect(profile.floor).toBeLessThanOrEqual(profile.mean);
    expect(profile.mean).toBeLessThanOrEqual(profile.ceiling);
    expect(profile.uniformity).toBeGreaterThanOrEqual(0);
    expect(profile.uniformity).toBeLessThanOrEqual(1);
    expect(profile.uniformity).toBeCloseTo(1 - profile.coefficientOfVariation, 4);
    expect(profile.points[0]?.stabilityFactor).toBe(1);
    expect(profile.points[1]?.stabilityFactor).toBe(2);
  });

  it('finds the current deployed schedule more uniform than the one it replaced', () => {
    const before = retentionProfile(previous, 8, 2, 100);
    const after = retentionProfile(current, 8, 2, 100);
    expect(after.uniformity).toBeGreaterThan(before.uniformity);
    // and yet lower: the change bought consistency by lowering retention everywhere.
    expect(after.mean).toBeLessThan(before.mean);
  });

  it('removes the consolidation assumption entirely at growth = 1', () => {
    const profile = retentionProfile(leitner, 5, 1, 100);
    expect(profile.points.every((point) => point.stabilityFactor === 1)).toBe(true);
    expect(profile.points[0]?.retention).toBe(Math.round(ebbinghausRetention(MINUTES_PER_DAY) * 1e4) / 1e4);
  });
});

describe('dating a schedule', () => {
  it('adds minutes to a date at midnight UTC', () => {
    expect(instantAfter('2026-01-01', 90).toISOString()).toBe('2026-01-01T01:30:00.000Z');
    expect(instantAfter('2026-01-01', 5 / 60).toISOString()).toBe('2026-01-01T00:00:05.000Z');
  });

  it('adds whole days to a date', () => {
    expect(addDays('2026-02-27', 3)).toBe('2026-03-02');
  });

  it('dates every review to the second', () => {
    const calendar = reviewCalendar(pimsleur, '2026-03-01', 3, 100);
    expect(calendar.map((entry) => entry.at)).toEqual([
      '2026-03-01T00:00:05Z',
      '2026-03-01T00:00:30Z',
      '2026-03-01T00:02:30Z',
    ]);
    expect(calendar[0]?.date).toBe('2026-03-01');
  });
});

describe('study-day arithmetic', () => {
  it('places study days at the start of every seven-day block', () => {
    expect([1, 2, 3, 4, 5, 6].map((n) => studyDayIndex(n, 5))).toEqual([0, 1, 2, 3, 4, 7]);
    expect(studyDayIndex(1, 7)).toBe(0);
    expect(studyDayIndex(8, 7)).toBe(7);
  });

  it('counts the study days inside a horizon', () => {
    expect(studyDaysWithin(14, 5)).toBe(10);
    expect(studyDaysWithin(10, 5)).toBe(8);
    expect(studyDaysWithin(3, 5)).toBe(3);
    expect(studyDaysWithin(7, 7)).toBe(7);
  });
});

describe('simulateWorkload', () => {
  const options = {
    newPerDay: 10,
    daysPerWeek: 7,
    days: 120,
    reviews: 8,
    mastery: 100,
    startDate: '2026-01-01',
  };

  it('reaches the closed-form steady state once every stage has fired', () => {
    const simulation = simulateWorkload(current, options);
    expect(simulation.steadyStateDailyTotal).toBe(90);
    expect(simulation.steadyStateDay).toBe(110);
    expect(simulation.peak.total).toBe(90);
    expect(simulation.timeline).toHaveLength(120);
    expect(simulation.totalNewWords).toBe(1200);
    expect(simulation.timeline[0]?.reviews).toBe(0);
    expect(simulation.timeline[0]?.newWords).toBe(10);
  });

  it('reports no steady state when the horizon is shorter than the schedule', () => {
    const simulation = simulateWorkload(current, { ...options, days: 10 });
    expect(simulation.steadyStateDay).toBeNull();
    expect(simulation.meanDailyTotal).toBeGreaterThan(0);
  });

  it('leaves review days in place on a part-time week', () => {
    const simulation = simulateWorkload(current, { ...options, daysPerWeek: 5, days: 21 });
    const rest = simulation.timeline.filter((day) => !day.studyDay);
    expect(rest.length).toBe(6);
    expect(rest.every((day) => day.newWords === 0)).toBe(true);
    expect(rest.some((day) => day.reviews > 0)).toBe(true);
  });
});

describe('compareSchedules', () => {
  it('finds no agreement at all between the two schedules of one application', () => {
    const comparison = compareSchedules(previous, current, 100);
    expect(comparison.divergences).toHaveLength(8);
    expect(comparison.comparableReviews).toBe(8);
    expect(comparison.agreements).toBe(0);
    expect(comparison.agreementRate).toBe(0);
    expect(comparison.maxDifferenceDays).toBe(30);
    expect(comparison.horizonDays).toEqual({ a: 80, b: 110 });
  });

  it('records a null where only one schedule publishes an interval', () => {
    const shorter = compareSchedules(leitner, current, 100);
    expect(shorter.divergences).toHaveLength(8);
    expect(shorter.comparableReviews).toBe(5);
    expect(shorter.agreements).toBe(3);
    expect(shorter.agreementRate).toBe(60);
    expect(shorter.divergences[5]).toEqual({ review: 5, a: null, b: 50, difference: null, agrees: false });

    const flipped = compareSchedules(current, leitner, 100);
    expect(flipped.divergences[5]).toEqual({ review: 5, a: 50, b: null, difference: null, agrees: false });
    expect(flipped.agreementRate).toBe(60);
  });
});

describe('coverLibrary', () => {
  const library = requireLibrary('cambridge-1-22-api', 'library');

  it('separates the day of the last new word from the day of the last review', () => {
    const report = coverLibrary(library, current, {
      newPerDay: 20,
      daysPerWeek: 7,
      reviews: 8,
      mastery: 100,
      deadline: undefined,
    });
    expect(report.studyDaysNeeded).toBe(Math.ceil(library.words / 20));
    expect(report.firstPassDays).toBe(report.studyDaysNeeded);
    expect(report.maturityDays).toBe(report.firstPassDays + 110);
    expect(report.totalReviewEvents).toBe(library.words * 8);
    expect(report.deadline).toBeNull();
  });

  it('stretches the calendar when the learner studies part-time', () => {
    const report = coverLibrary(library, leitner, {
      newPerDay: 20,
      daysPerWeek: 5,
      reviews: 5,
      mastery: 100,
      deadline: undefined,
    });
    expect(report.firstPassDays).toBeGreaterThan(Math.ceil(library.words / 20));
    expect(report.steadyStateDailyTotal).toBe(round2((20 * 5 * 6) / 7));
  });

  it('reports the rate a deadline demands and whether it is reachable', () => {
    const report = coverLibrary(library, current, {
      newPerDay: 20,
      daysPerWeek: 7,
      reviews: 8,
      mastery: 100,
      deadline: 60,
    });
    expect(report.deadline).not.toBeNull();
    const deadline = report.deadline as NonNullable<typeof report.deadline>;
    expect(deadline.studyDaysAvailable).toBe(60);
    expect(deadline.requiredNewPerDay).toBe(Math.ceil(library.words / 60));
    expect(deadline.feasibleAtRequestedRate).toBe(false);
    expect(deadline.maturityWithinDeadline).toBe(false);

    const generous = coverLibrary(library, current, {
      newPerDay: 200,
      daysPerWeek: 7,
      reviews: 8,
      mastery: 100,
      deadline: 365,
    });
    const reachable = generous.deadline as NonNullable<typeof generous.deadline>;
    expect(reachable.feasibleAtRequestedRate).toBe(true);
    expect(reachable.maturityWithinDeadline).toBe(true);
  });
});

describe('masteryTrace', () => {
  it('applies the reward and the penalty asymmetrically', () => {
    const trace = masteryTrace(MASTERY_RULE, [true, false], [3, 3], 50);
    expect(trace.steps[0]?.change).toBe(15);
    expect(trace.steps[1]?.change).toBe(-24);
    expect(trace.final).toBe(41);
    expect(trace.correct).toBe(1);
    expect(trace.wrong).toBe(1);
    expect(trace.clamped).toBe(0);
    expect(trace.breakEvenAccuracy).toBe(0.6154);
  });

  it('clamps at both ends of the range and reports the points lost', () => {
    const high = masteryTrace(MASTERY_RULE, [true, true], [5, 5], 90);
    expect(high.final).toBe(100);
    expect(high.clamped).toBe(40);

    const low = masteryTrace(MASTERY_RULE, [false], [5], 10);
    expect(low.final).toBe(0);
    expect(low.clamped).toBe(30);
  });

  it('is a no-op for an empty answer list', () => {
    const trace = masteryTrace(MASTERY_RULE, [], [], 42);
    expect(trace.final).toBe(42);
    expect(trace.steps).toHaveLength(0);
  });
});
