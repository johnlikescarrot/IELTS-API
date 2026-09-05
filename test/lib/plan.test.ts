import { describe, expect, it } from 'vitest';

import {
  PLAN_PHASES,
  buildStudyPlan,
  estimateFeasibility,
  hoursPerHalfBand,
  normalizeStudyPlanInput,
  skillAllocations,
} from '../../src/lib/plan.js';

import type { PlanWeek, Skill } from '../../src/types.js';

const BASE = {
  current: { listening: 6, reading: 6, writing: 5.5, speaking: 6 },
  target: 7,
  weeks: 8,
  hoursPerWeek: 10,
  startDate: '2026-09-07',
};

const SKILLS: readonly Skill[] = ['listening', 'reading', 'writing', 'speaking'];

describe('hoursPerHalfBand', () => {
  it('tiers with the current band (diminishing returns)', () => {
    expect(hoursPerHalfBand(4)).toBe(100);
    expect(hoursPerHalfBand(5)).toBe(140);
    expect(hoursPerHalfBand(6)).toBe(200);
    expect(hoursPerHalfBand(7)).toBe(280);
    expect(hoursPerHalfBand(8)).toBe(360);
    expect(hoursPerHalfBand(0)).toBe(100);
    expect(hoursPerHalfBand(9)).toBe(360);
  });
});

describe('estimateFeasibility', () => {
  it('reports at-target without any required hours', () => {
    const result = estimateFeasibility(7, 7, 4, 10);
    expect(result.verdict).toBe('at-target');
    expect(result.gap).toBe(0);
    expect(result.requiredHours).toBe(0);
    expect(result.weeksRequired).toBe(0);
    expect(result.projectedGain).toBe(0);
  });

  it('treats overshooting the target as at-target too', () => {
    const result = estimateFeasibility(7.5, 7, 4, 10);
    expect(result.verdict).toBe('at-target');
    expect(result.gap).toBe(0);
  });

  it('calls a funded schedule achievable', () => {
    // One half band at a mean of 6 costs 200 hours; 20 weeks x 10 h = 200 h.
    const result = estimateFeasibility(6, 6.5, 20, 10);
    expect(result.verdict).toBe('achievable');
    expect(result.requiredHours).toBe(200);
    expect(result.weeksRequired).toBe(20);
    expect(result.projectedGain).toBe(0.5);
  });

  it('calls a 70% funded schedule ambitious and a 10% one insufficient', () => {
    const ambitious = estimateFeasibility(6, 6.5, 14, 10);
    expect(ambitious.verdict).toBe('ambitious');
    expect(ambitious.projectedGain).toBe(0);
    const lacking = estimateFeasibility(6, 7, 4, 10);
    expect(lacking.verdict).toBe('insufficient-time');
  });

  it('caps the projection at the target band', () => {
    const result = estimateFeasibility(6, 6.5, 100, 10);
    expect(result.projectedGain).toBe(0.5);
  });

  it('floors projected gains to complete half-band steps', () => {
    // 120 h available at 100 h per half band: one full half band, no more.
    const result = estimateFeasibility(4, 5.5, 12, 10);
    expect(result.projectedGain).toBe(0.5);
    expect(result.weeksRequired).toBe(30);
    expect(result.verdict).toBe('insufficient-time');
  });
});

describe('skillAllocations', () => {
  it('conserves the budget in five-minute units and favours gaps', () => {
    const allocations = skillAllocations(BASE.current, 7, 600);
    expect(allocations.map((a) => a.skill)).toEqual([...SKILLS]);
    expect(allocations.map((a) => a.minutesPerWeek)).toEqual([135, 135, 200, 130]);
    const total = allocations.reduce((sum, a) => sum + a.minutesPerWeek, 0);
    expect(total).toBe(600);
    for (const allocation of allocations) {
      expect(allocation.minutesPerWeek % 5).toBe(0);
      expect(allocation.gap).toBe(Math.max(0, 7 - allocation.current));
    }
  });

  it('spreads a uniform maintenance budget when every skill is at target', () => {
    const allocations = skillAllocations({ listening: 7, reading: 7, writing: 7, speaking: 7 }, 7, 600);
    expect(allocations.every((a) => a.minutesPerWeek === 150)).toBe(true);
    expect(allocations.every((a) => a.gap === 0 && a.weight === 0.25)).toBe(true);
  });

  it('starves maintenance skills first when one huge gap meets a tiny budget', () => {
    const allocations = skillAllocations({ listening: 9, reading: 9, writing: 9, speaking: 0 }, 9, 60);
    expect(allocations.map((a) => a.minutesPerWeek)).toEqual([5, 0, 0, 55]);
    expect(allocations.reduce((sum, a) => sum + a.minutesPerWeek, 0)).toBe(60);
  });
});

