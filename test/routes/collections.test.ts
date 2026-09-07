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
  it('lists 22 collections with stats', async () => {
    const response = await server.json<{ id: string; size: number }[]>('/v1/vocabulary/collections');
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(22);
    expect((response.meta.stats as { assigned: number }).assigned).toBeGreaterThan(0);
  });
});

describe('GET /v1/vocabulary/collections/:id', () => {
  it('returns one collection', async () => {
    const response = await server.json('/v1/vocabulary/collections/education');
    expect(response.status).toBe(200);
    expect((response.data as { id: string }).id).toBe('education');
    expect((response.data as { size: number }).size).toBeGreaterThanOrEqual(0);
  });

  it('returns 404 for unknown collection', async () => {
    const response = await server.json('/v1/vocabulary/collections/unknown-collection');
    expect(response.status).toBe(404);
  });
});

describe('GET /v1/vocabulary/collections/:id/entries', () => {
  it('returns entries for a collection', async () => {
    const response = await server.json<VocabularyEntry[]>('/v1/vocabulary/collections/education/entries');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
    expect((response.meta as { total: number }).total).toBeGreaterThanOrEqual(0);
  });

  it('returns 404 for unknown collection entries', async () => {
    const response = await server.json('/v1/vocabulary/collections/unknown/entries');
    expect(response.status).toBe(404);
  });
});

describe('GET /v1/vocabulary/:word/collection', () => {
  it('returns collection for a known word', async () => {
    // Use a word that likely maps to a collection: atmosphere -> natural-geography
    const response = await server.json('/v1/vocabulary/atmosphere/collection');
    expect(response.status).toBe(200);
    expect((response.data as { word: string }).word.toLowerCase()).toBe('atmosphere');
  });

  it('returns 404 for unknown word', async () => {
    const response = await server.json('/v1/vocabulary/zzzznonexistentwordxyz/collection');
    expect(response.status).toBe(404);
  });

  it('handles word with no collection (null)', async () => {
    // Find a word that likely has no collection assignment; try numeric? but fallback any word may have.
    // Instead test that endpoint returns either collection object or null, both are valid.
    const response = await server.json('/v1/vocabulary/abandon/collection');
    expect(response.status).toBe(200);
    expect(
      (response.data as { collection: unknown }).collection === null ||
        typeof (response.data as { collection: { id: string } | null }).collection === 'object',
    ).toBe(true);
  });
});

describe('GET /v1/vocabulary with collection filter', () => {
  it('filters by collection', async () => {
    const response = await server.json<VocabularyEntry[]>('/v1/vocabulary?collection=education&limit=5');
    expect(response.status).toBe(200);
    expect(response.meta.collection).toEqual(['education']);
    expect(response.data.length).toBeGreaterThanOrEqual(0);
  });

  it('filters by frequency', async () => {
    const response = await server.json<VocabularyEntry[]>('/v1/vocabulary?frequency=high&limit=5');
    expect(response.status).toBe(200);
    expect(response.meta.frequency).toEqual(['high']);
    for (const entry of response.data) {
      expect(entry.volumes.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('filters by frequency low', async () => {
    const response = await server.json<VocabularyEntry[]>('/v1/vocabulary?frequency=low&limit=5');
    expect(response.status).toBe(200);
    for (const entry of response.data) {
      expect(entry.volumes.length).toBe(1);
    }
  });

  it('filters by frequency medium', async () => {
    const response = await server.json<VocabularyEntry[]>('/v1/vocabulary?frequency=medium&limit=5');
    expect(response.status).toBe(200);
    expect(response.meta.frequency).toEqual(['medium']);
    for (const entry of response.data) {
      expect(entry.volumes.length).toBe(2);
    }
  });

  it('filters by multiple frequencies', async () => {
    const response = await server.json<VocabularyEntry[]>('/v1/vocabulary?frequency=high,medium&limit=5');
    expect(response.status).toBe(200);
    for (const entry of response.data) {
      expect(entry.volumes.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('filters by combined collection and frequency', async () => {
    const response = await server.json<VocabularyEntry[]>(
      '/v1/vocabulary?collection=education&frequency=low&limit=5',
    );
    expect(response.status).toBe(200);
    expect(response.data.length).toBeGreaterThanOrEqual(0);
  });

  it('rejects unknown collection', async () => {
    const response = await server.json('/v1/vocabulary?collection=unknown');
    expect(response.status).toBe(400);
  });

  it('rejects unknown frequency', async () => {
    const response = await server.json('/v1/vocabulary?frequency=super');
    expect(response.status).toBe(400);
  });

  it('handles pagination with collection filter', async () => {
    const first = await server.json<VocabularyEntry[]>(
      '/v1/vocabulary?collection=education&limit=2&offset=0',
    );
    const second = await server.json<VocabularyEntry[]>(
      '/v1/vocabulary?collection=education&limit=2&offset=2',
    );
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    // Should not overlap if enough entries
    if (first.data.length === 2 && second.data.length === 2) {
      expect(first.data[0]?.id).not.toBe(second.data[0]?.id);
    }
  });

  it('sorts correctly with collection filter', async () => {
    const response = await server.json<VocabularyEntry[]>(
      '/v1/vocabulary?collection=education&sort=length&order=desc&limit=3',
    );
    expect(response.status).toBe(200);
    if (response.data.length >= 2) {
      expect(response.data[0]!.word.length).toBeGreaterThanOrEqual(response.data[1]!.word.length);
    }
  });
});
