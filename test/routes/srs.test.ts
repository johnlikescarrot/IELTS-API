import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/srs', () => {
  it('returns model overview with intervals and provenance', async () => {
    const response = await server.json<{
      models: { id: string; intervalsMinutes?: number[]; intervalsDays?: number[] }[];
    }>('/v1/srs');
    expect(response.status).toBe(200);
    expect(response.data.models).toHaveLength(3);
    expect(response.data.models.map((m) => m.id)).toEqual(['ebbinghaus', 'leitner', 'sm2']);
    expect(response.meta.provenance).toContain('/v1/srs/schedule');
  });
});

describe('GET /v1/srs/schedule', () => {
  it('compares all three models', async () => {
    const response = await server.json(
      '/v1/srs/schedule?reviewCount=2&mastery=50&quality=4&interval=6&repetitions=2&easeFactor=2.5&leitnerBox=2&leitnerCorrect=true&now=2024-01-01T00:00:00Z',
    );
    expect(response.status).toBe(200);
    const data = response.data as {
      ebbinghaus: { nextDueAt: string; steps: unknown[] };
      leitner: { box: number };
      sm2: { updated: { interval: number } };
      retention: { halfLifeDays: number };
    };
    expect(data.ebbinghaus.nextDueAt).toBeTruthy();
    expect(data.ebbinghaus.steps).toHaveLength(5);
    expect(data.leitner.box).toBe(3);
    expect(data.sm2.updated.interval).toBe(15);
    expect(data.retention.halfLifeDays).toBeGreaterThan(0);
  });

  it('filters by method', async () => {
    const ebbing = await server.json('/v1/srs/schedule?method=ebbinghaus&now=2024-01-01T00:00:00Z');
    expect(ebbing.status).toBe(200);
    expect((ebbing.data as { ebbinghaus: unknown }).ebbinghaus).toBeTruthy();
    expect((ebbing.data as { leitner: unknown }).leitner).toBeUndefined();
    expect((ebbing.data as { sm2: unknown }).sm2).toBeUndefined();

    const leitner = await server.json('/v1/srs/schedule?method=leitner&now=2024-01-01T00:00:00Z');
    expect((leitner.data as { leitner: unknown }).leitner).toBeTruthy();

    const sm2 = await server.json('/v1/srs/schedule?method=sm2&now=2024-01-01T00:00:00Z');
    expect((sm2.data as { sm2: unknown }).sm2).toBeTruthy();
  });

  it('handles leitnerCorrect falsey values', async () => {
    const response = await server.json(
      '/v1/srs/schedule?leitnerCorrect=false&leitnerBox=5&now=2024-01-01T00:00:00Z',
    );
    expect(response.status).toBe(200);
    expect((response.data as { leitner: { box: number } }).leitner.box).toBe(1);
    const withZero = await server.json(
      '/v1/srs/schedule?leitnerCorrect=0&leitnerBox=3&now=2024-01-01T00:00:00Z',
    );
    expect((withZero.data as { leitner: { box: number } }).leitner.box).toBe(1);
  });

  it('defaults now to server time', async () => {
    const response = await server.json('/v1/srs/schedule?reviewCount=0');
    expect(response.status).toBe(200);
    expect((response.data as { ebbinghaus: { nextDueAt: string } }).ebbinghaus.nextDueAt).toBeTruthy();
  });

  it('rejects invalid method', async () => {
    expect((await server.json('/v1/srs/schedule?method=unknown')).status).toBe(400);
  });

  it('rejects invalid now timestamp', async () => {
    expect((await server.json('/v1/srs/schedule?now=not-a-date')).status).toBe(400);
  });

  it('rejects out-of-range quality', async () => {
    expect((await server.json('/v1/srs/schedule?quality=10')).status).toBe(400);
  });

  it('rejects out-of-range mastery', async () => {
    expect((await server.json('/v1/srs/schedule?mastery=200')).status).toBe(400);
  });

  it('rejects out-of-range easeFactor', async () => {
    expect((await server.json('/v1/srs/schedule?easeFactor=0')).status).toBe(400);
  });
});

