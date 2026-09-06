import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { CambridgeStats, CambridgeTest, CambridgeVolume } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

type Frequency = { id: string; questions: number; share: number; groups: number; meanGroupSize: number };
type Detail = CambridgeTest & { meanReadingEase: number | null; audioSeconds: number | null };

describe('GET /v1/cambridge', () => {
  it('returns provenance, statistics, the volume table and facets', async () => {
    const response = await server.json<{
      meta: { repository: string };
      stats: CambridgeStats;
      volumes: CambridgeVolume[];
    }>('/v1/cambridge');
    expect(response.status).toBe(200);
    expect(response.data.meta.repository).toContain('yysd-testcenter');
    expect(response.data.stats.indexedItems).toBe(220);
    expect(response.data.volumes).toHaveLength(19);
    const facets = response.meta.facets as { skill: string[]; scene: string[] };
    expect(facets.skill).toEqual(['listening', 'reading', 'writing']);
    expect(facets.scene).toContain('travel-and-tourism');
  });
});

describe('GET /v1/cambridge/stats', () => {
  it('returns statistics only', async () => {
    const response = await server.json<CambridgeStats>('/v1/cambridge/stats');
    expect(response.data.questions).toBe(5840);
    expect(response.data.upstreamTypeAgreement.rate).toBeGreaterThan(0.9);
    expect(response.meta.note).toContain('non-substitutive');
  });
});

describe('GET /v1/cambridge/volumes', () => {
  it('returns the volume table', async () => {
    const response = await server.json<CambridgeVolume[]>('/v1/cambridge/volumes');
    expect(response.data).toHaveLength(19);
    expect(response.meta.count).toBe(19);
    expect(response.meta.complete).toBe(18);
    expect(response.data[0]?.volume).toBe(3);
  });

  it('returns one volume with its indexed tests and 404s otherwise', async () => {
    const found = await server.json<
      CambridgeVolume & { indexed: { id: string; audioSeconds: number | null }[] }
    >('/v1/cambridge/volumes/10');
    expect(found.status).toBe(200);
    expect(found.data.complete).toBe(true);
    expect(found.data.indexed).toHaveLength(12);
    expect(found.data.indexed[0]?.id).toBe('cam-10-t1-listening');
    expect(found.data.indexed[0]?.audioSeconds).toBeGreaterThan(1000);
    expect((await server.json('/v1/cambridge/volumes/2')).status).toBe(404);
    expect((await server.json('/v1/cambridge/volumes/abc')).status).toBe(404);
    expect((await server.json('/v1/cambridge/volumes/100')).status).toBe(404);
  });
});

describe('GET /v1/cambridge/question-types', () => {
  it('tabulates the canonical types, overall and by skill', async () => {
    const all = await server.json<Frequency[]>('/v1/cambridge/question-types');
    expect(all.data[0]?.id).toBe('summary-completion');
    expect(all.meta.skill).toBe('all');
    expect(all.meta.questions).toBe(5840);
    const reading = await server.json<Frequency[]>('/v1/cambridge/question-types?skill=reading');
    expect(reading.meta.questions).toBe(74 * 40);
    expect(reading.data.some((row) => row.id === 'true-false-not-given')).toBe(true);
    expect((await server.json('/v1/cambridge/question-types?skill=writing')).status).toBe(400);
  });
});

