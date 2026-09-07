import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { SrsNextReview, SrsProjection } from '../../src/lib/srs.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/study/srs', () => {
  it('documents both published ladders and the mastery rules', async () => {
    const response = await server.json<{
      ladders: { classic: { intervalsMinutes: number[] }; wheel: { intervalsDays: number[] } };
      rules: Record<string, number[]>;
      statusModel: { values: string[] };
      provenance: { derivedFrom: string };
    }>('/v1/study/srs');
    expect(response.status).toBe(200);
    expect(response.data.ladders.classic.intervalsMinutes[0]).toBe(5);
    expect(response.data.ladders.classic.intervalsMinutes[7]).toBe(21600);
    expect(response.data.ladders.wheel.intervalsDays).toEqual([1, 2, 4, 7, 15, 21, 30, 30]);
    expect(response.data.rules.masteryRange).toEqual([0, 100]);
    expect(response.data.statusModel.values).toEqual(['new', 'learning', 'mastered']);
    expect(response.data.provenance.derivedFrom).toContain('ielts-vocab-system');
    expect(response.meta.endpoints).toContain('/v1/study/srs/project');
  });
});

describe('GET /v1/study/srs/next', () => {
  it('computes a deterministic due time from an anchor date', async () => {
    const response = await server.json<SrsNextReview>(
      '/v1/study/srs/next?date=2026-01-01&review=0&ladder=classic',
    );
    expect(response.data.intervalMinutes).toBe(5);
    expect(response.data.nextReviewAt).toBe('2026-01-01T00:05:00.000Z');
    expect(response.meta.status).toBe('new');
  });

  it('extends past the ladder with mastery on the day-granular wheel', async () => {
    const response = await server.json<SrsNextReview>(
      '/v1/study/srs/next?date=2026-01-01&ladder=wheel&review=11&mastery=80',
    );
    expect(response.data.intervalMinutes).toBe(77760);
    expect(response.data.nextReviewAt).toBe('2026-02-24T00:00:00.000Z');
    expect(response.meta.status).toBe('learning');
  });

  it('defaults to today at the first rung of the classic ladder', async () => {
    const response = await server.json<SrsNextReview>('/v1/study/srs/next');
    expect(response.data.nextReviewAt.endsWith('T00:05:00.000Z')).toBe(true);
    expect(response.data.ladder).toBe('classic');
  });

  it('rejects invalid parameters', async () => {
    expect((await server.request('/v1/study/srs/next?ladder=anki')).status).toBe(400);
    expect((await server.request('/v1/study/srs/next?review=99')).status).toBe(400);
    expect((await server.request('/v1/study/srs/next?mastery=101')).status).toBe(400);
    expect((await server.request('/v1/study/srs/next?mastery=abc')).status).toBe(400);
    const bad = await server.json('/v1/study/srs/next?date=01-01-2026');
    expect(bad.status).toBe(400);
    expect((bad.meta.error as { details: Record<string, string> }).details.parameter).toBe('date');
  });
});

describe('GET /v1/study/srs/grade', () => {
  it('grades a correct recall with the confidence-weighted gain', async () => {
    const response = await server.json<{
      masteryBefore: number;
      masteryAfter: number;
      change: number;
      status: string;
      reviewCountAfter: number;
      next: { intervalMinutes: number; nextReviewAt: string };
    }>('/v1/study/srs/grade?date=2026-01-01&mastery=40&correct=true&confidence=3');
    expect(response.data.masteryAfter).toBe(55);
    expect(response.data.change).toBe(15);
    expect(response.data.status).toBe('learning');
    expect(response.data.reviewCountAfter).toBe(1);
    expect(response.data.next.intervalMinutes).toBe(30);
    expect(response.data.next.nextReviewAt).toBe('2026-01-01T00:30:00.000Z');
  });

  it('penalises a wrong answer twice as hard as it rewards a right one', async () => {
    const response = await server.json<{ masteryAfter: number }>(
      '/v1/study/srs/grade?mastery=40&correct=false',
    );
    expect(response.data.masteryAfter).toBe(16);
  });

  it('promotes to mastered at 90', async () => {
    const response = await server.json<{ status: string; confidence: number }>(
      '/v1/study/srs/grade?date=2026-01-01&mastery=89&correct=true&confidence=1&review=5&ladder=wheel',
    );
    expect(response.data.status).toBe('mastered');
    expect(response.data.confidence).toBe(1);
  });

  it('rejects malformed attempts', async () => {
    expect((await server.request('/v1/study/srs/grade?mastery=40')).status).toBe(400);
    expect((await server.request('/v1/study/srs/grade?mastery=40&correct=maybe')).status).toBe(400);
    expect((await server.request('/v1/study/srs/grade?mastery=40&correct=true&confidence=0')).status).toBe(
      400,
    );
    expect((await server.request('/v1/study/srs/grade?correct=true&review=99')).status).toBe(400);
    const missing = await server.json('/v1/study/srs/grade');
    expect(missing.status).toBe(400);
    expect((missing.meta.error as { details: Record<string, string> }).details.parameter).toBe('correct');
  });
});