describe('GET /v1/srs/streak', () => {
  it('computes streaks', async () => {
    const response = await server.json('/v1/srs/streak?dates=2024-01-01,2024-01-02,2024-01-03');
    expect(response.status).toBe(200);
    expect((response.data as { totalDays: number; longestStreak: number }).totalDays).toBe(3);
    expect((response.data as { longestStreak: number }).longestStreak).toBe(3);
    expect(response.meta.received).toBe(3);
  });

  it('handles empty dates', async () => {
    const response = await server.json('/v1/srs/streak');
    expect(response.status).toBe(200);
    expect((response.data as { totalDays: number }).totalDays).toBe(0);
  });

  it('handles gaps', async () => {
    const response = await server.json('/v1/srs/streak?dates=2024-01-01,2024-01-03');
    expect((response.data as { longestStreak: number }).longestStreak).toBe(1);
  });

  it('rejects invalid iso dates', async () => {
    expect((await server.json('/v1/srs/streak?dates=2024-02-30')).status).toBe(400);
    expect((await server.json('/v1/srs/streak?dates=2024-01-01,invalid')).status).toBe(400);
  });
});

describe('GET /v1/srs/calendar', () => {
  it('returns deterministic calendar', async () => {
    const first = await server.json('/v1/srs/calendar?seed=cal-test&days=7&endDate=2024-01-07');
    const second = await server.json('/v1/srs/calendar?seed=cal-test&days=7&endDate=2024-01-07');
    expect(first.status).toBe(200);
    expect(first.data).toEqual(second.data);
    expect((first.data as unknown[]).length).toBe(7);
    expect((first.data as { date: string }[])[0]?.date).toBe('2024-01-01');
    expect((first.data as { level: number }[])[0]?.level).toBeDefined();
    expect(first.meta.seed).toBe('cal-test');
  });

  it('defaults to today and seeded generation', async () => {
    const response = await server.json('/v1/srs/calendar?seed=abc&days=5');
    expect(response.status).toBe(200);
    expect((response.data as unknown[]).length).toBe(5);
  });

  it('rejects invalid days', async () => {
    expect((await server.json('/v1/srs/calendar?days=0')).status).toBe(400);
    expect((await server.json('/v1/srs/calendar?days=1000')).status).toBe(400);
  });

  it('rejects invalid endDate', async () => {
    expect((await server.json('/v1/srs/calendar?endDate=invalid')).status).toBe(400);
    expect((await server.json('/v1/srs/calendar?endDate=2024-02-30')).status).toBe(400);
  });

  it('rejects repeated params', async () => {
    expect((await server.json('/v1/srs/calendar?seed=a&seed=b')).status).toBe(400);
  });
});

describe('GET /v1/srs/helpers', () => {
  it('returns calendar level for minutes', async () => {
    const response = await server.json('/v1/srs/helpers?minutes=45');
    expect(response.status).toBe(200);
    expect((response.data as { calendarLevel: { level: number } }).calendarLevel.level).toBe(3);
  });

  it('returns retention for elapsed+stability', async () => {
    const response = await server.json('/v1/srs/helpers?elapsedDays=5&stabilityDays=10');
    expect(response.status).toBe(200);
    expect((response.data as { retention: { retention: number } }).retention.retention).toBeDefined();
  });

  it('returns halfLife for stability only', async () => {
    const response = await server.json('/v1/srs/helpers?stabilityDays=10');
    expect(response.status).toBe(200);
    expect((response.data as { halfLife: { halfLifeDays: number } }).halfLife.halfLifeDays).toBeDefined();
  });

  it('returns mistake priority when all three supplies', async () => {
    const response = await server.json('/v1/srs/helpers?errors=3&daysSince=2&mastery=60');
    expect(response.status).toBe(200);
    expect(
      (response.data as { mistakePriority: { priority: number } }).mistakePriority.priority,
    ).toBeDefined();
  });

  it('combines multiple helpers', async () => {
    const response = await server.json(
      '/v1/srs/helpers?minutes=60&stabilityDays=10&errors=2&daysSince=1&mastery=80',
    );
    expect(response.status).toBe(200);
    const data = response.data as Record<string, unknown>;
    expect(data.calendarLevel).toBeTruthy();
    expect(data.halfLife).toBeTruthy();
    expect(data.mistakePriority).toBeTruthy();
  });

  it('rejects without any helper param', async () => {
    expect((await server.json('/v1/srs/helpers')).status).toBe(400);
  });

  it('rejects invalid numeric ranges', async () => {
    expect((await server.json('/v1/srs/helpers?minutes=-1')).status).toBe(400);
    expect((await server.json('/v1/srs/helpers?stabilityDays=0')).status).toBe(400);
  });
});
