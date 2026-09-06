import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { GradeResult, MockSuite, RawBandResult, SessionPlan } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/mock', () => {
  it('describes the catalogue, the tables and the timing constants', async () => {
    const response = await server.json<{
      skills: string[];
      sessionSkills: string[];
      modes: string[];
      tables: { skill: string; rows: number }[];
      suites: { count: number; totalMinutes: number; example: string };
      controls: string[];
    }>('/v1/mock');
    expect(response.status).toBe(200);
    expect(response.data.skills).toEqual(['listening', 'reading-academic', 'reading-general']);
    expect(response.data.modes).toEqual(['practice', 'exam']);
    expect(response.data.tables).toHaveLength(3);
    expect(response.data.suites.count).toBe(24);
    expect(response.data.suites.totalMinutes).toBe(152);
    expect(response.data.suites.example).toBe('mock-001');
    expect(response.data.controls).toContain('finish-section');
    expect(response.meta.relatedWork).toContain('yysd-testcenter');
  });
});

describe('GET /v1/mock/raw-to-band', () => {
  it('converts a listening raw mark to its indicative band', async () => {
    const response = await server.json<RawBandResult>('/v1/mock/raw-to-band?skill=listening&raw=30');
    expect(response.status).toBe(200);
    expect(response.data.band).toBe(7);
    expect(response.data.range).toBe('30–32');
    expect(response.data.cefr).toBe('C1');
    expect(response.meta.table).toContain('Listening');
    expect(response.meta.note).toContain('Indicative conversion');
  });

  it('applies the stricter General Training cuts', async () => {
    const response = await server.json<RawBandResult>('/v1/mock/raw-to-band?skill=reading-general&raw=30');
    expect(response.data.band).toBe(6);
  });

  it('scales partial papers to a 40-question paper', async () => {
    const response = await server.json<RawBandResult>('/v1/mock/raw-to-band?skill=listening&raw=15&total=20');
    expect(response.data.scaledRaw).toBe(30);
    expect(response.data.band).toBe(7);
  });

  it('requires the skill parameter', async () => {
    const response = await server.json('/v1/mock/raw-to-band?raw=30');
    expect(response.status).toBe(400);
  });

  it('rejects unknown skills', async () => {
    const response = await server.json('/v1/mock/raw-to-band?skill=writing&raw=30');
    expect(response.status).toBe(400);
  });

  it('requires the raw parameter', async () => {
    const response = await server.json('/v1/mock/raw-to-band?skill=listening');
    expect(response.status).toBe(400);
  });

  it('rejects non-integer and out-of-range raw marks', async () => {
    const nonInteger = await server.json('/v1/mock/raw-to-band?skill=listening&raw=abc');
    expect(nonInteger.status).toBe(400);
    const tooLarge = await server.json('/v1/mock/raw-to-band?skill=listening&raw=41');
    expect(tooLarge.status).toBe(400);
  });

  it('rejects raw marks above the paper total', async () => {
    const response = await server.json('/v1/mock/raw-to-band?skill=listening&raw=30&total=20');
    expect(response.status).toBe(400);
    const badTotal = await server.json('/v1/mock/raw-to-band?skill=listening&raw=10&total=0');
    expect(badTotal.status).toBe(400);
  });
});

describe('GET /v1/mock/grade', () => {
  const key = encodeURIComponent('1:colour|color;2:books');

  it('grades a response sheet against the supplied key', async () => {
    const response = await server.json<GradeResult>(
      `/v1/mock/grade?skill=listening&key=${key}&responses=${encodeURIComponent('1:Color;2:books')}`,
    );
    expect(response.status).toBe(200);
    expect(response.data.raw).toBe(2);
    expect(response.data.total).toBe(2);
    expect(response.data.scaledRaw).toBe(40);
    expect(response.data.band).toBe(9);
    expect(response.meta.method).toContain('NFC-normalised');
  });

  it('grades missing responses as unanswered', async () => {
    const response = await server.json<GradeResult>(`/v1/mock/grade?skill=listening&key=${key}`);
    expect(response.status).toBe(200);
    expect(response.data.raw).toBe(0);
    expect(response.data.unanswered).toBe(2);
  });

  it('requires the skill parameter', async () => {
    const response = await server.json(`/v1/mock/grade?key=${key}&responses=1%3Aa`);
    expect(response.status).toBe(400);
  });

  it('requires the key parameter', async () => {
    const response = await server.json('/v1/mock/grade?skill=listening&responses=1%3Aa');
    expect(response.status).toBe(400);
  });

  it('rejects malformed keys', async () => {
    const response = await server.json('/v1/mock/grade?skill=listening&key=nope&responses=1%3Aa');
    expect(response.status).toBe(400);
  });
});

describe('GET /v1/mock/session-plan', () => {
  it('plans a Listening practice sitting', async () => {
    const response = await server.json<SessionPlan>('/v1/mock/session-plan?skill=listening&mode=practice');
    expect(response.status).toBe(200);
    expect(response.data.totalMinutes).toBe(32);
    expect(response.data.mode).toBe('practice');
    expect(response.data.delivery).toBe('computer');
  });

  it('plans a full suite under exam conditions', async () => {
    const response = await server.json<SessionPlan>('/v1/mock/session-plan?skill=full-suite&mode=exam');
    expect(response.status).toBe(200);
    expect(response.data.totalMinutes).toBe(152);
    expect(response.data.rules.join(' ')).toContain('Exam conditions');
  });

  it('defaults to practice mode when the mode is omitted', async () => {
    const response = await server.json<SessionPlan>('/v1/mock/session-plan?skill=writing');
    expect(response.data.mode).toBe('practice');
    expect(response.data.totalMinutes).toBe(60);
  });

  it('requires the skill parameter', async () => {
    const response = await server.json('/v1/mock/session-plan?mode=exam');
    expect(response.status).toBe(400);
  });

  it('rejects unknown modes', async () => {
    const response = await server.json('/v1/mock/session-plan?skill=listening&mode=timed');
    expect(response.status).toBe(400);
  });
});

describe('GET /v1/mock/suites', () => {
  it('paginates the stable catalogue', async () => {
    const response = await server.json<MockSuite[]>('/v1/mock/suites');
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(20);
    expect(response.data[0]?.id).toBe('mock-001');
    expect(response.meta.total).toBe(24);
    expect(response.meta.hasMore).toBe(true);
  });

  it('serves the final page without a next page', async () => {
    const response = await server.json<MockSuite[]>('/v1/mock/suites?limit=5&offset=20');
    expect(response.data).toHaveLength(4);
    expect(response.meta.hasMore).toBe(false);
  });
});

describe('GET /v1/mock/suites/:id', () => {
  it('serves one stable suite with its scoring note', async () => {
    const response = await server.json<MockSuite>('/v1/mock/suites/mock-001');
    expect(response.status).toBe(200);
    expect(response.data.id).toBe('mock-001');
    expect(response.data.totalMinutes).toBe(152);
    expect(response.meta.scoring).toContain('/v1/mock/grade');
  });

  it('matches identifiers case-insensitively', async () => {
    const response = await server.json<MockSuite>('/v1/mock/suites/MOCK-002');
    expect(response.status).toBe(200);
    expect(response.data.n).toBe(2);
  });

  it('returns 404 for unknown suites', async () => {
    const missing = await server.json('/v1/mock/suites/mock-999');
    expect(missing.status).toBe(404);
    const malformed = await server.json('/v1/mock/suites/nope');
    expect(malformed.status).toBe(404);
  });
});
