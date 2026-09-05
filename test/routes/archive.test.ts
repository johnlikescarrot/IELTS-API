import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { ArchiveItem, ArchiveStats, ArchiveVolume } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/archive', () => {
  it('returns provenance, statistics, the volume table and facets', async () => {
    const response = await server.json<{
      meta: { repository: string };
      stats: ArchiveStats;
      volumes: ArchiveVolume[];
    }>('/v1/archive');
    expect(response.status).toBe(200);
    expect(response.data.meta.repository).toContain('msneloy/IELTS');
    expect(response.data.stats.indexedFiles).toBe(555);
    expect(response.data.volumes).toHaveLength(18);
    const facets = response.meta.facets as { collection: string[]; format: string[] };
    expect(facets.collection).toContain('cambridge-audio');
    expect(facets.format).toContain('mp3');
  });
});

describe('GET /v1/archive/stats', () => {
  it('returns statistics only', async () => {
    const response = await server.json<ArchiveStats>('/v1/archive/stats');
    expect(response.data.audioTracks).toBe(509);
    expect(response.data.cambridge.completeVolumes).toBe(14);
    expect(response.meta.note).toContain('non-substitutive');
  });
});

describe('GET /v1/archive/volumes', () => {
  it('returns the media-archaeology table', async () => {
    const response = await server.json<ArchiveVolume[]>('/v1/archive/volumes');
    expect(response.data).toHaveLength(18);
    const seventeen = response.data.find((row) => row.volume === 17);
    expect(seventeen?.namingScheme).toBe('test-section');
    expect(seventeen?.complete).toBe(true);
    expect(response.meta.count).toBe(18);
  });

  it('returns one volume and 404s for unknown or non-numeric volumes', async () => {
    const found = await server.json<ArchiveVolume>('/v1/archive/volumes/12');
    expect(found.data.testNumbers).toEqual([5, 6, 7, 8]);
    expect((await server.json('/v1/archive/volumes/19')).status).toBe(404);
    expect((await server.json('/v1/archive/volumes/abc')).status).toBe(404);
  });
});

describe('GET /v1/archive/items', () => {
  it('paginates the index', async () => {
    const response = await server.json<ArchiveItem[]>('/v1/archive/items?limit=2');
    expect(response.data).toHaveLength(2);
    expect(response.meta.total).toBe(555);
    expect(response.meta.sort).toBe('title');
    expect(response.meta.note).toContain('non-substitutive');
  });

  it('filters by collection, format, media and skill', async () => {
    const collection = await server.json<ArchiveItem[]>('/v1/archive/items?collection=reading-samples');
    expect(collection.data.every((item) => item.collection === 'reading-samples')).toBe(true);

    const format = await server.json<ArchiveItem[]>('/v1/archive/items?format=pdf');
    expect(format.data.every((item) => item.format === 'pdf')).toBe(true);

    const media = await server.json<ArchiveItem[]>('/v1/archive/items?media=audio&skill=writing');
    expect(media.data).toHaveLength(0);

    const skill = await server.json<ArchiveItem[]>('/v1/archive/items?skill=writing&limit=50');
    expect(skill.data.every((item) => item.skill === 'writing')).toBe(true);
  });

  it('filters by Cambridge volume', async () => {
    const response = await server.json<ArchiveItem[]>('/v1/archive/items?volume=16');
    expect(response.data).toHaveLength(16);
    expect(response.data.every((item) => item.volume === 16)).toBe(true);
    expect((await server.json('/v1/archive/items?volume=19')).status).toBe(400);
    expect((await server.json('/v1/archive/items?volume=nope')).status).toBe(400);
  });

  it('searches free text', async () => {
    const response = await server.json<ArchiveItem[]>('/v1/archive/items?q=essay&limit=50');
    expect(response.data.length).toBeGreaterThan(0);
    expect(response.data.length).toBeLessThan(555);
    expect(response.meta.query).toBe('essay');
  });

  it('sorts by size descending and volume ascending', async () => {
    const bySize = await server.json<ArchiveItem[]>('/v1/archive/items?sort=size&order=desc&limit=3');
    expect(bySize.data[0]!.sizeBytes).toBeGreaterThanOrEqual(bySize.data[1]!.sizeBytes);

    const byVolume = await server.json<ArchiveItem[]>('/v1/archive/items?sort=volume&order=desc&limit=3');
    expect(byVolume.data[0]!.volume).not.toBeNull();
  });

  it('rejects unknown facet values', async () => {
    expect((await server.json('/v1/archive/items?collection=nope')).status).toBe(400);
    expect((await server.json('/v1/archive/items?skill=nope')).status).toBe(400);
    expect((await server.json('/v1/archive/items?format=nope')).status).toBe(400);
    expect((await server.json('/v1/archive/items?media=nope')).status).toBe(400);
  });

  it('rejects invalid sort keys', async () => {
    expect((await server.json('/v1/archive/items?sort=nope')).status).toBe(400);
  });
});

describe('GET /v1/archive/:id', () => {
  it('returns one indexed item with provenance', async () => {
    const response = await server.json<ArchiveItem>(
      '/v1/archive/academic-reading-samples-academic-reading-sample-task-matching-features-pdf',
    );
    expect(response.status).toBe(200);
    expect(response.data.questionType).toBe('matching-features');
    expect(response.data.readability?.words).toBeGreaterThan(100);
    expect(response.meta.repository).toContain('msneloy/IELTS');
  });

  it('returns a learner essay profile without essay text', async () => {
    const response = await server.json<ArchiveItem>('/v1/archive/assignments-22-08-11-mahmuda-12-08-22-md');
    expect(response.data.role).toBe('essay');
    expect(response.data.learner).toBe('mahmuda');
    expect(response.data.taskType).toBe('line-chart');
    expect(response.data.readability?.words).toBeGreaterThan(80);
    expect(Object.keys(response.data as unknown as Record<string, unknown>)).not.toContain('body');
  });

  it('404s for unknown ids', async () => {
    expect((await server.json('/v1/archive/nope')).status).toBe(404);
  });
});
