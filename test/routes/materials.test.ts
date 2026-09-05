import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { MaterialsItem, MaterialsStats } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/materials', () => {
  it('returns provenance, statistics and facets', async () => {
    const response = await server.json<{ meta: { repository: string }; stats: MaterialsStats }>(
      '/v1/materials',
    );
    expect(response.status).toBe(200);
    expect(response.data.meta.repository).toContain('Oxidaner/ielts');
    expect(response.data.stats.filesInRepository).toBe(2385);
    const facets = response.meta.facets as { category: string[]; skill: string[]; format: string[] };
    expect(facets.category).toContain('past-paper-recall');
    expect(facets.skill).toContain('reading');
    expect(facets.format).toContain('pdf');
  });
});

describe('GET /v1/materials/stats', () => {
  it('returns statistics only', async () => {
    const response = await server.json<MaterialsStats>('/v1/materials/stats');
    expect(response.data.indexedFiles).toBe(2354);
    expect(response.data.byFormat.pdf).toBe(1282);
  });
});

describe('GET /v1/materials/items', () => {
  it('paginates the index', async () => {
    const response = await server.json<MaterialsItem[]>('/v1/materials/items?limit=2');
    expect(response.data).toHaveLength(2);
    expect(response.meta.total).toBe(2354);
    expect(response.meta.sort).toBe('title');
    expect(response.meta.note).toContain('not redistributed');
  });

  it('filters by category, skill and format', async () => {
    const category = await server.json<MaterialsItem[]>('/v1/materials/items?category=template&limit=50');
    expect(category.data.every((item) => item.category === 'template')).toBe(true);

    const skill = await server.json<MaterialsItem[]>('/v1/materials/items?skill=writing&limit=50');
    expect(skill.data.every((item) => item.skill === 'writing')).toBe(true);

    const format = await server.json<MaterialsItem[]>('/v1/materials/items?format=mp3&limit=50');
    expect(format.data.every((item) => item.format === 'mp3')).toBe(true);
  });

  it('searches free text', async () => {
    const response = await server.json<MaterialsItem[]>('/v1/materials/items?q=vocabulary&limit=50');
    expect(response.data.length).toBeGreaterThan(0);
    expect(response.data.length).toBeLessThan(2354);
    expect(response.meta.query).toBe('vocabulary');
  });

  it('sorts by size descending', async () => {
    const response = await server.json<MaterialsItem[]>('/v1/materials/items?sort=size&order=desc&limit=2');
    expect(response.data[0]!.sizeBytes).toBeGreaterThanOrEqual(response.data[1]!.sizeBytes);
  });

  it('rejects unknown facet values', async () => {
    expect((await server.json('/v1/materials/items?category=nope')).status).toBe(400);
    expect((await server.json('/v1/materials/items?skill=nope')).status).toBe(400);
    expect((await server.json('/v1/materials/items?format=nope')).status).toBe(400);
  });
});
