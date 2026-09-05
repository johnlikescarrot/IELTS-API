import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { ReadingPassage, ReadingStats, ReadingSummary } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

/** Read a paginated collection envelope. */
const list = (path: string) => server.json<ReadingSummary[]>(path);
const totalOf = (meta: Record<string, unknown>): number => meta.total as number;

describe('GET /v1/reading', () => {
  it('lists passage summaries with facets', async () => {
    const response = await list('/v1/reading');
    expect(response.status).toBe(200);
    expect(totalOf(response.meta)).toBeGreaterThanOrEqual(8);
    expect(response.data.length).toBe(totalOf(response.meta));
    expect('text' in (response.data[0] as object)).toBe(false);
    expect(response.meta.levels).toContain('B2');
    expect(response.meta.topics).toContain('science');
  });

  it('filters by level and topic', async () => {
    const byLevel = await list('/v1/reading?level=B2&limit=50');
    expect(byLevel.data.every((item) => item.cefrLevel === 'B2')).toBe(true);
    const byTopic = await list('/v1/reading?topic=science&limit=50');
    expect(totalOf(byTopic.meta)).toBeGreaterThanOrEqual(2);
    const empty = await list('/v1/reading?level=C2');
    expect(totalOf(empty.meta)).toBe(0);
  });

  it('searches title and summary text', async () => {
    const response = await list('/v1/reading?q=river&limit=50');
    expect(totalOf(response.meta)).toBeGreaterThan(0);
  });

  it('rejects unknown facets and bad pagination', async () => {
    expect((await server.json('/v1/reading?level=X1')).status).toBe(400);
    expect((await server.json('/v1/reading?topic=astrology')).status).toBe(400);
    expect((await server.json('/v1/reading?limit=0')).status).toBe(400);
  });
});

describe('GET /v1/reading/stats', () => {
  it('reports aggregate statistics', async () => {
    const response = await server.json<ReadingStats>('/v1/reading/stats');
    expect(response.status).toBe(200);
    expect(response.data.passages).toBeGreaterThanOrEqual(8);
    expect(response.data.questions).toBe(response.data.passages * 3);
    expect(response.data.words).toBeGreaterThan(1500);
  });
});

describe('GET /v1/reading/:id', () => {
  it('returns the full passage with answers by default', async () => {
    const response = await server.json<ReadingPassage>('/v1/reading/rd-a2-cities-01');
    expect(response.status).toBe(200);
    expect(response.data.text.length).toBeGreaterThan(200);
    expect(response.data.questions[0]?.answer).toBeTruthy();
    expect(response.meta.answers).toBe('included');
  });

  it('can withhold the answer keys for self-testing', async () => {
    const response = await server.json<{ questions: Record<string, unknown>[] }>(
      '/v1/reading/rd-a2-cities-01?answers=false',
    );
    expect(response.status).toBe(200);
    for (const question of response.data.questions) {
      expect('answer' in question).toBe(false);
      expect('explanation' in question).toBe(false);
      if (question.format === 'multiple-choice') {
        expect((question.options as string[]).length).toBeGreaterThanOrEqual(4);
      } else {
        expect('options' in question).toBe(false);
      }
    }
    expect(response.meta.answers).toBe('withheld');
  });

  it('rejects malformed answers flags and unknown ids', async () => {
    expect((await server.json('/v1/reading/rd-a2-cities-01?answers=maybe')).status).toBe(400);
    expect((await server.request('/v1/reading/rd-nope')).status).toBe(404);
  });
});
