import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { startTestServer } from '../helpers/server.js';
import type { TestServer } from '../helpers/server.js';
import type { PracticeCatalog, PracticeItem, PracticeStats } from '../../src/types.js';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.close();
});

describe('the no-auth practice API', () => {
  it('advertises observed counts, expected counts, pinned source and rights limits', async () => {
    const index = await server.json<{ stats: PracticeStats; collections: PracticeCatalog['collections'] }>(
      '/v1/practice',
    );
    expect(index.status).toBe(200);
    expect(index.data.stats.units).toBe(1852);
    expect(index.data.collections).toHaveLength(4);
    expect(index.meta.source).toMatchObject({
      license: 'not-specified',
      access: 'login-and-payment-described',
      commit: 'ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c',
    });
    const stats = await server.json<PracticeStats>('/v1/practice/stats');
    expect(stats.data).toEqual(index.data.stats);
    expect(stats.meta.contentSha256).toBe(index.meta.contentSha256);
  });

  it('uses defaults and honours combined filters, pagination and free-text search', async () => {
    const defaults = await server.json<PracticeItem[]>('/v1/practice/items');
    expect(defaults.data).toHaveLength(20);
    expect(defaults.meta).toMatchObject({ total: 1852, offset: 0, limit: 20, hasMore: true, filters: {} });
    const page = await server.json<PracticeItem[]>(
      '/v1/practice/items?collection=reading-basic&skill=reading&level=a1-a2&complete=true&q=lesson&limit=2&offset=3',
    );
    expect(page.data.map((item) => item.id)).toEqual([
      'reading-basic-a1-a2-0004',
      'reading-basic-a1-a2-0005',
    ]);
    expect(page.meta).toMatchObject({ total: 198, offset: 3, limit: 2, hasMore: true });
    expect((await server.json('/v1/practice/items?complete=false')).meta.total).toBe(51);
    const empty = await server.json<PracticeItem[]>('/v1/practice/items?skill=listening&level=a1-a2');
    expect(empty.data).toEqual([]);
    expect(empty.meta.hasMore).toBe(false);
    expect((await server.json('/v1/practice/items?offset=100000')).data).toEqual([]);
  });

  it('looks up stable IDs without ever serving content', async () => {
    const response = await server.json<PracticeItem>('/v1/practice/items/listening-tests-0083');
    expect(response.data.missingRoles).toEqual(['audio']);
    expect(response.data.structurallyComplete).toBe(false);
    expect(response.meta.note).toMatch(/not redistributed/);
    expect((await server.json('/v1/practice/items/no-such-id')).status).toBe(404);
  });

  it('requires an explicit seed and records requested versus returned sample size', async () => {
    expect((await server.json('/v1/practice/sample')).status).toBe(400);
    expect((await server.json('/v1/practice/sample?seed=')).status).toBe(400);
    const a = await server.json<PracticeItem[]>('/v1/practice/sample?seed=review');
    const b = await server.json<PracticeItem[]>('/v1/practice/sample?seed=review');
    expect(a).toEqual(b);
    expect(a.data).toHaveLength(5);
    expect(a.meta).toMatchObject({ seed: 'review', count: 5, requested: 5 });
    const capped = await server.json<PracticeItem[]>('/v1/practice/sample?seed=review&level=basic&count=50');
    expect(capped.meta).toMatchObject({ count: 34, requested: 50 });
    expect(new Set(capped.data.map((item) => item.id)).size).toBe(34);
    const empty = await server.json<PracticeItem[]>(
      '/v1/practice/sample?seed=review&skill=reading&level=basic',
    );
    expect(empty.data).toEqual([]);
    expect(empty.meta.count).toBe(0);
  });

  it.each([
    'collection=unknown',
    'skill=writing',
    'level=a1',
    'complete=maybe',
    'limit=0',
    'limit=101',
    'limit=2.5',
    'offset=-1',
    'offset=100001',
    'collection=reading-basic&collection=reading-tests',
    'q=a&q=b',
    'limit=2&limit=3',
    'skill=reading&skill=listening',
    'level=basic&level=advanced',
    'complete=true&complete=false',
  ])('rejects invalid or repeated query parameters: %s', async (query) => {
    const response = await server.json(`/v1/practice/items?${query}`);
    expect(response.status).toBe(400);
    expect(response.data).toBeNull();
    expect(response.meta.error).toMatchObject({ code: 'bad_request' });
  });

  it.each(['count=0', 'count=51', 'seed=a&seed=b', 'collection=bad', 'complete=maybe'])(
    'validates sample parameters: %s',
    async (query) => {
      expect((await server.json(`/v1/practice/sample?seed=x&${query}`)).status).toBe(400);
    },
  );

  it('exports exactly the archived JSON and supports CORS, HEAD and conditional GET', async () => {
    const response = await server.request('/v1/practice/export', {
      headers: { origin: 'https://research.example' },
    });
    const body = await response.text();
    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(body).toBe(readFileSync(new URL('../../data/practice.json', import.meta.url), 'utf8'));
    expect(JSON.parse(body)).not.toHaveProperty('status');
    const cached = await server.request('/v1/practice/export', {
      headers: { 'if-none-match': response.headers.get('etag')! },
    });
    expect(cached.status).toBe(304);
    expect(await cached.text()).toBe('');
    const head = await server.request('/v1/practice/export', { method: 'HEAD' });
    expect(head.status).toBe(200);
    expect(head.headers.get('etag')).toBe(response.headers.get('etag'));
    expect(await head.text()).toBe('');
    expect((await server.request('/v1/practice', { method: 'POST' })).status).toBe(405);
  });
});