describe('normalizeStudyPlanInput', () => {
  it('fills defaults and derives a canonical seed', () => {
    const normalized = normalizeStudyPlanInput(BASE);
    expect(normalized.restDays).toBe(0);
    expect(normalized.studyDays).toBe(7);
    expect(normalized.minutesPerWeek).toBe(600);
    expect(normalized.seed).toBe('studyplan:2026-09-07:5.875->7:8w10h0r');
  });

  it('keeps explicit rest days and seeds', () => {
    const normalized = normalizeStudyPlanInput({ ...BASE, restDays: 2, seed: 'custom' });
    expect(normalized.studyDays).toBe(5);
    expect(normalized.seed).toBe('custom');
  });

  it('rejects out-of-range or fractional controls', () => {
    expect(() => normalizeStudyPlanInput({ ...BASE, weeks: 0 })).toThrowError(/weeks/);
    expect(() => normalizeStudyPlanInput({ ...BASE, weeks: 53 })).toThrowError(/weeks/);
    expect(() => normalizeStudyPlanInput({ ...BASE, weeks: 4.5 })).toThrowError(/weeks/);
    expect(() => normalizeStudyPlanInput({ ...BASE, hoursPerWeek: 0 })).toThrowError(/hoursPerWeek/);
    expect(() => normalizeStudyPlanInput({ ...BASE, hoursPerWeek: 81 })).toThrowError(/hoursPerWeek/);
    expect(() => normalizeStudyPlanInput({ ...BASE, restDays: 4 })).toThrowError(/restDays/);
    expect(() => normalizeStudyPlanInput({ ...BASE, restDays: -1 })).toThrowError(/restDays/);
  });

  it('rejects malformed dates and bands', () => {
    expect(() => normalizeStudyPlanInput({ ...BASE, startDate: 'tomorrow' })).toThrowError(/startDate/);
    expect(() => normalizeStudyPlanInput({ ...BASE, startDate: '2026-13-45' })).toThrowError(/startDate/);
    expect(() => normalizeStudyPlanInput({ ...BASE, target: 6.25 })).toThrowError(/target/);
    expect(() =>
      normalizeStudyPlanInput({ ...BASE, current: { ...BASE.current, listening: 9.5 } }),
    ).toThrowError(/current\.listening/);
  });
});

