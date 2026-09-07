import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { StudyPlan } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/study/plan', () => {
  it('builds an eight-week plan with every default applied', async () => {
    const response = await server.json<StudyPlan>('/v1/study/plan?target=7');
    expect(response.status).toBe(200);
    expect(response.data.inputs).toEqual({
      target: 7,
      weeks: 8,
      hoursPerWeek: 10,
      wordsPerDay: 10,
      providedComponents: [],
      defaultedComponents: ['listening', 'reading', 'writing', 'speaking'],
    });
    expect(response.data.current.components).toEqual({
      listening: 5.5,
      reading: 5.5,
      writing: 5.5,
      speaking: 5.5,
    });
    expect(response.data.weekly).toHaveLength(8);
    expect(response.data.vocabulary.headwordsAvailable).toBe(4174);
    expect(response.meta.method).toContain('Gaps are weighted');
  });

  it('echoes supplied components and applies defaults only to the rest', async () => {
    const response = await server.json<StudyPlan>(
      '/v1/study/plan?target=7&listening=6&reading=6.5&weeks=12&hoursPerWeek=14&wordsPerDay=20',
    );
    expect(response.data.inputs.providedComponents).toEqual(['listening', 'reading']);
    expect(response.data.inputs.defaultedComponents).toEqual(['writing', 'speaking']);
    expect(response.data.current.components.writing).toBe(5.5);
    expect(response.data.current.components.listening).toBe(6);
    expect(response.data.weekly).toHaveLength(12);
    expect(response.data.vocabulary.wordsPerWeek).toBe(140);
  });

  it('is deterministic for identical queries', async () => {
    const first = await server.json('/v1/study/plan?target=6.5&weeks=6');
    const second = await server.json('/v1/study/plan?target=6.5&weeks=6');
    expect(JSON.stringify(second.data)).toBe(JSON.stringify(first.data));
  });

  it('requires the target parameter', async () => {
    const response = await server.json('/v1/study/plan');
    expect(response.status).toBe(400);
    expect((response.meta.error as { details: Record<string, string> }).details.parameter).toBe('target');
  });

  it('rejects targets below the planning floor', async () => {
    const response = await server.json('/v1/study/plan?target=3.5');
    expect(response.status).toBe(400);
    const error = response.meta.error as { details: Record<string, string>; message: string };
    expect(error.details.min).toBe('4');
    expect(error.message).toContain('at least 4');
  });

  it('rejects non-band targets and components', async () => {
    const badTarget = await server.json('/v1/study/plan?target=7.25');
    expect(badTarget.status).toBe(400);

    const badComponent = await server.json('/v1/study/plan?target=7&speaking=12');
    expect(badComponent.status).toBe(400);
    expect((badComponent.meta.error as { details: Record<string, string> }).details.parameter).toBe(
      'speaking',
    );
  });

  it('validates the time budget', async () => {
    const zeroWeeks = await server.json('/v1/study/plan?target=7&weeks=0');
    expect(zeroWeeks.status).toBe(400);

    const longWeeks = await server.json('/v1/study/plan?target=7&weeks=53');
    expect(longWeeks.status).toBe(400);

    const heavyHours = await server.json('/v1/study/plan?target=7&hoursPerWeek=80.5');
    expect(heavyHours.status).toBe(400);

    const lowHours = await server.json('/v1/study/plan?target=7&hoursPerWeek=0.5');
    expect(lowHours.status).toBe(400);
  });
});

