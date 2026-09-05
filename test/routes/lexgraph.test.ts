import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { LexgraphNeighbour, LexgraphStats } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/lexgraph', () => {
  it('reports the whole lexical network', async () => {
    const response = await server.json<LexgraphStats>('/v1/lexgraph');
    expect(response.status).toBe(200);
    expect(response.data.nodes).toBe(4174);
    expect(response.data.directedEdges).toBe(25191);
    expect(response.data.largestComponentShare).toBe(0.9777);
    expect(response.data.topHubs[0]?.word).toBe('act');
    expect(response.data.topHubs).toHaveLength(10);
    expect(response.meta.method as string).toContain('self-mentions excluded');
  });

  it('honours the hub limit', async () => {
    const response = await server.json<LexgraphStats>('/v1/lexgraph?limit=3');
    expect(response.status).toBe(200);
    expect(response.data.topHubs).toHaveLength(3);
  });

  it('rejects a hub limit out of range', async () => {
    const response = await server.json('/v1/lexgraph?limit=51');
    expect(response.status).toBe(400);
    const error = response.meta.error as { details: Record<string, string> };
    expect(error.details.parameter).toBe('limit');
  });
});

describe('GET /v1/lexgraph/:word', () => {
  it('lists both directions for a headword', async () => {
    const response = await server.json<LexgraphNeighbour[]>('/v1/lexgraph/abandon');
    expect(response.status).toBe(200);
    expect(response.meta.total).toBe(15);
    const words = response.data.map((neighbour) => neighbour.word.toLowerCase());
    // All weights are 1, so the default weight sort keeps the stable word order.
    expect(words).toEqual([
      'betray',
      'change',
      'check',
      'emotional',
      'expose',
      'fail',
      'feeling',
      'freedom',
      'intensity',
      'reckless',
      'rectify',
      'reform',
      'shift',
      'switch',
      'trait',
    ]);
    expect(response.data.map((neighbour) => neighbour.relation)).toContain('defines');
    expect(response.meta.word).toBe('abandon');
  });

  it('is case-insensitive on the headword', async () => {
    const response = await server.json<LexgraphNeighbour[]>('/v1/lexgraph/ABANDON?direction=defines');
    expect(response.status).toBe(200);
    expect(response.meta.total).toBe(6);
    for (const neighbour of response.data) {
      expect(neighbour.relation).toBe('defines');
    }
  });

  it('filters by direction and minimum weight', async () => {
    const usedBy = await server.json<LexgraphNeighbour[]>('/v1/lexgraph/abandon?direction=used-by');
    expect(usedBy.meta.total).toBe(9);
    const strong = await server.json<LexgraphNeighbour[]>('/v1/lexgraph/act?direction=used-by&minWeight=3');
    expect(strong.status).toBe(200);
    expect(strong.meta.total).toBeGreaterThanOrEqual(10);
    for (const neighbour of strong.data) {
      expect(neighbour.weight).toBeGreaterThanOrEqual(3);
    }
    const none = await server.json<LexgraphNeighbour[]>('/v1/lexgraph/abandon?minWeight=2');
    expect(none.meta.total).toBe(0);
    expect(none.data).toEqual([]);
  });

  it('sorts by word and paginates', async () => {
    const sorted = await server.json<LexgraphNeighbour[]>('/v1/lexgraph/abandon?sort=word&order=asc');
    expect(sorted.data[0]?.word.toLowerCase()).toBe('betray');
    const first = await server.json<LexgraphNeighbour[]>('/v1/lexgraph/abandon?sort=word&limit=4&offset=0');
    expect(first.data.map((neighbour) => neighbour.word.toLowerCase())).toEqual([
      'betray',
      'change',
      'check',
      'emotional',
    ]);
    expect(first.meta.hasMore).toBe(true);
    const second = await server.json<LexgraphNeighbour[]>('/v1/lexgraph/abandon?sort=word&limit=4&offset=4');
    expect(second.data.map((neighbour) => neighbour.word.toLowerCase())).toEqual([
      'expose',
      'fail',
      'feeling',
      'freedom',
    ]);
    const descending = await server.json<LexgraphNeighbour[]>('/v1/lexgraph/abandon?sort=word&order=desc');
    expect(descending.data[0]?.word.toLowerCase()).toBe('trait');
  });

  it('reports shared Cambridge volumes on edges', async () => {
    const response = await server.json<LexgraphNeighbour[]>('/v1/lexgraph/abandon?sort=word');
    const reckless = response.data.find((neighbour) => neighbour.word.toLowerCase() === 'reckless');
    expect(reckless?.sharedVolumes).toEqual([18]);
    expect(reckless?.definition).toBeTruthy();
  });

  it('404s for unknown words', async () => {
    const response = await server.json('/v1/lexgraph/zzzznotaword');
    expect(response.status).toBe(404);
    const error = response.meta.error as { code: string };
    expect(error.code).toBe('not_found');
  });

  it('rejects invalid query parameters', async () => {
    expect((await server.json('/v1/lexgraph/abandon?direction=sideways')).status).toBe(400);
    expect((await server.json('/v1/lexgraph/abandon?minWeight=0')).status).toBe(400);
    expect((await server.json('/v1/lexgraph/abandon?sort=degree')).status).toBe(400);
    expect((await server.json('/v1/lexgraph/abandon?order=sideways')).status).toBe(400);
    expect((await server.json('/v1/lexgraph/abandon?limit=0')).status).toBe(400);
    expect((await server.json('/v1/lexgraph/abandon?minWeight=1&minWeight=2')).status).toBe(400);
  });
});
