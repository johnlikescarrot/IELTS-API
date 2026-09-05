import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { ReadingItem, ReadingQuestionType } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/reading', () => {
  it('returns items with pagination metadata and echoes the filters', async () => {
    const response = await server.json<ReadingItem[]>('/v1/reading?limit=3');
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(3);
    expect(response.meta.total).toBeGreaterThan(8);
    expect(response.meta.hasMore).toBe(true);
    expect(response.meta.sort).toBe('level');
    expect(response.meta.order).toBe('asc');
  });

  it('accepts q and query interchangeably', async () => {
    const byQ = await server.json<ReadingItem[]>('/v1/reading?q=wetlands');
    const byQuery = await server.json<ReadingItem[]>('/v1/reading?query=wetlands');
    expect(byQ.data).toEqual(byQuery.data);
  });

  it('filters by level, topic and question type', async () => {
    const response = await server.json<ReadingItem[]>('/v1/reading?level=C1-C2&limit=5');
    expect(response.meta.level).toEqual(['C1-C2']);
    for (const item of response.data) {
      expect(item.level).toBe('C1-C2');
    }

    const byTopic = await server.json<ReadingItem[]>('/v1/reading?topic=environment&limit=5');
    expect(byTopic.meta.topic).toEqual(['environment']);
    for (const item of byTopic.data) {
      expect(item.topic).toBe('environment');
    }

    const byType = await server.json<ReadingItem[]>(
      '/v1/reading?type=multiple-choice,true-false-not-given&limit=5',
    );
    expect(byType.meta.type).toEqual(['multiple-choice', 'true-false-not-given']);
    expect(byType.data.length).toBeGreaterThan(0);
  });

  it('sorts by word count descending', async () => {
    const response = await server.json<ReadingItem[]>('/v1/reading?sort=wordCount&order=desc&limit=3');
    const counts = response.data.map((item) => item.wordCount);
    expect(counts[0]).toBeGreaterThanOrEqual(counts[2] as number);
    expect(response.meta.order).toBe('desc');
  });

  it('rejects unknown levels, topics and question types', async () => {
    expect((await server.json('/v1/reading?level=Z9')).status).toBe(400);
    expect((await server.json('/v1/reading?topic=nope')).status).toBe(400);
    expect((await server.json('/v1/reading?type=fill-in-the-blank')).status).toBe(400);
  });
});

describe('GET /v1/reading/stats', () => {
  it('returns dataset statistics', async () => {
    const response = await server.json<{ items: number; questions: number }>('/v1/reading/stats');
    expect(response.status).toBe(200);
    expect(response.data.items).toBeGreaterThan(8);
    expect(response.data.questions).toBeGreaterThan(40);
  });
});

describe('GET /v1/reading/topics', () => {
  it('returns the distinct topic values', async () => {
    const response = await server.json<string[]>('/v1/reading/topics');
    expect(response.status).toBe(200);
    expect(response.data.length).toBeGreaterThan(3);
  });
});

describe('GET /v1/reading/types', () => {
  it('returns the question-type taxonomy', async () => {
    const response = await server.json<ReadingQuestionType[]>('/v1/reading/types');
    expect(response.status).toBe(200);
    expect(response.data).toContain('multiple-choice');
    expect(response.data).toContain('short-answer');
  });
});

describe('GET /v1/reading/random', () => {
  it('returns a reproducible sample for a seed', async () => {
    const first = await server.json<ReadingItem[]>('/v1/reading/random?seed=ielts&count=3');
    const second = await server.json<ReadingItem[]>('/v1/reading/random?seed=ielts&count=3');
    expect(first.data).toEqual(second.data);
    expect(first.meta.seed).toBe('ielts');
    expect(first.meta.count).toBe(3);
  });

  it('restricts the sample by level', async () => {
    const response = await server.json<ReadingItem[]>('/v1/reading/random?seed=ielts&count=5&level=A1-A2');
    expect(response.meta.level).toBe('A1-A2');
    for (const item of response.data) {
      expect(item.level).toBe('A1-A2');
    }
  });

  it('defaults to five items and seeds from the clock', async () => {
    const response = await server.json<ReadingItem[]>('/v1/reading/random');
    expect(response.data).toHaveLength(5);
    expect(typeof response.meta.seed).toBe('string');
  });

  it('rejects counts outside 1-50', async () => {
    expect((await server.json('/v1/reading/random?count=0')).status).toBe(400);
    expect((await server.json('/v1/reading/random?count=51')).status).toBe(400);
  });
});

describe('GET /v1/reading/daily', () => {
  it('is stable for a calendar date', async () => {
    const first = await server.json<ReadingItem>('/v1/reading/daily?date=2026-09-05');
    const second = await server.json<ReadingItem>('/v1/reading/daily?date=2026-09-05');
    expect(first.data).toEqual(second.data);
    expect(first.data.passage.length).toBeGreaterThan(0);
  });

  it('defaults to today', async () => {
    const response = await server.json<ReadingItem>('/v1/reading/daily');
    expect(response.status).toBe(200);
    expect(response.data.id).toMatch(/^r_/);
  });

  it('rejects malformed dates', async () => {
    expect((await server.json('/v1/reading/daily?date=05-09-2026')).status).toBe(400);
    expect((await server.json('/v1/reading/daily?date=2026-02-30')).status).toBe(400);
  });
});

describe('GET /v1/reading/:id', () => {
  it('returns a single item with its passage and questions', async () => {
    const response = await server.json<ReadingItem>('/v1/reading/r_a1_001');
    expect(response.status).toBe(200);
    expect(response.data.id).toBe('r_a1_001');
    expect(response.data.questions.length).toBeGreaterThan(0);
  });

  it('returns 404 for unknown ids', async () => {
    const response = await server.json('/v1/reading/zzzznotareading');
    expect(response.status).toBe(404);
    expect((response.meta.error as { code: string }).code).toBe('not_found');
  });
});