describe('GET /v1/study/srs', () => {
  it('schedules a new word from the default anchor', async () => {
    const response = await server.json<{
      anchor: string;
      status: string;
      nextReviewInMinutes: number;
      ladderMinutes: number[];
      upcoming: { review: number; due: string }[];
      reviewWindow: { date: string; time: string };
      masteryProjection: null;
    }>('/v1/study/srs?from=2026-09-07');
    expect(response.status).toBe(200);
    expect(response.data.anchor).toBe('2026-09-07T20:00:00.000Z');
    expect(response.data.status).toBe('new');
    expect(response.data.nextReviewInMinutes).toBe(5);
    expect(response.data.ladderMinutes).toHaveLength(8);
    expect(response.data.upcoming).toHaveLength(8);
    expect(response.data.reviewWindow).toMatchObject({ date: '2026-09-07', time: '20:00' });
    expect(response.data.masteryProjection).toBeNull();
    expect(response.meta.method).toContain('Ebbinghaus');
  });

  it('honours reviews, mastery, time and step count', async () => {
    const response = await server.json<{
      status: string;
      nextReviewInMinutes: number;
      upcoming: unknown[];
      reviewWindow: { date: string; time: string; start: string; end: string };
    }>('/v1/study/srs?from=2026-09-07&time=07:30&reviews=3&mastery=70&steps=2');
    expect(response.data.status).toBe('learning');
    expect(response.data.nextReviewInMinutes).toBe(1440);
    expect(response.data.upcoming).toHaveLength(2);
    expect(response.data.reviewWindow).toEqual({
      date: '2026-09-07',
      time: '07:30',
      start: '2026-09-07T05:30:00.000Z',
      end: '2026-09-07T09:30:00.000Z',
    });
  });

  it('projects mastery after a reported recall', async () => {
    const correct = await server.json<{
      masteryProjection: { correct: boolean; confidence: number; from: number; to: number };
    }>('/v1/study/srs?from=2026-09-07&mastery=70&correct=true&confidence=4');
    expect(correct.data.masteryProjection).toMatchObject({
      correct: true,
      confidence: 4,
      from: 70,
      to: 90,
    });

    const miss = await server.json<{
      masteryProjection: { correct: boolean; confidence: number; to: number };
    }>('/v1/study/srs?from=2026-09-07&mastery=70&correct=0');
    expect(miss.data.masteryProjection).toMatchObject({ correct: false, confidence: 3, to: 46 });

    const numeric = await server.json<{
      masteryProjection: { correct: boolean };
    }>('/v1/study/srs?from=2026-09-07&mastery=70&correct=1');
    expect(numeric.data.masteryProjection.correct).toBe(true);
  });

  it('is deterministic for identical queries', async () => {
    const first = await server.json('/v1/study/srs?from=2026-09-07&reviews=2&mastery=40');
    const second = await server.json('/v1/study/srs?from=2026-09-07&reviews=2&mastery=40');
    expect(JSON.stringify(second.data)).toBe(JSON.stringify(first.data));
  });

  it('validates the scheduler inputs', async () => {
    expect((await server.json('/v1/study/srs?from=2026-09-07&reviews=31')).status).toBe(400);
    expect((await server.json('/v1/study/srs?from=2026-09-07&mastery=101')).status).toBe(400);
    expect((await server.json('/v1/study/srs?from=2026-09-07&steps=0')).status).toBe(400);
    expect((await server.json('/v1/study/srs?from=07-09-2026')).status).toBe(400);
    expect((await server.json('/v1/study/srs?from=2026-09-07&time=8pm')).status).toBe(400);
    expect((await server.json('/v1/study/srs?from=2026-09-07&time=24:00')).status).toBe(400);
    expect((await server.json('/v1/study/srs?from=2026-09-07&correct=maybe')).status).toBe(400);
    expect((await server.json('/v1/study/srs?from=2026-09-07&correct=true&confidence=6')).status).toBe(400);
  });
});

describe('GET /v1/study/mistakes', () => {
  it('lists the five mistake types with protocols and drills', async () => {
    const response =
      await server.json<{ id: string; signals: string[]; protocol: string[]; drills: { url: string }[] }[]>(
        '/v1/study/mistakes',
      );
    expect(response.status).toBe(200);
    expect(response.data.map((row) => row.id)).toEqual([
      'recognition',
      'listening',
      'spelling',
      'pronunciation',
      'usage',
    ]);
    expect(response.meta.total).toBe(5);
    expect(response.meta.type).toBeNull();
    expect(response.meta.elimination).toContain('/v1/study/srs');
  });

  it('filters to one mistake type', async () => {
    const response = await server.json<{ id: string }[]>('/v1/study/mistakes?type=spelling');
    expect(response.status).toBe(200);
    expect(response.data.map((row) => row.id)).toEqual(['spelling']);
    expect(response.meta.total).toBe(1);
    expect(response.meta.type).toBe('spelling');
  });

  it('rejects unknown mistake types', async () => {
    const response = await server.json('/v1/study/mistakes?type=grammar');
    expect(response.status).toBe(400);
  });
});
