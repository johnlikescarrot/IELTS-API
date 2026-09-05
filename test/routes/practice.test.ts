import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { PracticeItem, PracticeStats } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/practice', () => {
  it('returns provenance, statistics and facets', async () => {
    const response = await server.json<{ meta: { repository: string }; stats: PracticeStats }>(
      '/v1/practice',
    );
    expect(response.status).toBe(200);
    expect(response.data.meta.repository).toContain('ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS');
    expect(response.data.stats.practiceItems).toBeGreaterThan(1000);
    const facets = response.meta.facets as { module: string[] };
    expect(facets.module).toContain('reading-band');
  });
});

describe('GET /v1/practice/stats', () => {
  it('returns statistics only', async () => {
    const response = await server.json<PracticeStats>('/v1/practice/stats');
    expect(response.data.byModule['reading-band']).toBe(1232);
    expect(response.data.audioFiles).toBe(310);
  });
});

describe('GET /v1/practice/items', () => {
  it('paginates the index', async () => {
    const response = await server.json<PracticeItem[]>('/v1/practice/items?limit=2');
    expect(response.data).toHaveLength(2);
    expect(response.meta.total).toBeGreaterThan(1000);
    expect(response.meta.sort).toBe('title');
    expect(response.meta.note).toContain('not redistributed');
  });

  it('filters by module, level and format', async () => {
    const module = await server.json<PracticeItem[]>('/v1/practice/items?module=reading-band&limit=50');
    expect(module.data.every((item) => item.module === 'reading-band')).toBe(true);

    const level = await server.json<PracticeItem[]>('/v1/practice/items?level=B1-B2&limit=50');
    expect(level.data.every((item) => item.level === 'B1-B2')).toBe(true);

    const format = await server.json<PracticeItem[]>('/v1/practice/items?format=html&limit=50');
    expect(format.data.every((item) => item.format === 'html')).toBe(true);
  });

  it('searches free text', async () => {
    const response = await server.json<PracticeItem[]>('/v1/practice/items?q=London&limit=50');
    expect(response.data.length).toBeGreaterThan(0);
    expect(response.meta.query).toBe('London');
  });

  it('sorts by size descending', async () => {
    const response = await server.json<PracticeItem[]>('/v1/practice/items?sort=size&order=desc&limit=2');
    expect(response.data[0]!.sizeBytes ?? 0).toBeGreaterThanOrEqual(response.data[1]!.sizeBytes ?? 0);
  });

  it('rejects unknown facet values', async () => {
    expect((await server.json('/v1/practice/items?module=nope')).status).toBe(400);
    expect((await server.json('/v1/practice/items?level=nope')).status).toBe(400);
    expect((await server.json('/v1/practice/items?format=nope')).status).toBe(400);
  });
});
