import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { CorpusItem, CorpusStats } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/corpus', () => {
  it('returns provenance, statistics and facets', async () => {
    const response = await server.json<{ meta: { repository: string }; stats: CorpusStats }>('/v1/corpus');
    expect(response.status).toBe(200);
    expect(response.data.meta.repository).toContain('zhengyishiming/IELTS');
    expect(response.data.stats.filesInRepository).toBe(404);
    const facets = response.meta.facets as { category: string[] };
    expect(facets.category).toContain('ielts-writing');
  });
});

describe('GET /v1/corpus/stats', () => {
  it('returns statistics only', async () => {
    const response = await server.json<CorpusStats>('/v1/corpus/stats');
    expect(response.data.ieltsRelevantFiles).toBe(76);
    expect(response.data.byFormat.rar).toBe(244);
  });
});

describe('GET /v1/corpus/items', () => {
  it('paginates the index', async () => {
    const response = await server.json<CorpusItem[]>('/v1/corpus/items?limit=2');
    expect(response.data).toHaveLength(2);
    expect(response.meta.total).toBe(76);
    expect(response.meta.sort).toBe('title');
    expect(response.meta.note).toContain('not redistributed');
  });

  it('filters by category, skill and format', async () => {
    const category = await server.json<CorpusItem[]>('/v1/corpus/items?category=ielts-vocabulary&limit=50');
    expect(category.data.every((item) => item.category === 'ielts-vocabulary')).toBe(true);

    const skill = await server.json<CorpusItem[]>('/v1/corpus/items?skill=writing&limit=50');
    expect(skill.data.every((item) => item.skill === 'writing')).toBe(true);

    const format = await server.json<CorpusItem[]>('/v1/corpus/items?format=pdf&limit=50');
    expect(format.data.every((item) => item.format === 'pdf')).toBe(true);
  });

  it('searches free text', async () => {
    const response = await server.json<CorpusItem[]>('/v1/corpus/items?q=speaking&limit=50');
    expect(response.data.length).toBeGreaterThan(0);
    expect(response.meta.query).toBe('speaking');
  });

  it('sorts by size descending', async () => {
    const response = await server.json<CorpusItem[]>('/v1/corpus/items?sort=size&order=desc&limit=2');
    expect(response.data[0]!.sizeBytes ?? 0).toBeGreaterThanOrEqual(response.data[1]!.sizeBytes ?? 0);
  });

  it('rejects unknown facet values', async () => {
    expect((await server.json('/v1/corpus/items?category=nope')).status).toBe(400);
    expect((await server.json('/v1/corpus/items?skill=nope')).status).toBe(400);
    expect((await server.json('/v1/corpus/items?format=nope')).status).toBe(400);
  });
});
