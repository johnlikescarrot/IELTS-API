import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startTestServer } from '../helpers/server.js';
import { practiceIndex } from '../../src/data/practice.js';
import type { TestServer } from '../helpers/server.js';
import type { PracticeStats, PracticeUnit } from '../../src/types.js';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.close();
});

describe('GET /v1/practice', () => {
  it('is free, unauthenticated, CORS-open, paginated and explicit about upstream rights', async () => {
    const response = await server.request('/v1/practice?limit=2');
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    const body = (await response.json()) as { data: PracticeUnit[]; meta: Record<string, unknown> };
    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.meta.total).toBe(1852);
    expect(body.meta.hasMore).toBe(true);
    expect(body.meta.source).toEqual(practiceIndex().source);
    expect(body.meta.indexSha256).toBe(practiceIndex().itemsSha256);
    expect(body.meta.metadataLicense).toBe('CC-BY-4.0');
    expect(body.meta.note).toContain('Metadata only');
    expect(body.meta.filters).toEqual({});
  });

  it('applies every filter and retrieves pages after the first thousand units', async () => {
    const response = await server.json<PracticeUnit[]>(
      '/v1/practice?skill=listening&mode=full-test&level=unspecified&asset=audio&q=Test_1&limit=100&offset=1',
    );
    expect(response.data.length).toBeGreaterThan(0);
    expect(
      response.data.every(
        (i) => i.skill === 'listening' && i.mode === 'full-test' && i.assets.some((a) => a.kind === 'audio'),
      ),
    ).toBe(true);
    expect(response.meta.filters).toEqual({
      skill: 'listening',
      mode: 'full-test',
      level: 'unspecified',
      asset: 'audio',
      query: 'Test_1',
    });
    expect((await server.json<PracticeUnit[]>('/v1/practice?offset=1851')).data).toHaveLength(1);
    expect((await server.json<PracticeUnit[]>('/v1/practice?offset=1852')).data).toEqual([]);
    expect((await server.json<PracticeUnit[]>('/v1/practice')).data).toHaveLength(20);
    expect((await server.json<PracticeUnit[]>('/v1/practice?q=')).meta.total).toBe(1852);
  });

  it.each([
    'skill=writing',
    'mode=mock',
    'level=c2',
    'asset=pdf',
    'limit=0',
    'limit=101',
    'limit=1.5',
    'offset=-1',
    'offset=1000001',
    'limit=1&limit=2',
    'skill=reading&skill=listening',
    'q=a&q=b',
    'sort=title',
    '__proto__=polluted',
    'q=' + 'x'.repeat(201),
  ])('rejects invalid, repeated and unknown parameters: %s', async (query) => {
    const response = await server.json(`/v1/practice?${query}`);
    expect(response.status).toBe(400);
    expect(response.data).toBeNull();
  });
});

describe('GET /v1/practice/stats and /:id', () => {
  it('reports observed completeness, not promised exercise counts', async () => {
    const response = await server.json<PracticeStats>('/v1/practice/stats');
    expect(response.data.units).toBe(1852);
    expect(response.data.collections.find((c) => c.id === 'reading-full-test')?.missingSequences).toEqual([
      105,
    ]);
    expect(response.data.listeningWithoutAudio).toHaveLength(3);
    expect((await server.json('/v1/practice/stats?unexpected=yes')).status).toBe(400);
  });

  it('returns precise stable IDs, a real 404 for a missing unit, and consistent HEAD/ETags', async () => {
    const path = '/v1/practice/reading-basic-a1-a2-0001';
    const response = await server.request(path);
    const first = (await response.json()) as { data: PracticeUnit };
    expect(first.data.sequence).toBe(1);
    const etag = response.headers.get('etag')!;
    expect((await server.request(path, { headers: { 'if-none-match': etag } })).status).toBe(304);
    const head = await server.request(path, { method: 'HEAD' });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe('');
    expect((await server.json('/v1/practice/reading-full-test-0105')).status).toBe(404);
    expect((await server.json('/v1/practice/constructor')).status).toBe(404);
    expect((await server.json(`${path}?content=true`)).status).toBe(400);
  });
});

describe('GET /v1/practice/sample', () => {
  it('requires a seed and includes reproducibility controls in the response', async () => {
    const path = '/v1/practice/sample?seed=trial-1&skill=listening&count=3';
    const first = await server.json<PracticeUnit[]>(path);
    const second = await server.json<PracticeUnit[]>(path);
    expect(first).toEqual(second);
    expect(first.data).toHaveLength(3);
    expect(new Set(first.data.map((i) => i.id)).size).toBe(3);
    expect(first.meta.seed).toBe('trial-1');
    expect(first.meta.population).toBe(306);
    expect(first.meta.returned).toBe(3);
    expect(first.meta.algorithm).toContain('mulberry32');
    expect((await server.json<PracticeUnit[]>('/v1/practice/sample?seed=s')).data).toHaveLength(5);
    const empty = await server.json<PracticeUnit[]>('/v1/practice/sample?seed=s&q=missing-units');
    expect(empty.data).toEqual([]);
    expect(empty.meta.population).toBe(0);
    const small = await server.json<PracticeUnit[]>(
      '/v1/practice/sample?seed=s&q=reading-full-test-0001&count=50',
    );
    expect(small.data).toHaveLength(1);
    expect(small.meta.returned).toBe(1);
  });

  it.each([
    '',
    'seed=',
    'seed=a&seed=b',
    'seed=' + 's'.repeat(129),
    'seed=s&count=0',
    'seed=s&count=51',
    'seed=s&offset=1',
  ])('rejects non-reproducible or invalid sampling controls: %s', async (query) => {
    expect((await server.json(`/v1/practice/sample?${query}`)).status).toBe(400);
  });
});

describe('GET /v1/practice/export', () => {
  it('exports all matching metadata as JSON Lines with a source reference in every record', async () => {
    const path = '/v1/practice/export?skill=listening&level=advanced';
    const response = await server.request(path);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/x-ndjson; charset=utf-8');
    const body = await response.text();
    const rows = body
      .trimEnd()
      .split('\n')
      .map((row) => JSON.parse(row) as { unit: PracticeUnit; source: unknown });
    expect(rows).toHaveLength(34);
    expect(rows.every((r) => r.unit.skill === 'listening' && r.unit.level === 'advanced')).toBe(true);
    expect(rows[0]?.source).toEqual(practiceIndex().source);
    const cached = await server.request(path, {
      headers: { 'if-none-match': response.headers.get('etag')! },
    });
    expect(cached.status).toBe(304);
    expect(await cached.text()).toBe('');
  });

  it('rejects ignored paging controls and exports no blank records for an empty selection', async () => {
    expect((await server.json('/v1/practice/export?limit=10')).status).toBe(400);
    expect(await (await server.request('/v1/practice/export?q=missing-units')).text()).toBe('');
  });
});
