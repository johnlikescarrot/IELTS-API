import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { ExamReport, ExamSchedule, MockPaper, RawScoreResult } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/exam/config', () => {
  it('returns the full rulebook matrix by default', async () => {
    const response = await server.json<unknown[]>('/v1/exam/config');
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(4);
    expect(response.meta.mode).toBe('all');
    expect(response.meta.note).toContain('full matrix');
  });

  it('returns a single filtered row', async () => {
    const response = await server.json<{ label: string; sittingMinutes: number }>(
      '/v1/exam/config?module=general-training&delivery=computer',
    );
    expect(response.data.label).toBe('General Training — on computer');
    expect(response.data.sittingMinutes).toBe(152);
    expect(response.meta.mode).toBe('single');
    expect(response.meta.provenance).toContain('original to this API');
  });

  it('filters on a single dimension too', async () => {
    const response = await server.json<{ module: string; delivery: string }>(
      '/v1/exam/config?delivery=computer',
    );
    expect(response.data.module).toBe('academic');
    expect(response.data.delivery).toBe('computer');
    expect(response.meta.mode).toBe('single');
  });

  it('rejects unknown enumerations', async () => {
    expect((await server.json('/v1/exam/config?module=professional')).status).toBe(400);
    expect((await server.json('/v1/exam/config?delivery=carrier-pigeon')).status).toBe(400);
  });
});

describe('GET /v1/exam/schedule', () => {
  it('builds the invigilated timeline', async () => {
    const response = await server.json<ExamSchedule>('/v1/exam/schedule?start=09:00');
    expect(response.status).toBe(200);
    expect(response.data.segments.map((segment) => segment.id)).toEqual([
      'listening',
      'transfer',
      'reading',
      'writing',
    ]);
    expect(response.data.countdownSeconds).toBe(9600);
    expect(response.meta.speaking).toContain('seven days');
  });

  it('accepts a date anchor and breaks', async () => {
    const response = await server.json<ExamSchedule>(
      '/v1/exam/schedule?start=2026-09-06T23:30&delivery=computer&breakMinutes=5',
    );
    expect(response.data.date).toBe('2026-09-06');
    expect(response.data.end.day).toBe(1);
    expect(response.data.segments.filter((segment) => segment.id === 'break')).toHaveLength(2);
  });

  it('validates its parameters', async () => {
    expect((await server.json('/v1/exam/schedule')).status).toBe(400);
    expect((await server.json('/v1/exam/schedule?start=8am')).status).toBe(400);
    expect((await server.json('/v1/exam/schedule?start=09:00&breakMinutes=61')).status).toBe(400);
    expect((await server.json('/v1/exam/schedule?start=09:00&start=10:00')).status).toBe(400);
  });
});

describe('GET /v1/exam/tables', () => {
  it('returns all three conversion tables', async () => {
    const response = await server.json<Record<string, unknown>>('/v1/exam/tables');
    expect(Object.keys(response.data).sort()).toEqual([
      'academic-reading',
      'general-training-reading',
      'listening',
    ]);
    expect(response.meta.provenance).toContain('Cambridge IELTS series');
  });

  it('filters to one scale', async () => {
    const response = await server.json<{ scale: string; rows: { band: number }[] }>(
      '/v1/exam/tables?scale=listening',
    );
    expect(response.data.scale).toBe('listening');
    expect(response.data.rows).toHaveLength(17);
    expect(response.data.rows[16]?.band).toBe(9);
  });

  it('rejects unknown scales', async () => {
    const response = await server.json('/v1/exam/tables?scale=speaking');
    expect(response.status).toBe(400);
  });
});

