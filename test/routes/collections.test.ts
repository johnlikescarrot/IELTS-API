import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { OxidanerItem, OxidanerStats } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/collections/oxidaner', () => {
  it('returns provenance, statistics and facets', async () => {
    const response = await server.json<{ meta: { repository: string }; stats: OxidanerStats }>(
      '/v1/collections/oxidaner',
    );
    expect(response.status).toBe(200);
    expect(response.data.meta.repository).toContain('Oxidaner/ielts');
    expect(response.data.stats.filesInRepository).toBe(2385);
    const facets = response.meta.facets as { skill: string[] };
    expect(facets.skill).toContain('reading');
  });
});

describe('GET /v1/collections/oxidaner/stats', () => {
  it('returns statistics only', async () => {
    const response = await server.json<OxidanerStats>('/v1/collections/oxidaner/stats');
    expect(response.data.bySkill.reading).toBe(1623);
    expect(response.data.byFormat.pdf).toBe(1282);
    expect(response.data.audioFiles).toBe(370);
  });
});

describe('GET /v1/collections/oxidaner/items', () => {
  it('paginates the index', async () => {
    const response = await server.json<OxidanerItem[]>('/v1/collections/oxidaner/items?limit=2');
    expect(response.data).toHaveLength(2);
    expect(response.meta.total).toBe(2385);
    expect(response.meta.sort).toBe('title');
    expect(String(response.meta.note)).toContain('never');
  });

  it('filters by skill, category and format', async () => {
    const skill = await server.json<OxidanerItem[]>('/v1/collections/oxidaner/items?skill=writing&limit=50');
    expect(skill.data.every((item) => item.skill === 'writing')).toBe(true);

    const category = await server.json<OxidanerItem[]>(
      '/v1/collections/oxidaner/items?category=audio&limit=50',
    );
    expect(category.data.every((item) => item.category === 'audio')).toBe(true);

    const format = await server.json<OxidanerItem[]>('/v1/collections/oxidaner/items?format=mp3&limit=50');
    expect(format.data.every((item) => item.format === 'mp3')).toBe(true);
  });

  it('searches free text', async () => {
    const response = await server.json<OxidanerItem[]>('/v1/collections/oxidaner/items?q=reading&limit=50');
    expect(response.data.length).toBeGreaterThan(0);
    expect(response.meta.query).toBe('reading');
  });

  it('sorts by size descending', async () => {
    const response = await server.json<OxidanerItem[]>(
      '/v1/collections/oxidaner/items?sort=size&order=desc&limit=2',
    );
    expect(response.data[0]!.sizeBytes).toBeGreaterThanOrEqual(response.data[1]!.sizeBytes);
  });

  it('rejects unknown facet values', async () => {
    expect((await server.json('/v1/collections/oxidaner/items?skill=nope')).status).toBe(400);
    expect((await server.json('/v1/collections/oxidaner/items?category=nope')).status).toBe(400);
    expect((await server.json('/v1/collections/oxidaner/items?format=nope')).status).toBe(400);
  });
});
