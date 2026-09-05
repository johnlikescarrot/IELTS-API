import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { StudyActivity, StudyPlan } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/plan', () => {
  it('generates a deterministic plan from one current band', async () => {
    const response = await server.json<StudyPlan>('/v1/plan?current=6&target=7&weeks=4&startDate=2026-09-07');
    expect(response.status).toBe(200);
    expect(response.data.current).toEqual({ listening: 6, reading: 6, writing: 6, speaking: 6 });
    expect(response.data.target).toBe(7);
    expect(response.data.schedule).toHaveLength(4);
    expect(response.data.totals.minutes).toBe(4 * 10 * 60);
    expect(response.data.feasibility.verdict).toBe('insufficient-time');
    expect(response.data.allocations.every((a) => a.gap === 1)).toBe(true);
    expect(response.meta.seed).toBe(response.data.seed);
    expect(response.meta.deterministic).toBe(true);
    const again = await server.json<StudyPlan>('/v1/plan?current=6&target=7&weeks=4&startDate=2026-09-07');
    expect(again.data).toEqual(response.data);
  });

  it('accepts four component bands and per-skill overrides', async () => {
    const four = await server.json<StudyPlan>('/v1/plan?current=6.5,6,5.5,6&startDate=2026-09-07');
    expect(four.status).toBe(200);
    expect(four.data.current).toEqual({ listening: 6.5, reading: 6, writing: 5.5, speaking: 6 });
    const overridden = await server.json<StudyPlan>(
      '/v1/plan?current=6&currentWriting=4.5&startDate=2026-09-07',
    );
    expect(overridden.data.current.writing).toBe(4.5);
    expect(overridden.data.current.listening).toBe(6);
  });

  it('honours rest days, an explicit seed and the default target', async () => {
    const plan = await server.json<StudyPlan>(
      '/v1/plan?current=6&weeks=2&restDays=2&seed=alpha&startDate=2026-09-07',
    );
    expect(plan.data.restDays).toBe(2);
    expect(plan.data.studyDays).toBe(5);
    expect(plan.data.seed).toBe('alpha');
    expect(plan.data.target).toBe(7);
    const sessions = plan.data.schedule[0]?.sessions as StudyPlan['schedule'][number]['sessions'];
    expect(sessions.every((session) => session.day <= 5)).toBe(true);
  });

  it('rejects malformed inputs with 400 responses', async () => {
    expect((await server.json('/v1/plan')).status).toBe(400); // missing current
    expect((await server.json('/v1/plan?current=6,7')).status).toBe(400); // two bands
    expect((await server.json('/v1/plan?current=abc')).status).toBe(400); // not a band
    expect((await server.json('/v1/plan?current=6.25')).status).toBe(400); // off the 0.5 grid
    expect((await server.json('/v1/plan?current=6&target=9.5')).status).toBe(400);
    expect((await server.json('/v1/plan?current=6&weeks=53')).status).toBe(400);
    expect((await server.json('/v1/plan?current=6&hoursPerWeek=0')).status).toBe(400);
    expect((await server.json('/v1/plan?current=6&restDays=5')).status).toBe(400);
    expect((await server.json('/v1/plan?current=6&startDate=nope')).status).toBe(400);
    expect((await server.json('/v1/plan?current=6&startDate=2025-02-30')).status).toBe(400);
  });
});

describe('GET /v1/plan/estimate', () => {
  it('estimates hours and weeks for the overall and per-skill gaps', async () => {
    const response = await server.json<{
      overall: { verdict: string; weeksRequired: number; requiredHours: number };
      skills: { skill: string; requiredHours: number }[];
    }>('/v1/plan/estimate?current=6&target=7&hoursPerWeek=10&weeks=40');
    expect(response.status).toBe(200);
    expect(response.data.overall.weeksRequired).toBe(40);
    expect(response.data.overall.requiredHours).toBe(400);
    expect(response.data.overall.verdict).toBe('achievable');
    expect(response.data.skills.map((s) => s.skill)).toEqual(['listening', 'reading', 'writing', 'speaking']);
    expect(response.meta.weeks).toBe(40);
    expect(String(response.meta.note)).toContain('not a score prediction');
  });

  it('applies defaults for the unconstrained parameters', async () => {
    const response = await server.json<{ overall: { target: number; verdict: string } }>(
      '/v1/plan/estimate?current=7',
    );
    expect(response.data.overall.target).toBe(7);
    expect(response.data.overall.verdict).toBe('at-target');
    expect(response.meta.hoursPerWeek).toBe(10);
  });

  it('rejects invalid bands and ranges', async () => {
    expect((await server.json('/v1/plan/estimate?current=6&target=6.2')).status).toBe(400);
    expect((await server.json('/v1/plan/estimate?current=6&weeks=0')).status).toBe(400);
  });
});

describe('GET /v1/plan/activities', () => {
  it('lists the full catalogue by default', async () => {
    const response = await server.json<StudyActivity[]>('/v1/plan/activities');
    expect(response.status).toBe(200);
    expect(response.data.length).toBeGreaterThanOrEqual(24);
    expect(response.meta.count).toBe(response.data.length);
    expect(response.meta.total).toBe(response.data.length);
    expect(response.meta.bySkill).toMatchObject({ general: 2 });
  });

  it('filters by skill, phase, band and free text', async () => {
    const speaking = await server.json<StudyActivity[]>('/v1/plan/activities?skill=speaking');
    expect(speaking.data.every((activity) => activity.skill === 'speaking')).toBe(true);
    expect(speaking.meta.skill).toBe('speaking');

    const taper = await server.json<StudyActivity[]>('/v1/plan/activities?phase=assessment-taper');
    expect(taper.data.every((activity) => activity.phases.includes('assessment-taper'))).toBe(true);
    expect(taper.meta.phase).toBe('assessment-taper');

    const lowBand = await server.json<StudyActivity[]>('/v1/plan/activities?band=0.5');
    expect(lowBand.data.length).toBeGreaterThan(0);
    expect(lowBand.data.every((activity) => activity.minBand <= 0.5 && 0.5 <= activity.maxBand)).toBe(true);

    const highBand = await server.json<StudyActivity[]>('/v1/plan/activities?band=8');
    expect(highBand.meta.band).toBe(8);
    expect(highBand.data.length).toBeLessThan(
      (await server.json<StudyActivity[]>('/v1/plan/activities')).data.length,
    );

    const searched = await server.json<StudyActivity[]>('/v1/plan/activities?q=dictation');
    expect(searched.data.some((activity) => activity.id === 'listening-dictation')).toBe(true);
    const missed = await server.json<StudyActivity[]>('/v1/plan/activities?q=zzyzx');
    expect(missed.data).toEqual([]);
  });

  it('rejects unknown enum values', async () => {
    expect((await server.json('/v1/plan/activities?skill=magic')).status).toBe(400);
    expect((await server.json('/v1/plan/activities?phase=naptime')).status).toBe(400);
    expect((await server.json('/v1/plan/activities?band=11')).status).toBe(400);
  });
});
