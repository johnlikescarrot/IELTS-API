import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { ReviewSchedule, StudyPlan } from '../../src/types.js';

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

describe('GET /v1/study/review', () => {
  it('schedules the next review and projects the SM-2 ladder', async () => {
    const response = await server.json<ReviewSchedule>('/v1/study/review?quality=4&today=2026-09-07');
    expect(response.status).toBe(200);
    expect(response.data.schedule).toEqual({
      easiness: 2.5,
      repetitions: 1,
      interval: 1,
      due: '2026-09-08',
    });
    expect(response.data.projected).toHaveLength(5);
    expect(response.data.projected[0]?.due).toBe('2026-09-14');
    expect(response.data.recall.forgotten).toBe(false);
    expect(response.meta.method).toContain('SM-2');
  });

  it('honours an item history instead of starting from scratch', async () => {
    const response = await server.json<ReviewSchedule>(
      '/v1/study/review?quality=4&repetitions=2&interval=6&today=2026-09-07',
    );
    expect(response.data.schedule).toEqual({
      easiness: 2.5,
      repetitions: 3,
      interval: 15,
      due: '2026-09-22',
    });
  });

  it('resets a forgotten item without changing its easiness factor', async () => {
    const response = await server.json<ReviewSchedule>(
      '/v1/study/review?quality=2&repetitions=9&easiness=2.8&interval=30&today=2026-09-07',
    );
    expect(response.data.recall.forgotten).toBe(true);
    expect(response.data.schedule).toEqual({ easiness: 2.8, repetitions: 0, interval: 1, due: '2026-09-08' });
  });

  it('defaults today to the current UTC date', async () => {
    const response = await server.json<ReviewSchedule>('/v1/study/review?quality=5');
    expect(response.status).toBe(200);
    expect(response.data.inputs.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(response.data.schedule.due).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('is deterministic for identical queries', async () => {
    const first = await server.json('/v1/study/review?quality=4&today=2026-09-07&easiness=2.4');
    const second = await server.json('/v1/study/review?quality=4&today=2026-09-07&easiness=2.4');
    expect(JSON.stringify(second.data)).toBe(JSON.stringify(first.data));
  });

  it('requires the quality parameter', async () => {
    const response = await server.json('/v1/study/review');
    expect(response.status).toBe(400);
    expect((response.meta.error as { details: Record<string, string> }).details.parameter).toBe('quality');
  });

  it('rejects grades outside 0-5 or non-integer', async () => {
    const tooHigh = await server.json('/v1/study/review?quality=6');
    expect(tooHigh.status).toBe(400);

    const tooLow = await server.json('/v1/study/review?quality=-1');
    expect(tooLow.status).toBe(400);

    const notInteger = await server.json('/v1/study/review?quality=3.5');
    expect(notInteger.status).toBe(400);

    const notNumber = await server.json('/v1/study/review?quality=high');
    expect(notNumber.status).toBe(400);
  });

  it('validates repetitions, easiness and interval', async () => {
    const badRepetitions = await server.json('/v1/study/review?quality=4&repetitions=-1');
    expect(badRepetitions.status).toBe(400);

    const badEasiness = await server.json('/v1/study/review?quality=4&easiness=1.2');
    expect(badEasiness.status).toBe(400);

    const badInterval = await server.json('/v1/study/review?quality=4&interval=abc');
    expect(badInterval.status).toBe(400);
  });

  it('rejects a malformed reference date', async () => {
    const response = await server.json('/v1/study/review?quality=4&today=2026-13-40');
    expect(response.status).toBe(400);
    expect((response.meta.error as { details: Record<string, string> }).details.parameter).toBe('today');
  });
});