describe('GET /v1/exam/score', () => {
  it('converts a mark to a band with progress', async () => {
    const response = await server.json<RawScoreResult>('/v1/exam/score?scale=listening&raw=30');
    expect(response.data.band).toBe(7);
    expect(response.data.range).toEqual({ minRaw: 30, maxRaw: 31 });
    expect(response.data.next).toEqual({ band: 7.5, minRaw: 32, itemsNeeded: 2 });
    expect(response.meta.provenance).toContain('authoritative');
  });

  it('requires both parameters', async () => {
    const missingScale = await server.json('/v1/exam/score?raw=30');
    expect(missingScale.status).toBe(400);
    const missingRaw = await server.json('/v1/exam/score?scale=listening');
    expect(missingRaw.status).toBe(400);
    expect((missingRaw.meta.error as { message: string }).message).toContain('"raw" is required');
  });

  it('rejects marks outside the paper', async () => {
    expect((await server.json('/v1/exam/score?scale=listening&raw=41')).status).toBe(400);
    expect((await server.json('/v1/exam/score?scale=listening&raw=two')).status).toBe(400);
  });
});

describe('GET /v1/exam/report', () => {
  it('scores a mock and analyses the gap to the target', async () => {
    const response = await server.json<ExamReport>(
      '/v1/exam/report?listeningRaw=30&readingRaw=27&writing=6.5&speaking=7&target=7',
    );
    expect(response.status).toBe(200);
    expect(response.data.overall?.overall).toBe(7);
    expect(response.data.components.map((component) => component.source)).toEqual([
      'raw',
      'raw',
      'band',
      'band',
    ]);
    expect(response.data.target?.rows[1]?.status).toBe('behind');
    expect(response.meta.overall).toContain('rounding rule');
    expect(response.meta.target).toContain('Target 7.0');
  });

  it('omits the overall when components are missing', async () => {
    const response = await server.json<ExamReport>('/v1/exam/report?writing=6');
    expect(response.data.overall).toBeNull();
    expect(response.meta.overall).toContain('omitted');
    expect(response.meta.target).toContain('No target');
  });

  it('reads general-training marks on the general-training table', async () => {
    const response = await server.json<ExamReport>('/v1/exam/report?module=general-training&readingRaw=30');
    expect(response.data.components[1]?.band).toBe(6);
  });

  it('validates its inputs', async () => {
    const empty = await server.json('/v1/exam/report');
    expect(empty.status).toBe(400);
    expect((empty.meta.error as { message: string }).message).toContain('at least one score');
    expect((await server.json('/v1/exam/report?writing=6.3')).status).toBe(400);
    expect((await server.json('/v1/exam/report?listeningRaw=41')).status).toBe(400);
    expect((await server.json('/v1/exam/report?speaking=9.5')).status).toBe(400);
    expect((await server.json('/v1/exam/report?writing=6&target=10')).status).toBe(400);
  });
});

describe('GET /v1/exam/mock', () => {
  it('composes a deterministic paper', async () => {
    const first = await server.json<MockPaper>('/v1/exam/mock?seed=2026-09-05');
    const second = await server.json<MockPaper>('/v1/exam/mock?seed=2026-09-05');
    expect(first.status).toBe(200);
    expect(first.data).toEqual(second.data);
    expect(first.data.sections.map((section) => section.id)).toEqual([
      'vocabulary',
      'listening',
      'reading',
      'writing',
      'speaking',
    ]);
    expect(first.data.totalMinutes).toBe(160);
    expect(first.meta.content).toContain('no copyrighted passages');
    expect(first.meta.levelNote).toContain('full-test index');
  });

  it('applies level, words and delivery filters', async () => {
    const response = await server.json<MockPaper>(
      '/v1/exam/mock?seed=abc&level=b1-b2&words=0&delivery=computer',
    );
    expect(response.data.level).toBe('B1-B2');
    expect(response.data.sections.map((section) => section.id)).toEqual([
      'listening',
      'reading',
      'writing',
      'speaking',
    ]);
    expect(response.meta.levelNote).toContain('B1-B2');
    expect(response.data.totalMinutes).toBe(152);
  });

  it('defaults the seed', async () => {
    const response = await server.json<MockPaper>('/v1/exam/mock');
    expect(response.data.seed).toBe('default');
  });

  it('validates filters', async () => {
    expect((await server.json('/v1/exam/mock?level=b2-c1')).status).toBe(400);
    expect((await server.json('/v1/exam/mock?words=21')).status).toBe(400);
    expect((await server.json('/v1/exam/mock?module=ukvi')).status).toBe(400);
  });
});
