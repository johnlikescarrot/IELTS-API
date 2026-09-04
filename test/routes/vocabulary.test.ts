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

describe('GET /v1/vocabulary', () => {
  it('returns entries, pagination metadata and echo of the filters', async () => {
    const response = await server.json<VocabularyEntry[]>('/v1/vocabulary?limit=3');
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(3);
    expect(response.meta.total).toBe(4174);
    expect(response.meta.hasMore).toBe(true);
    expect(response.meta.match).toBe('contains');
    expect(response.meta.sort).toBe('word');
    expect(response.meta.order).toBe('asc');
  });

  it('accepts q and query interchangeably', async () => {
    const byQ = await server.json<VocabularyEntry[]>('/v1/vocabulary?q=atmosphere&match=exact');
    const byQuery = await server.json<VocabularyEntry[]>('/v1/vocabulary?query=atmosphere&match=exact');
    expect(byQ.data).toEqual(byQuery.data);
  });

  it('filters by volume and part of speech', async () => {
    const response = await server.json<VocabularyEntry[]>('/v1/vocabulary?volume=1,2&pos=noun&limit=5');
    expect(response.meta.volume).toEqual([1, 2]);
    expect(response.meta.pos).toEqual(['noun']);
    for (const entry of response.data) {
      expect(entry.partOfSpeech).toBe('noun');
      expect(entry.volumes.some((volume) => volume === 1 || volume === 2)).toBe(true);
    }
  });

  it('sorts descending by headword length', async () => {
    const response = await server.json<VocabularyEntry[]>('/v1/vocabulary?sort=length&order=desc&limit=3');
    const lengths = response.data.map((entry) => entry.word.length);
    expect(lengths[0]).toBeGreaterThanOrEqual(lengths[2] as number);
    expect(response.meta.order).toBe('desc');
  });

  it('rejects an out-of-range volume', async () => {
    const response = await server.json('/v1/vocabulary?volume=99');
    expect(response.status).toBe(400);
    expect((response.meta.error as { code: string }).code).toBe('bad_request');
  });

  it('rejects a non-numeric volume', async () => {
    const response = await server.json('/v1/vocabulary?volume=abc');
    expect(response.status).toBe(400);
  });

  it('rejects an unknown part of speech', async () => {
    const response = await server.json('/v1/vocabulary?pos=interjection');
    expect(response.status).toBe(400);
  });

  it('rejects an unknown match mode', async () => {
    const response = await server.json('/v1/vocabulary?match=fuzzy');
    expect(response.status).toBe(400);
  });

  it('rejects a repeated single-value parameter', async () => {
    const response = await server.json('/v1/vocabulary?limit=5&limit=6');
    expect(response.status).toBe(400);
  });
});

describe('GET /v1/vocabulary/stats', () => {
  it('returns dataset statistics', async () => {
    const response = await server.json<{ words: number; occurrences: number }>('/v1/vocabulary/stats');
    expect(response.status).toBe(200);
    expect(response.data.words).toBe(4174);
    expect(response.data.occurrences).toBe(4310);
  });
});

describe('GET /v1/vocabulary/random', () => {
  it('returns a reproducible sample for a seed', async () => {
    const first = await server.json<VocabularyEntry[]>('/v1/vocabulary/random?seed=ielts&count=3');
    const second = await server.json<VocabularyEntry[]>('/v1/vocabulary/random?seed=ielts&count=3');
    expect(first.data).toEqual(second.data);
    expect(first.meta.seed).toBe('ielts');
    expect(first.meta.count).toBe(3);
  });

  it('defaults to five entries', async () => {
    const response = await server.json<VocabularyEntry[]>('/v1/vocabulary/random?seed=ielts');
    expect(response.data).toHaveLength(5);
  });

  it('seeds from the clock when no seed is supplied', async () => {
    const response = await server.json<VocabularyEntry[]>('/v1/vocabulary/random?count=2');
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(2);
    expect(typeof response.meta.seed).toBe('string');
  });

  it('rejects counts outside 1-50', async () => {
    expect((await server.json('/v1/vocabulary/random?count=0')).status).toBe(400);
    expect((await server.json('/v1/vocabulary/random?count=51')).status).toBe(400);
  });
});

describe('GET /v1/vocabulary/daily', () => {
  it('is stable for a calendar date', async () => {
    const first = await server.json<VocabularyEntry>('/v1/vocabulary/daily?date=2024-05-01');
    const second = await server.json<VocabularyEntry>('/v1/vocabulary/daily?date=2024-05-01');
    expect(first.data).toEqual(second.data);
    expect(first.data.word.length).toBeGreaterThan(0);
  });

  it('returns a list when count is greater than one', async () => {
    const response = await server.json<VocabularyEntry[]>('/v1/vocabulary/daily?date=2024-05-01&count=3');
    expect(response.data).toHaveLength(3);
  });

  it('defaults to today', async () => {
    const response = await server.json<VocabularyEntry>('/v1/vocabulary/daily');
    expect(response.status).toBe(200);
    expect(response.data.id).toMatch(/^w\d{5}$/);
  });

  it('rejects malformed dates', async () => {
    expect((await server.json('/v1/vocabulary/daily?date=01-05-2024')).status).toBe(400);
    expect((await server.json('/v1/vocabulary/daily?date=2024-02-30')).status).toBe(400);
  });
});

describe('GET /v1/vocabulary/:word', () => {
  it('returns a single entry', async () => {
    const response = await server.json<VocabularyEntry>('/v1/vocabulary/atmosphere');
    expect(response.status).toBe(200);
    expect(response.data.word).toBe('atmosphere');
    expect(response.meta.word).toBe('atmosphere');
  });

  it('accepts URL-encoded multi-word entries', async () => {
    const response = await server.json<VocabularyEntry>('/v1/vocabulary/carbon%20dioxide');
    expect(response.status).toBe(200);
    expect(response.data.word.toLowerCase()).toBe('carbon dioxide');
  });

  it('returns 404 for unknown words', async () => {
    const response = await server.json('/v1/vocabulary/zzzznotaword');
    expect(response.status).toBe(404);
    expect((response.meta.error as { code: string }).code).toBe('not_found');
  });
});
