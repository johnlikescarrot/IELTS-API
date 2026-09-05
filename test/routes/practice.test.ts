import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { PracticeStrategy, PracticeUnit, StudyStep } from '../../src/types.js';

describe('practice routes (/v1/practice)', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startTestServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('lists practice units with pagination and filters', async () => {
    const res = await server.json<PracticeUnit[]>('/v1/practice?limit=10&offset=0');
    expect(res.status).toBe(200);
    expect(res.data).toHaveLength(10);
    expect(res.meta.total).toBe(1852);

    const readingRes = await server.json<PracticeUnit[]>(
      '/v1/practice?skill=reading&collection=reading-basic&level=A1_A2&q=Lesson',
    );
    expect(readingRes.status).toBe(200);
    expect(readingRes.meta.total).toBe(198);

    const audioRes = await server.json<PracticeUnit[]>(
      '/v1/practice?collection=listening-full&hasAudio=false',
    );
    expect(audioRes.status).toBe(200);
    expect(audioRes.meta.total).toBe(3);

    const unitRes = await server.json<PracticeUnit[]>('/v1/practice?collection=reading-full&unitNumber=1');
    expect(unitRes.status).toBe(200);
    expect(unitRes.data).toHaveLength(1);
    expect(unitRes.data[0]?.id).toBe('reading-full-001');
  });

  it('returns aggregate statistics for the practice catalogue', async () => {
    const res = await server.json<Record<string, unknown>>('/v1/practice/stats');
    expect(res.status).toBe(200);
    expect(res.data.totalUnits).toBe(1852);
    expect(res.data.declaredUnits).toBe(1853);
    expect(res.data.missingUnits).toBe(1);
    expect(res.meta.meta).toBeDefined();
  });

  it('returns a seeded random sample of practice units', async () => {
    const res1 = await server.json<PracticeUnit[]>(
      '/v1/practice/random?count=4&seed=test-seed&skill=reading&collection=reading-basic',
    );
    const res2 = await server.json<PracticeUnit[]>(
      '/v1/practice/random?count=4&seed=test-seed&skill=reading&collection=reading-basic',
    );
    expect(res1.status).toBe(200);
    expect(res1.data).toHaveLength(4);
    expect(res1.data).toEqual(res2.data);
    expect(res1.meta.seed).toBe('test-seed');

    // Default sample
    const resDefault = await server.json<PracticeUnit[]>('/v1/practice/random');
    expect(resDefault.status).toBe(200);
    expect(resDefault.data).toHaveLength(5);
  });

  it('lists all task family strategies', async () => {
    const res = await server.json<PracticeStrategy[]>('/v1/practice/strategies');
    expect(res.status).toBe(200);
    expect(res.data).toHaveLength(17);
    expect(res.meta.readingStrategies).toBe(11);
    expect(res.meta.listeningStrategies).toBe(6);
  });

  it('lists strategies for a specific skill', async () => {
    const resReading = await server.json<PracticeStrategy[]>('/v1/practice/strategies/reading');
    expect(resReading.status).toBe(200);
    expect(resReading.data).toHaveLength(11);

    const resListening = await server.json<PracticeStrategy[]>('/v1/practice/strategies/listening');
    expect(resListening.status).toBe(200);
    expect(resListening.data).toHaveLength(6);

    const resInvalid = await server.json('/v1/practice/strategies/speaking');
    expect(resInvalid.status).toBe(400);
  });

  it('looks up a specific task family strategy', async () => {
    const res = await server.json<PracticeStrategy>('/v1/practice/strategies/reading/true-false-not-given');
    expect(res.status).toBe(200);
    expect(res.data.id).toBe('true-false-not-given');
    expect(res.data.name).toContain('True / False / Not Given');

    const resNotFound = await server.json('/v1/practice/strategies/reading/nonexistent');
    expect(resNotFound.status).toBe(404);

    const resBadSkill = await server.json('/v1/practice/strategies/writing/true-false-not-given');
    expect(resBadSkill.status).toBe(400);
  });

  it('returns the 6-step study framework', async () => {
    const res = await server.json<StudyStep[]>('/v1/practice/steps');
    expect(res.status).toBe(200);
    expect(res.data).toHaveLength(6);
    expect(res.meta.totalSteps).toBe(6);
  });

  it('looks up a single practice unit by identifier', async () => {
    const res = await server.json<PracticeUnit>('/v1/practice/reading-basic-a1-a2-001');
    expect(res.status).toBe(200);
    expect(res.data.id).toBe('reading-basic-a1-a2-001');
    expect(res.meta.collection).toBe('reading-basic');

    const res404 = await server.json('/v1/practice/invalid-unit-id');
    expect(res404.status).toBe(404);
  });
});
