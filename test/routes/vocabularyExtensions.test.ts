import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { VocabularyEntry } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/vocabulary/collections', () => {
  it('lists 44 collections with stats', async () => {
    const response = await server.json<{ id: string; family: string }[]>('/v1/vocabulary/collections');
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(44);
    expect(response.meta.total).toBe(44);
    const stats = response.meta.stats as { totalCollections: number; byFamily: Record<string, number> };
    expect(stats.totalCollections).toBe(44);
    expect(stats.byFamily.cambridge).toBe(22);
    expect(response.data.some((c) => c.id === 'cambridge-01')).toBe(true);
    expect(response.data.some((c) => c.id === 'scene-natural-geography')).toBe(true);
  });
});

describe('GET /v1/vocabulary/collections/:id', () => {
  it('returns one collection', async () => {
    const response = await server.json('/v1/vocabulary/collections/cambridge-05');
    expect(response.status).toBe(200);
    expect((response.data as { id: string }).id).toBe('cambridge-05');
    expect((response.meta as { words: number }).words).toBeGreaterThan(0);
  });

  it('returns thematic scene detail', async () => {
    const response = await server.json('/v1/vocabulary/collections/scene-education');
    expect(response.status).toBe(200);
    expect((response.data as { nameZh: string }).nameZh).toBeTruthy();
  });

  it('returns 404 for unknown collection', async () => {
    expect((await server.json('/v1/vocabulary/collections/unknown-collection')).status).toBe(404);
  });
});

describe('GET /v1/vocabulary/collections/:id/words', () => {
  it('paginates words in a Cambridge volume', async () => {
    const response = await server.json<VocabularyEntry[]>(
      '/v1/vocabulary/collections/cambridge-01/words?limit=3',
    );
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(3);
    expect(response.meta.total).toBeGreaterThan(0);
    expect(response.meta.hasMore).toBe(true);
    for (const entry of response.data) {
      expect(entry.volumes).toContain(1);
    }
  });

  it('paginates words in a thematic scene', async () => {
    const response = await server.json<VocabularyEntry[]>(
      '/v1/vocabulary/collections/scene-space-exploration/words?limit=2',
    );
    expect(response.status).toBe(200);
    expect(response.data.length).toBeLessThanOrEqual(2);
    expect(response.meta.id).toBe('scene-space-exploration');
  });

  it('honours limit/offset and ordering', async () => {
    const first = await server.json<VocabularyEntry[]>(
      '/v1/vocabulary/collections/cambridge-10/words?limit=5&offset=0',
    );
    const second = await server.json<VocabularyEntry[]>(
      '/v1/vocabulary/collections/cambridge-10/words?limit=5&offset=5',
    );
    expect(first.data[0]?.word).not.toBe(second.data[0]?.word);
    expect(second.meta.offset).toBe(5);
  });

  it('rejects invalid pagination', async () => {
    expect((await server.json('/v1/vocabulary/collections/cambridge-01/words?limit=0')).status).toBe(400);
    expect((await server.json('/v1/vocabulary/collections/cambridge-01/words?limit=101')).status).toBe(400);
  });

  it('returns 404 for unknown collection', async () => {
    expect((await server.json('/v1/vocabulary/collections/not-there/words')).status).toBe(404);
  });
});

describe('GET /v1/vocabulary/review-queue', () => {
  it('returns seeded queue with SRS hints', async () => {
    const first = await server.json<
      (VocabularyEntry & { queuePosition: number; suggestedIntervalDays: number })[]
    >('/v1/vocabulary/review-queue?seed=test-seed&count=5');
    const second = await server.json<(VocabularyEntry & { queuePosition: number })[]>(
      '/v1/vocabulary/review-queue?seed=test-seed&count=5',
    );
    expect(first.status).toBe(200);
    expect(first.data).toHaveLength(5);
    expect(first.data).toEqual(second.data);
    expect(first.data[0]?.queuePosition).toBe(1);
    expect(first.data[0]?.suggestedIntervalDays).toBeGreaterThan(0);
    expect(first.meta.seed).toBe('test-seed');
  });

  it('defaults count and seed', async () => {
    const response = await server.json('/v1/vocabulary/review-queue');
    expect(response.status).toBe(200);
    expect((response.data as unknown[]).length).toBe(10);
  });

  it('rejects out-of-range count', async () => {
    expect((await server.json('/v1/vocabulary/review-queue?count=0')).status).toBe(400);
    expect((await server.json('/v1/vocabulary/review-queue?count=51')).status).toBe(400);
  });
});

describe('GET /v1/vocabulary/difficulty', () => {
  it('estimates difficulty for a known word', async () => {
    const response = await server.json('/v1/vocabulary/difficulty?word=abandon');
    expect(response.status).toBe(200);
    const data = response.data as {
      word: string;
      score: number;
      level: string;
      components: Record<string, number>;
      signals: Record<string, unknown>;
    };
    expect(data.word).toBe('abandon');
    expect(data.score).toBeGreaterThanOrEqual(0);
    expect(data.score).toBeLessThanOrEqual(100);
    expect(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).toContain(data.level);
    expect(data.components.scarcity).toBeDefined();
    expect(response.meta.word).toBe('abandon');
  });

  it('is case-insensitive and trims', async () => {
    const lower = await server.json('/v1/vocabulary/difficulty?word=abandon');
    const upper = await server.json('/v1/vocabulary/difficulty?word=ABANDON');
    expect(lower.data).toEqual(upper.data);
  });

  it('requires word parameter', async () => {
    expect((await server.json('/v1/vocabulary/difficulty')).status).toBe(400);
  });

  it('returns 404 for unknown word', async () => {
    expect((await server.json('/v1/vocabulary/difficulty?word=notawordzzzz')).status).toBe(404);
  });

  it('rejects repeated word param', async () => {
    expect((await server.json('/v1/vocabulary/difficulty?word=abandon&word=other')).status).toBe(400);
  });
});
