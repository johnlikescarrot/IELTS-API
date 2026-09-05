import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { StrategyCard } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

const totalOf = (meta: Record<string, unknown>): number => meta.total as number;

describe('GET /v1/strategies', () => {
  it('lists cards with facet metadata and stats', async () => {
    const response = await server.json<StrategyCard[]>('/v1/strategies');
    expect(response.status).toBe(200);
    expect(totalOf(response.meta)).toBeGreaterThanOrEqual(24);
    expect(response.data).toHaveLength(20);
    expect(response.meta.hasMore).toBe(true);
    expect(response.meta.skills).toContain('listening');
    const stats = response.meta.stats as { strategies: number };
    expect(stats.strategies).toBeGreaterThanOrEqual(24);
  });

  it('filters by skill', async () => {
    const response = await server.json<StrategyCard[]>('/v1/strategies?skill=writing&limit=50');
    expect(response.data.every((item) => item.skill === 'writing')).toBe(true);
    expect((await server.json('/v1/strategies?skill=all-skills')).status).toBe(400);
  });

  it('filters by band', async () => {
    const response = await server.json<StrategyCard[]>('/v1/strategies?band=4&limit=50');
    expect(totalOf(response.meta)).toBeGreaterThan(0);
    for (const item of response.data) {
      expect(item.bands[0]).toBeLessThanOrEqual(4);
      expect(item.bands[1]).toBeGreaterThanOrEqual(4);
    }
    expect(totalOf((await server.json<StrategyCard[]>('/v1/strategies?band=0')).meta)).toBe(0);
    expect((await server.json('/v1/strategies?band=10')).status).toBe(400);
  });

  it('searches strategy text', async () => {
    const response = await server.json<StrategyCard[]>('/v1/strategies?q=collocation&limit=50');
    expect(totalOf(response.meta)).toBeGreaterThan(0);
  });

  it('rejects malformed pagination', async () => {
    expect((await server.json('/v1/strategies?limit=500')).status).toBe(400);
  });
});

describe('GET /v1/strategies/:id', () => {
  it('returns one card', async () => {
    const response = await server.json<StrategyCard>('/v1/strategies/st-reading-02');
    expect(response.status).toBe(200);
    expect(response.data.skill).toBe('reading');
    expect(response.data.evidence.length).toBeGreaterThan(0);
  });

  it('404s unknown ids', async () => {
    expect((await server.request('/v1/strategies/st-nope-99')).status).toBe(404);
  });
});
