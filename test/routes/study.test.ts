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
