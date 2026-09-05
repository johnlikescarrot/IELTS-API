import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { QuestionTypeData } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/question-types', () => {
  it('lists the taxonomy with stats', async () => {
    const response = await server.json<QuestionTypeData[]>('/v1/question-types?limit=100');
    expect(response.status).toBe(200);
    expect(response.meta.total).toBeGreaterThanOrEqual(16);
    const stats = response.meta.stats as Record<string, number>;
    expect((stats.selection ?? 0) + (stats.written ?? 0)).toBe(stats.types);
    expect(response.meta.upstreamStrategyFields).toBeDefined();
  });

  it('filters by skill', async () => {
    const listening = await server.json<QuestionTypeData[]>('/v1/question-types?skill=listening&limit=100');
    expect(listening.data.every((type) => type.skills.includes('listening'))).toBe(true);
    expect(listening.meta.skill).toBe('listening');
    const reading = await server.json<QuestionTypeData[]>('/v1/question-types?skill=reading&limit=100');
    expect(reading.data.some((type) => !type.skills.includes('listening'))).toBe(true);
  });

  it('filters by response format', async () => {
    const response = await server.json<QuestionTypeData[]>('/v1/question-types?format=written&limit=100');
    expect(response.data.every((type) => type.responseFormat === 'written')).toBe(true);
    expect(response.data.length).toBeGreaterThan(3);
  });

  it('searches names and aliases', async () => {
    const response = await server.json<QuestionTypeData[]>('/v1/question-types?q=NO%20MORE%20THAN&limit=100');
    expect(response.data.length).toBeGreaterThan(0);
    expect(response.data.some((type) => type.id === 'short-answer-questions')).toBe(true);
  });

  it('rejects invalid enums and paging', async () => {
    expect((await server.json('/v1/question-types?skill=writing')).status).toBe(400);
    expect((await server.json('/v1/question-types?format=speaking')).status).toBe(400);
    expect((await server.json('/v1/question-types?limit=0')).status).toBe(400);
    expect((await server.json('/v1/question-types?offset=-2')).status).toBe(400);
  });

  it('paginates', async () => {
    const first = await server.json<QuestionTypeData[]>('/v1/question-types?limit=3');
    expect(first.data).toHaveLength(3);
    expect(first.meta.hasMore).toBe(true);
    const second = await server.json<QuestionTypeData[]>('/v1/question-types?limit=3&offset=3');
    expect(second.data[0]?.id).not.toBe(first.data[0]?.id);
  });
});

describe('GET /v1/question-types/:typeId', () => {
  it('returns the full playbook', async () => {
    const response = await server.json<QuestionTypeData>('/v1/question-types/true-false-notgiven');
    expect(response.status).toBe(200);
    expect(response.data.playbook.anticipate.length).toBeGreaterThanOrEqual(2);
    expect(response.data.answerRules.join(' ')).toContain('NOT GIVEN');
    expect(response.meta.skills).toEqual(['reading']);
  });

  it('404s on unknown ids', async () => {
    expect((await server.json('/v1/question-types/dictation')).status).toBe(404);
  });
});
