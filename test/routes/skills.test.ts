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

describe('GET /v1/skills', () => {
  it('lists the four format blueprints', async () => {
    const response = await server.json<{ skill: string }[]>('/v1/skills');
    expect(response.status).toBe(200);
    expect(response.data.map((blueprint) => blueprint.skill)).toEqual([
      'listening',
      'reading',
      'writing',
      'speaking',
    ]);
    expect(response.meta.total).toBe(4);
  });
});

describe('GET /v1/skills/:skill', () => {
  it('returns one blueprint', async () => {
    const response = await server.json<{ totalQuestions: number; totalMinutes: number }>(
      '/v1/skills/listening',
    );
    expect(response.status).toBe(200);
    expect(response.data.totalQuestions).toBe(40);
    expect(response.data.totalMinutes).toBe(30);
    expect(response.meta.skill).toBe('listening');
  });

  it('rejects unknown skills', async () => {
    const response = await server.json('/v1/skills/dancing');
    expect(response.status).toBe(404);
  });
});

describe('GET /v1/question-types', () => {
  it('lists every family with pagination metadata', async () => {
    const response = await server.json<unknown[]>('/v1/question-types?limit=100');
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(19);
    expect(response.meta.total).toBe(19);
    expect(response.meta.hasMore).toBe(false);
  });

  it('filters by skill', async () => {
    const response = await server.json<{ skill: string }[]>('/v1/question-types?skill=reading&limit=100');
    expect(response.data).toHaveLength(11);
    for (const family of response.data) {
      expect(family.skill).toBe('reading');
    }
    expect(response.meta.skill).toBe('reading');
  });

  it('searches names, descriptions and traps', async () => {
    const response = await server.json<{ id: string }[]>('/v1/question-types?q=headings');
    expect(response.data.map((family) => family.id)).toEqual(['reading-matching-headings']);
  });

  it('rejects unknown skill filters', async () => {
    const response = await server.json('/v1/question-types?skill=writing');
    expect(response.status).toBe(400);
  });
});

describe('GET /v1/question-types/:id', () => {
  it('returns one strategy guide', async () => {
    const response = await server.json<{ approach: string[]; traps: string[] }>(
      '/v1/question-types/listening-matching',
    );
    expect(response.status).toBe(200);
    expect(response.data.approach).toHaveLength(3);
    expect(response.data.traps).toHaveLength(2);
    expect(response.meta.skill).toBe('listening');
  });

  it('rejects unknown families', async () => {
    const response = await server.json('/v1/question-types/no-such-family');
    expect(response.status).toBe(404);
  });
});

describe('GET /v1/study-system', () => {
  it('publishes the cycle, phases and CEFR ladder', async () => {
    const response = await server.json<{
      cycle: string[];
      phases: { id: string }[];
      cefrLadder: { level: string }[];
      rawScoreTables: string[];
    }>('/v1/study-system');
    expect(response.status).toBe(200);
    expect(response.data.cycle).toHaveLength(6);
    expect(response.data.phases.map((phase) => phase.id)).toEqual([
      'foundation',
      'skill-building',
      'test-readiness',
      'polish',
    ]);
    expect(response.data.cefrLadder).toHaveLength(6);
    expect(response.data.rawScoreTables).toEqual(['listening', 'reading-academic', 'reading-general']);
    expect(response.meta.steps).toBe(6);
  });
});