describe('GET /v1/cambridge/tests', () => {
  it('paginates the index in volume order', async () => {
    const response = await server.json<CambridgeTest[]>('/v1/cambridge/tests?limit=3');
    expect(response.data.map((item) => item.id)).toEqual([
      'cam-3-t1-reading',
      'cam-3-t1-writing',
      'cam-3-t2-reading',
    ]);
    expect(response.meta.total).toBe(220);
    expect(response.meta.sort).toBe('volume');
    expect(response.meta.order).toBe('asc');
    expect(response.meta.query).toBeNull();
    expect(response.meta.hasMore).toBe(true);
  });

  it('filters by skill, volume, test, type, scene, difficulty and family', async () => {
    const listening = await server.json<CambridgeTest[]>(
      '/v1/cambridge/tests?skill=listening&volume=15,16&test=1',
    );
    expect(listening.data.map((item) => item.id)).toEqual(['cam-15-t1-listening', 'cam-16-t1-listening']);

    const typed = await server.json<CambridgeTest[]>('/v1/cambridge/tests?type=matching-headings&limit=100');
    expect(
      typed.data.every((item) => 'questionTypes' in item && item.questionTypes.includes('matching-headings')),
    ).toBe(true);

    const scene = await server.json<CambridgeTest[]>(
      '/v1/cambridge/tests?scene=history,biology&skill=reading',
    );
    expect(scene.meta.total).toBeGreaterThan(10);

    const hard = await server.json<CambridgeTest[]>('/v1/cambridge/tests?difficulty=hard&limit=1');
    expect(hard.data[0]?.skill).not.toBe('writing');

    const maps = await server.json<CambridgeTest[]>(
      '/v1/cambridge/tests?task1=map&task2=discussion&limit=100',
    );
    expect(maps.data.every((item) => item.skill === 'writing')).toBe(true);
  });

  it('filters and sorts by readability and audio', async () => {
    const easy = await server.json<CambridgeTest[]>(
      '/v1/cambridge/tests?minReadingEase=45&maxReadingEase=60&sort=reading-ease&order=desc',
    );
    expect(easy.data.every((item) => item.skill === 'reading')).toBe(true);
    expect(easy.meta.sort).toBe('reading-ease');
    const audio = await server.json<CambridgeTest[]>('/v1/cambridge/tests?sort=audio&order=desc&limit=1');
    expect(audio.data[0]?.skill).toBe('listening');
    const search = await server.json<CambridgeTest[]>('/v1/cambridge/tests?q=stepwells&sort=id');
    expect(search.data.map((item) => item.id)).toEqual(['cam-10-t1-reading']);
    expect(search.meta.query).toBe('stepwells');
  });

  it('rejects invalid parameters', async () => {
    expect((await server.json('/v1/cambridge/tests?volume=2')).status).toBe(400);
    expect((await server.json('/v1/cambridge/tests?volume=x')).status).toBe(400);
    expect((await server.json('/v1/cambridge/tests?skill=speaking')).status).toBe(400);
    expect((await server.json('/v1/cambridge/tests?type=riddle')).status).toBe(400);
    expect((await server.json('/v1/cambridge/tests?scene=space')).status).toBe(400);
    expect((await server.json('/v1/cambridge/tests?difficulty=brutal')).status).toBe(400);
    expect((await server.json('/v1/cambridge/tests?task1=letter')).status).toBe(400);
    expect((await server.json('/v1/cambridge/tests?sort=title')).status).toBe(400);
    expect((await server.json('/v1/cambridge/tests?test=5')).status).toBe(400);
  });
});

describe('GET /v1/cambridge/tests/:id', () => {
  it('returns one test with derived summaries', async () => {
    const response = await server.json<Detail>('/v1/cambridge/tests/cam-10-t1-reading');
    expect(response.status).toBe(200);
    expect(response.data.skill).toBe('reading');
    expect(response.data.meanReadingEase).toBeGreaterThan(35);
    expect(response.data.audioSeconds).toBeNull();
    expect(response.meta.repository).toContain('yysd-testcenter');
    if (response.data.skill === 'reading') {
      expect(response.data.groups[0]?.questionType).toBe('true-false-not-given');
      expect(response.data.passages).toHaveLength(3);
    }
  });

  it('404s for unknown identifiers', async () => {
    const response = await server.json('/v1/cambridge/tests/cam-1-t1-reading');
    expect(response.status).toBe(404);
  });
});
