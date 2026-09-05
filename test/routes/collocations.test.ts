import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { CollocationDimensionInfo, CollocationEntry, CollocationStats } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/collocations', () => {
  it('returns provenance, statistics and the dimension catalogue', async () => {
    const response = await server.json<{
      meta: { repository: string; source: string };
      stats: CollocationStats;
      dimensions: CollocationDimensionInfo[];
    }>('/v1/collocations');
    expect(response.status).toBe(200);
    expect(response.data.meta.repository).toContain('Oxidaner/ielts');
    expect(response.data.meta.source).toContain('方法论');
    expect(response.data.stats.phrases).toBe(245);
    expect(response.data.dimensions).toHaveLength(14);
    expect(response.data.dimensions[0]!.phrases).toBeGreaterThan(0);
    expect(String(response.meta.note)).toContain('not redistributed');
  });
});

describe('GET /v1/collocations/stats', () => {
  it('returns statistics only', async () => {
    const response = await server.json<CollocationStats>('/v1/collocations/stats');
    expect(response.data.phrases).toBe(245);
    expect(response.data.byKind.frame).toBe(8);
    expect(response.data.dimensions).toBe(14);
  });
});

describe('GET /v1/collocations/dimensions', () => {
  it('catalogues the dimensions with live counts', async () => {
    const response = await server.json<CollocationDimensionInfo[]>('/v1/collocations/dimensions');
    expect(response.data).toHaveLength(14);
    expect(response.meta.count).toBe(14);
    for (const dimension of response.data) {
      expect(dimension.description.length).toBeGreaterThan(0);
      expect(dimension.phrases).toBeGreaterThan(0);
    }
    const emotional = response.data.find((dimension) => dimension.id === 'emotional-value');
    expect(emotional?.phrases).toBe(23);
  });
});

describe('GET /v1/collocations/items', () => {
  it('paginates the bank', async () => {
    const response = await server.json<CollocationEntry[]>('/v1/collocations/items?limit=2');
    expect(response.data).toHaveLength(2);
    expect(response.meta.total).toBe(245);
    expect(response.meta.sort).toBe('phrase');
    expect((response.meta.facets as { dimension: string[] }).dimension).toContain('money');
  });

  it('filters by dimension, group, polarity and kind', async () => {
    const dimension = await server.json<CollocationEntry[]>(
      '/v1/collocations/items?dimension=technology-then-now&limit=50',
    );
    expect(dimension.data.every((item) => item.dimension === 'technology-then-now')).toBe(true);
    expect(dimension.meta.total).toBe(22);

    const group = await server.json<CollocationEntry[]>(
      '/v1/collocations/items?group=extroverted-behaviour&limit=50',
    );
    expect(group.data.every((item) => item.group === 'extroverted-behaviour')).toBe(true);

    const polarity = await server.json<CollocationEntry[]>(
      '/v1/collocations/items?polarity=positive&limit=100',
    );
    expect(polarity.data.every((item) => item.polarity === 'positive')).toBe(true);
    expect(polarity.meta.total).toBe(50);

    const kind = await server.json<CollocationEntry[]>('/v1/collocations/items?kind=frame&limit=50');
    expect(kind.data.every((item) => item.kind === 'frame')).toBe(true);
    expect(kind.meta.total).toBe(8);
  });

  it('searches English phrases and Chinese glosses', async () => {
    const english = await server.json<CollocationEntry[]>('/v1/collocations/items?q=emotional&limit=20');
    expect(english.data.length).toBeGreaterThan(0);

    const chinese = await server.json<CollocationEntry[]>('/v1/collocations/items?q=时间&limit=20');
    expect(chinese.data.length).toBeGreaterThan(0);
    expect(chinese.data.every((item) => item.gloss?.includes('时间'))).toBe(true);
  });

  it('sorts by dimension and polarity', async () => {
    const dimension = await server.json<CollocationEntry[]>('/v1/collocations/items?sort=dimension&limit=3');
    expect(dimension.data.map((item) => item.dimension)).toEqual(
      [...dimension.data.map((item) => item.dimension)].sort(),
    );

    const polarity = await server.json<CollocationEntry[]>(
      '/v1/collocations/items?sort=polarity&order=desc&limit=3',
    );
    expect(polarity.data.map((item) => item.polarity)).toEqual(['positive', 'positive', 'positive']);
  });

  it('rejects unknown facet values', async () => {
    expect((await server.json('/v1/collocations/items?dimension=nope')).status).toBe(400);
    expect((await server.json('/v1/collocations/items?group=nope')).status).toBe(400);
    expect((await server.json('/v1/collocations/items?polarity=nope')).status).toBe(400);
    expect((await server.json('/v1/collocations/items?kind=nope')).status).toBe(400);
    expect((await server.json('/v1/collocations/items?sort=nope')).status).toBe(400);
  });
});

describe('GET /v1/collocations/random', () => {
  it('returns a deterministic, seeded sample', async () => {
    const first = await server.json<CollocationEntry[]>('/v1/collocations/random?seed=abc&count=3');
    const second = await server.json<CollocationEntry[]>('/v1/collocations/random?seed=abc&count=3');
    expect(first.data).toHaveLength(3);
    expect(first.data).toEqual(second.data);
    expect(new Set(first.data.map((item) => item.id)).size).toBe(3);
    expect(first.meta.seed).toBe('abc');
  });

  it('defaults the seed to the current time when absent', async () => {
    const response = await server.json<CollocationEntry[]>('/v1/collocations/random');
    expect(response.data).toHaveLength(5);
    expect(typeof response.meta.seed).toBe('string');
    expect(String(response.meta.seed).length).toBeGreaterThan(0);
  });

  it('rejects out-of-range counts', async () => {
    expect((await server.json('/v1/collocations/random?count=0')).status).toBe(400);
    expect((await server.json('/v1/collocations/random?count=51')).status).toBe(400);
  });
});