describe('GET /v1/study/srs/window', () => {
  it('centres the window on the configured review time', async () => {
    const response = await server.json<{ start: string; end: string }>(
      '/v1/study/srs/window?date=2026-05-04&time=07:30',
    );
    expect(response.data.start).toBe('2026-05-04T05:30:00.000Z');
    expect(response.data.end).toBe('2026-05-04T09:30:00.000Z');
    expect(response.meta.windowHours).toBe(4);
  });

  it('defaults to 20:00 today, the upstream configuration default', async () => {
    const response = await server.json<{ start: string; end: string }>('/v1/study/srs/window');
    expect(response.data.start.endsWith('T18:00:00.000Z')).toBe(true);
    expect(response.data.end.endsWith('T22:00:00.000Z')).toBe(true);
  });

  it('rejects malformed dates and times', async () => {
    expect((await server.request('/v1/study/srs/window?date=2026-13-01')).status).toBe(400);
    expect((await server.request('/v1/study/srs/window?time=7:30pm')).status).toBe(400);
    const bad = await server.json('/v1/study/srs/window?time=25:00');
    expect(bad.status).toBe(400);
    expect((bad.meta.error as { details: Record<string, string> }).details.parameter).toBe('time');
  });
});

describe('GET /v1/study/srs/project', () => {
  it('projects a staggered cohort through the wheel ladder', async () => {
    const response = await server.json<SrsProjection>(
      '/v1/study/srs/project?start=2026-01-01&words=25&perDay=10&ladder=wheel&horizon=10',
    );
    expect(response.data.dueDays).toEqual([1, 3, 7, 14, 29, 50, 80, 110]);
    expect(response.data.days[0]?.newWords).toBe(10);
    expect(response.data.days[3]?.reviews).toBe(15);
    expect(response.data.days).toHaveLength(10);
    expect(response.data.summary.studyDays).toBe(3);
    expect(response.data.summary.completionDate).toBe('2026-04-23');
    expect(response.data.summary.totalReviews).toBe(200);
    expect(response.data.summary.peakMultiplier).toBe(2);
    expect(response.meta.defaults).toContain('community wordbook');
  });

  it('collapses the classic ladder sub-day rungs onto day one', async () => {
    const response = await server.json<SrsProjection>(
      '/v1/study/srs/project?start=2026-01-01&words=10&perDay=10&ladder=classic&horizon=42',
    );
    expect(response.data.days[1]?.reviews).toBe(30);
    expect(response.data.summary.peak.total).toBe(30);
  });

  it('defaults the book size to the indexed wordbook', async () => {
    const response = await server.json<SrsProjection>('/v1/study/srs/project?perDay=20');
    expect(response.data.summary.studyDays).toBe(Math.ceil(4323 / 20));
    expect(response.data.ladder).toBe('wheel');
    expect(response.data.days.length).toBeGreaterThan(0);
  });

  it('rejects impossible projections', async () => {
    expect((await server.request('/v1/study/srs/project?words=0')).status).toBe(400);
    expect((await server.request('/v1/study/srs/project?words=10001')).status).toBe(400);
    expect((await server.request('/v1/study/srs/project?perDay=101')).status).toBe(400);
    expect((await server.request('/v1/study/srs/project?horizon=5')).status).toBe(400);
    expect((await server.request('/v1/study/srs/project?ladder=spaced')).status).toBe(400);
    const bad = await server.json('/v1/study/srs/project?start=x');
    expect(bad.status).toBe(400);
    expect((bad.meta.error as { details: Record<string, string> }).details.parameter).toBe('start');
  });
});