describe('buildStudyPlan', () => {
  it('is fully deterministic for identical inputs', () => {
    const first = buildStudyPlan(BASE);
    const second = buildStudyPlan(BASE);
    expect(first).toEqual(second);
    expect(buildStudyPlan({ ...BASE, seed: 'other' })).not.toEqual(first);
  });

  it('schedules one week per requested week across the four phases', () => {
    const plan = buildStudyPlan({ ...BASE, weeks: 12 });
    expect(plan.schedule).toHaveLength(12);
    expect(plan.schedule[0]?.phase).toBe('foundation');
    expect(plan.schedule[4]?.phase).toBe('skill-build');
    expect(plan.schedule[9]?.phase).toBe('exam-practice');
    expect(plan.schedule[11]?.phase).toBe('assessment-taper');
    expect([...PLAN_PHASES]).toEqual(['foundation', 'skill-build', 'exam-practice', 'assessment-taper']);
  });

  it('conserves the weekly budget in every week', () => {
    const plan = buildStudyPlan({ ...BASE, weeks: 4, restDays: 3 });
    for (const week of plan.schedule) {
      expect(week.totalMinutes).toBe(600);
      expect(week.sessions.reduce((sum, session) => sum + session.minutes, 0)).toBe(600);
      for (const session of week.sessions) {
        expect(session.day).toBeGreaterThanOrEqual(1);
        expect(session.day).toBeLessThanOrEqual(plan.studyDays);
        expect(session.minutes % 5).toBe(0);
      }
    }
    expect(plan.studyDays).toBe(4);
  });

  it('advances the schedule by exactly one calendar week per plan week', () => {
    const plan = buildStudyPlan({ ...BASE, weeks: 2 });
    const first = plan.schedule[0] as PlanWeek;
    const second = plan.schedule[1] as PlanWeek;
    const firstDate = (first.sessions[0] as (typeof first.sessions)[number]).date;
    const secondDate = (second.sessions[0] as (typeof second.sessions)[number]).date;
    expect(firstDate).toBe('2026-09-07');
    const dayMs = 24 * 3600 * 1000;
    const delta =
      (new Date(`${secondDate}T00:00:00Z`).getTime() - new Date(`${firstDate}T00:00:00Z`).getTime()) / dayMs;
    expect(delta).toBe(7);
  });

  it('adds the error-log review every week and the mock only in funded taper weeks', () => {
    const regular = buildStudyPlan({ ...BASE, weeks: 4 });
    expect(
      regular.schedule.every((week) => week.sessions.some((s) => s.activityId === 'error-log-review')),
    ).toBe(true);
    expect(
      regular.schedule.every((week) => !week.sessions.some((s) => s.activityId === 'full-mock-test')),
    ).toBe(true);
    const tapered = buildStudyPlan({ ...BASE, weeks: 12 });
    const taperWeeks = tapered.schedule.filter((week) => week.phase === 'assessment-taper');
    expect(taperWeeks.length).toBeGreaterThan(0);
    expect(taperWeeks.every((week) => week.sessions.some((s) => s.activityId === 'full-mock-test'))).toBe(
      true,
    );
    const starved = buildStudyPlan({
      current: { listening: 7, reading: 7, writing: 7, speaking: 7 },
      target: 7,
      weeks: 12,
      hoursPerWeek: 1,
      startDate: '2026-09-07',
    });
    expect(
      starved.schedule.some((week) => week.sessions.some((s) => s.activityId === 'error-log-review')),
    ).toBe(false);
    expect(
      starved.schedule.some((week) => week.sessions.some((s) => s.activityId === 'full-mock-test')),
    ).toBe(false);
  });

  it('materialises deterministic, self-instantiating session endpoints', () => {
    const plan = buildStudyPlan(BASE);
    const linked = plan.schedule
      .flatMap((week) => week.sessions)
      .filter((session) => session.endpoint !== null);
    expect(linked.length).toBeGreaterThan(0);
    for (const session of linked) {
      const endpoint = session.endpoint as string;
      expect(endpoint).not.toContain('{');
      if (endpoint.includes('seed=')) {
        expect(endpoint).toContain(`seed=${plan.seed}:w`);
      }
    }
    const dated = linked.find((session) =>
      (session.endpoint ?? '').includes('date='),
    ) as (typeof linked)[number];
    expect(dated.endpoint).toContain(dated.date);
    const quizLink = linked.find((session) => (session.endpoint ?? '').startsWith('/v1/quiz'));
    expect(quizLink).toBeDefined();
  });

  it('focuses on gapped skills, or on all skills when the target is met', () => {
    const gapPlan = buildStudyPlan({
      ...BASE,
      current: { listening: 7, reading: 7, writing: 5.5, speaking: 7 },
    });
    expect(gapPlan.schedule[0]?.focus).toEqual(['writing']);
    const metPlan = buildStudyPlan({ ...BASE, target: 5.5 });
    expect(metPlan.schedule[0]?.focus).toEqual([...SKILLS]);
    expect(metPlan.feasibility.verdict).toBe('at-target');
  });

  it('aggregates totals consistently across weeks and skills', () => {
    const plan = buildStudyPlan(BASE);
    const sessions = plan.schedule.reduce((sum, week) => sum + week.sessions.length, 0);
    const minutes = plan.schedule.reduce((sum, week) => sum + week.totalMinutes, 0);
    expect(plan.totals.sessions).toBe(sessions);
    expect(plan.totals.minutes).toBe(minutes);
    expect(minutes).toBe(8 * 600);
    const bySkillSum = Object.values(plan.totals.bySkill).reduce((sum, value) => sum + value, 0);
    expect(bySkillSum).toBe(minutes);
    expect(plan.methodology.length).toBeGreaterThanOrEqual(5);
    expect(plan.totals.bySkill.general).toBeGreaterThan(0);
  });

  it('handles single-week plans and zero-minute skills without gaps', () => {
    const oneWeek = buildStudyPlan({ ...BASE, weeks: 1 });
    expect(oneWeek.schedule[0]?.phase).toBe('foundation');
    const skewed = buildStudyPlan({
      current: { listening: 9, reading: 9, writing: 9, speaking: 0 },
      target: 9,
      weeks: 1,
      hoursPerWeek: 1,
      startDate: '2026-09-07',
    });
    const sessions = skewed.schedule[0]?.sessions as PlanWeek['sessions'];
    const skillsUsed = new Set(sessions.map((session) => session.skill));
    expect(skillsUsed.has('speaking')).toBe(true);
    expect(skillsUsed.has('reading')).toBe(false);
    expect(skewed.schedule[0]?.totalMinutes).toBe(60);
    expect(sessions.length).toBeLessThan(5);
  });

  it('propagates validation errors from the shared band checker', () => {
    expect(() => buildStudyPlan({ ...BASE, target: 10 })).toThrowError(/target/);
    expect(() => buildStudyPlan({ ...BASE, current: { ...BASE.current, reading: 4.2 } })).toThrowError(
      /current\.reading/,
    );
  });
});
