import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { PracticeCollection, PracticeItem } from '../../src/types.js';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.close();
});

describe('practice catalogue HTTP contract', () => {
  it('serves an authentication-free, provenance-rich manifest without exercise content', async () => {
    const response = await server.json<{
      stats: { indexedItems: number; repositoryFiles: number };
      source: { commit: string; contentLicense: string; access: string };
      integrity: { value: string };
      rights: { contentIncluded: boolean };
    }>('/v1/practice');
    expect(response.status).toBe(200);
    expect(response.data.stats).toMatchObject({ indexedItems: 1852, repositoryFiles: 5545 });
    expect(response.data.source.commit).toBe('ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c');
    expect(response.data.source.contentLicense).toBe('not-specified');
    expect(response.data.source.access).toBe('may-require-login-or-payment');
    expect(response.data.integrity.value).toMatch(/^[a-f0-9]{64}$/);
    expect(response.data.rights.contentIncluded).toBe(false);
    expect(response.data).not.toHaveProperty('items');
  });

  it('reports observed rather than advertised collection sizes', async () => {
    const response = await server.json<PracticeCollection[]>('/v1/practice/collections');
    expect(response.status).toBe(200);
    expect(response.data.map((collection) => collection.indexedItems)).toEqual([102, 204, 1232, 314]);
    expect(response.data[3]?.declaredItems).toBe(315);
    expect(response.meta.total).toBe(4);
  });

  it('paginates in stable ID order and carries the dataset fingerprint', async () => {
    const response = await server.json<PracticeItem[]>('/v1/practice/items');
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(20);
    expect(response.meta).toMatchObject({ total: 1852, limit: 20, offset: 0, hasMore: true });
    expect(response.meta.datasetSha256).toMatch(/^[a-f0-9]{64}$/);
    const second = await server.json<PracticeItem[]>('/v1/practice/items?limit=2&offset=20');
    expect(second.data).toHaveLength(2);
    expect(second.meta).toMatchObject({ total: 1852, offset: 20 });
    expect(response.data.map((item) => item.id)).not.toContain(second.data[0]?.id);
  });

  it.each([
    ['skill=reading', 1546, { skill: 'reading' }],
    ['collection=listening-basic', 102, { collection: 'listening-basic' }],
    ['level=a1-a2', 198, { level: 'a1-a2' }],
    ['mode=full-test', 518, { mode: 'full-test' }],
    ['audio=missing', 3, { audio: 'missing' }],
    ['audio=present', 303, { audio: 'present' }],
    [
      'skill=reading&collection=reading-basic&level=c1-c2&mode=exercise&audio=not-applicable',
      660,
      { skill: 'reading', collection: 'reading-basic', level: 'c1-c2' },
    ],
  ])('applies %s', async (query, total, expected) => {
    const response = await server.json<PracticeItem[]>(`/v1/practice/items?${query}`);
    expect(response.status).toBe(200);
    expect(response.meta.total).toBe(total);
    for (const item of response.data) expect(item).toMatchObject(expected);
  });

  it('supports case-insensitive text search, empty intersections and end-of-data pages', async () => {
    const search = await server.json<PracticeItem[]>('/v1/practice/items?q=READING%20A1-A2%20LESSON%201');
    expect(search.status).toBe(200);
    expect(search.data.length).toBeGreaterThan(0);
    expect(search.data.every((item) => item.title.includes('Reading A1-A2 lesson 1'))).toBe(true);
    const empty = await server.json<PracticeItem[]>('/v1/practice/items?skill=reading&level=basic');
    expect(empty.data).toEqual([]);
    expect(empty.meta.total).toBe(0);
    const exhausted = await server.json<PracticeItem[]>('/v1/practice/items?offset=1852');
    expect(exhausted.data).toEqual([]);
    expect(exhausted.meta.hasMore).toBe(false);
  });

  it('looks up stable IDs, and does not invent the absent Reading Test 105', async () => {
    const response = await server.json<PracticeItem>('/v1/practice/items/reading-basic-a1-a2-001');
    expect(response.status).toBe(200);
    expect(response.data.id).toBe('reading-basic-a1-a2-001');
    expect(response.meta.datasetSha256).toMatch(/^[a-f0-9]{64}$/);
    const missing = await server.json('/v1/practice/items/reading-full-105');
    expect(missing.status).toBe(404);
  });

  it('requires a seed and returns repeatable samples without replacement', async () => {
    const path = '/v1/practice/sample?seed=study-2026&skill=listening&mode=full-test&count=10';
    const first = await server.json<PracticeItem[]>(path);
    expect(first.status).toBe(200);
    expect(first.data).toHaveLength(10);
    expect(new Set(first.data.map((item) => item.id)).size).toBe(10);
    expect(first.data.every((item) => item.skill === 'listening' && item.mode === 'full-test')).toBe(true);
    expect(first.meta).toMatchObject({ seed: 'study-2026', requested: 10, returned: 10, population: 204 });
    expect(first.meta.samplingAlgorithm).toBe('fnv1a32-mulberry32-partial-fisher-yates-v1');
    const repeat = await server.json<PracticeItem[]>(path);
    expect(repeat).toEqual(first);
    const other = await server.json<PracticeItem[]>(path.replace('study-2026', 'study-2027'));
    expect(other.data).not.toEqual(first.data);
    const defaults = await server.json<PracticeItem[]>('/v1/practice/sample?seed=default');
    expect(defaults.data).toHaveLength(5);
  });

  it('explicitly reports exhausted or empty sampling populations', async () => {
    const tiny = await server.json<PracticeItem[]>('/v1/practice/sample?seed=x&audio=missing&count=10');
    expect(tiny.status).toBe(200);
    expect(tiny.data).toHaveLength(3);
    expect(tiny.meta).toMatchObject({ requested: 10, returned: 3, population: 3 });
    const empty = await server.json<PracticeItem[]>('/v1/practice/sample?seed=x&q=no-such-title');
    expect(empty.data).toEqual([]);
    expect(empty.meta).toMatchObject({ requested: 5, returned: 0, population: 0 });
  });

  it.each([
    '/items?skill=writing',
    '/items?collection=unknown',
    '/items?level=a1',
    '/items?mode=mock',
    '/items?audio=true',
    '/items?limit=0',
    '/items?limit=101',
    '/items?offset=-1',
    '/items?offset=9007199254740992',
    '/items?limit=1.2',
    '/items?skill=reading&skill=listening',
    '/items?q=a&q=b',
    '/items?limt=1',
    '/collections?skill=reading',
    '/items/reading-full-001?seed=x',
    '/sample',
    '/sample?seed=',
    '/sample?seed=%20',
    '/sample?seed=a&seed=b',
    '/sample?seed=x&count=0',
    '/sample?seed=x&count=51',
    '/sample?seed=x&count=1.5',
    `/sample?seed=${'a'.repeat(257)}`,
    '/sample?seed=x&offset=1',
  ])('rejects invalid, repeated or unknown parameters: %s', async (path) => {
    const response = await server.json(`/v1/practice${path}`);
    expect(response.status).toBe(400);
    expect(response.meta.error).toMatchObject({ code: 'bad_request' });
  });

  it('supports browser CORS, HEAD, ETags and conditional requests without credentials', async () => {
    const response = await server.request('/v1/practice/items?limit=1', {
      headers: { Origin: 'https://research.example' },
    });
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(response.headers.get('www-authenticate')).toBeNull();
    const etag = response.headers.get('etag') as string;
    expect(etag).toBeTruthy();
    const head = await server.request('/v1/practice/items?limit=1', { method: 'HEAD' });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe('');
    expect(head.headers.get('etag')).toBe(etag);
    const cached = await server.request('/v1/practice/items?limit=1', { headers: { 'If-None-Match': etag } });
    expect(cached.status).toBe(304);
    expect(await cached.text()).toBe('');
  });
});
