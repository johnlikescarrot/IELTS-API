import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { RecallItem, RecallStats } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/recall', () => {
  it('returns provenance, statistics and facets', async () => {
    const response = await server.json<{ meta: { repository: string }; stats: RecallStats }>('/v1/recall');
    expect(response.status).toBe(200);
    expect(response.data.meta.repository).toContain('Oxidaner/ielts');
    expect(response.data.stats.indexedItems).toBe(423);
    expect(response.data.stats.speaking.cueCards).toBe(76);
    const facets = response.meta.facets as Record<string, string[]>;
    expect(facets.kind).toEqual(['listening-test', 'reading-article', 'speaking-cue-card', 'speaking-topic']);
    expect(facets.part).toEqual(['1', '2', '3']);
    expect(facets.collection).toContain('sept-2025');
  });
});

describe('GET /v1/recall/stats', () => {
  it('returns statistics only, with the redistribution note', async () => {
    const response = await server.json<RecallStats>('/v1/recall/stats');
    expect(response.data.reading.articles).toBe(323);
    expect(response.data.listening.testSets).toBe(6);
    expect(response.meta.note).toContain('not redistributed');
  });
});

describe('GET /v1/recall/items', () => {
  it('paginates the index', async () => {
    const response = await server.json<RecallItem[]>('/v1/recall/items?limit=2');
    expect(response.data).toHaveLength(2);
    expect(response.meta.total).toBe(423);
    expect(response.meta.sort).toBe('id');
    expect(response.meta.note).toContain('not redistributed');
    const facets = response.meta.facets as Record<string, string[]>;
    expect(facets.tier).toEqual(['high', 'next']);
  });

  it('filters by kind, skill, collection, tier, category, status, season and part', async () => {
    const kind = await server.json<RecallItem[]>('/v1/recall/items?kind=listening-test&limit=100');
    expect(kind.meta.total).toBe(6);

    const skill = await server.json<RecallItem[]>('/v1/recall/items?skill=speaking&limit=100');
    expect(skill.data.every((item) => item.skill === 'speaking')).toBe(true);

    const collection = await server.json<RecallItem[]>('/v1/recall/items?collection=sept-2025&limit=100');
    expect(collection.meta.total).toBe(81);

    const tier = await server.json<RecallItem[]>('/v1/recall/items?tier=high&limit=100');
    expect(tier.meta.total).toBe(197);
    expect(tier.data.every((item) => item.tier === 'high')).toBe(true);

    const category = await server.json<RecallItem[]>('/v1/recall/items?category=people,events&limit=100');
    expect(category.meta.total).toBe(42);

    const status = await server.json<RecallItem[]>('/v1/recall/items?status=new&limit=100');
    expect(status.meta.total).toBe(27);

    const season = await server.json<RecallItem[]>('/v1/recall/items?season=2025-09&limit=100');
    expect(season.meta.total).toBe(81);

    const part = await server.json<RecallItem[]>('/v1/recall/items?part=3&limit=100');
    expect(part.meta.total).toBe(123);
    expect(part.data.every((item) => item.part === 3)).toBe(true);
  });

  it('searches free text and sorts the results', async () => {
    const search = await server.json<RecallItem[]>('/v1/recall/items?q=tea&limit=100');
    expect(search.data.length).toBeGreaterThan(5);
    expect(search.meta.query).toBe('tea');

    const sorted = await server.json<RecallItem[]>('/v1/recall/items?sort=title&order=desc&limit=3');
    expect(sorted.meta.sort).toBe('title');
    expect(sorted.meta.order).toBe('desc');
  });

  it('rejects unknown facet values and parameters', async () => {
    expect((await server.json('/v1/recall/items?kind=nope')).status).toBe(400);
    expect((await server.json('/v1/recall/items?skill=nope')).status).toBe(400);
    expect((await server.json('/v1/recall/items?collection=nope')).status).toBe(400);
    expect((await server.json('/v1/recall/items?tier=nope')).status).toBe(400);
    expect((await server.json('/v1/recall/items?category=nope')).status).toBe(400);
    expect((await server.json('/v1/recall/items?status=nope')).status).toBe(400);
    expect((await server.json('/v1/recall/items?season=nope')).status).toBe(400);
    expect((await server.json('/v1/recall/items?part=9')).status).toBe(400);
    expect((await server.json('/v1/recall/items?sort=nope')).status).toBe(400);
    expect((await server.json('/v1/recall/items?order=sideways')).status).toBe(400);
  });
});

describe('GET /v1/recall/:id', () => {
  it('returns one indexed item with its provenance', async () => {
    const response = await server.json<RecallItem>('/v1/recall/sp2-001');
    expect(response.status).toBe(200);
    expect(response.data.kind).toBe('speaking-cue-card');
    expect(response.data.status).toBe('new');
    expect(response.meta.repository).toContain('Oxidaner/ielts');
    expect(response.meta.license).toBe('CC BY 4.0');
  });

  it('returns 404 for unknown identifiers', async () => {
    const response = await server.json('/v1/recall/no-such-item');
    expect(response.status).toBe(404);
    const error = response.meta.error as { code: string };
    expect(error.code).toBe('not_found');
  });
});
