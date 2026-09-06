import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type {
  TestcenterCatalogItem,
  TestcenterGroup,
  TestcenterStats,
  TestcenterVolumeRow,
} from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/testcenter', () => {
  it('returns provenance, statistics, timing and facets', async () => {
    const response = await server.json<{
      meta: { repository: string; note: string; commit: string };
      stats: TestcenterStats;
      timing: { papers: Record<string, number | null> };
    }>('/v1/testcenter');
    expect(response.status).toBe(200);
    expect(response.data.meta.repository).toContain('wanli4473/yysd-testcenter');
    expect(response.data.meta.note).toContain('No exam HTML');
    expect(response.data.stats.catalog.items).toBe(377);
    expect(response.data.timing.papers.listening).toBe(32);
    const facets = response.meta.facets as {
      catalog: Record<string, string[]>;
      groups: Record<string, string[]>;
    };
    expect(facets.catalog.paper).toContain('full-mock');
    expect(facets.groups.difficulty).toEqual(['easy', 'medium', 'hard']);
  });
});

describe('GET /v1/testcenter/stats', () => {
  it('returns statistics with the redistribution note', async () => {
    const response = await server.json<TestcenterStats>('/v1/testcenter/stats');
    expect(response.status).toBe(200);
    expect(response.data.catalog.cambridgePapers).toBe(222);
    expect(response.meta.note).toContain('non-substitutive');
  });
});

describe('GET /v1/testcenter/catalog', () => {
  it('paginates with defaults', async () => {
    const response = await server.json<TestcenterCatalogItem[]>('/v1/testcenter/catalog');
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(20);
    expect(response.meta.total).toBe(377);
    expect(response.meta.sort).toBe('title');
    expect(response.meta.order).toBe('asc');
    expect(response.meta.note).toContain('No exam HTML');
  });

  it('paginates to the last page', async () => {
    const response = await server.json<TestcenterCatalogItem[]>(
      '/v1/testcenter/catalog?limit=100&offset=370',
    );
    expect(response.data).toHaveLength(7);
    expect(response.meta.hasMore).toBe(false);
  });

  it('filters by zone, subject, paper and volume', async () => {
    const zones = await server.json<TestcenterCatalogItem[]>('/v1/testcenter/catalog?zone=practice');
    expect(zones.meta.total).toBe(10);
    expect(zones.data.every((item) => item.zone === 'practice')).toBe(true);

    const subjects = await server.json<TestcenterCatalogItem[]>(
      '/v1/testcenter/catalog?subject=vocab-cet4-lite&limit=100',
    );
    expect(subjects.meta.total).toBe(30);

    const papers = await server.json<TestcenterCatalogItem[]>('/v1/testcenter/catalog?paper=full-mock');
    expect(papers.meta.total).toBe(3);
    expect(papers.data.every((item) => item.durationMinutes === 180)).toBe(true);

    const volume = await server.json<TestcenterCatalogItem[]>('/v1/testcenter/catalog?volume=3&limit=100');
    expect(volume.meta.total).toBe(4);
  });

  it('searches free text', async () => {
    const response = await server.json<TestcenterCatalogItem[]>('/v1/testcenter/catalog?q=placement');
    expect(response.meta.total).toBe(4);
    expect(response.meta.query).toBe('placement');
  });

  it('sorts by duration descending', async () => {
    const response = await server.json<TestcenterCatalogItem[]>(
      '/v1/testcenter/catalog?sort=duration&order=desc&limit=3',
    );
    expect(response.data[0]?.durationMinutes).toBe(180);
    expect(response.data[2]?.durationMinutes).toBeGreaterThanOrEqual(response.data[2]?.durationMinutes ?? 0);
  });

  it('rejects unknown facet values, bad integers and bad sort keys', async () => {
    expect((await server.json('/v1/testcenter/catalog?zone=nope')).status).toBe(400);
    expect((await server.json('/v1/testcenter/catalog?subject=nope')).status).toBe(400);
    expect((await server.json('/v1/testcenter/catalog?paper=nope')).status).toBe(400);
    expect((await server.json('/v1/testcenter/catalog?volume=2')).status).toBe(400);
    expect((await server.json('/v1/testcenter/catalog?volume=22')).status).toBe(400);
    expect((await server.json('/v1/testcenter/catalog?volume=abc')).status).toBe(400);
    expect((await server.json('/v1/testcenter/catalog?sort=nope')).status).toBe(400);
    expect((await server.json('/v1/testcenter/catalog?order=nope')).status).toBe(400);
    expect((await server.json('/v1/testcenter/catalog?zone=mock&zone=study')).status).toBe(400);
    expect((await server.json('/v1/testcenter/catalog?limit=0')).status).toBe(400);
  });
});

describe('GET /v1/testcenter/catalog/:id', () => {
  it('returns one paper with its tagged groups', async () => {
    const response = await server.json<
      { taggedGroups: number; groups: TestcenterGroup[] } & TestcenterCatalogItem
    >('/v1/testcenter/catalog/cambridge-9-test-4');
    expect(response.status).toBe(200);
    expect(response.data.id).toBe('cambridge-9-test-4');
    expect(response.data.taggedGroups).toBe(11);
    expect(response.data.groups).toHaveLength(11);
    expect(response.data.groups.every((group) => group.parentId === 'cambridge-9-test-4')).toBe(true);
    expect(response.meta.license).toBe('CC BY 4.0');
  });

  it('returns an untagged paper without groups', async () => {
    const response = await server.json<{ groups: TestcenterGroup[] } & TestcenterCatalogItem>(
      '/v1/testcenter/catalog/placement-test-1',
    );
    expect(response.data.taggedGroups).toBe(0);
    expect(response.data.groups).toHaveLength(0);
  });

  it('serves slugified identifiers whose upstream ids are non-ASCII', async () => {
    const response = await server.json<{ upstreamId: string } & TestcenterCatalogItem>(
      '/v1/testcenter/catalog/list1',
    );
    expect(response.data.upstreamId).toBe('四级精简list1');
    expect(response.data.title).toContain('精简版');
  });

  it('404s for unknown ids', async () => {
    expect((await server.json('/v1/testcenter/catalog/no-such-paper')).status).toBe(404);
  });
});

describe('GET /v1/testcenter/volumes', () => {
  it('returns the holdings matrix', async () => {
    const response = await server.json<TestcenterVolumeRow[]>('/v1/testcenter/volumes');
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(19);
    expect(response.meta.count).toBe(19);
  });
});

describe('GET /v1/testcenter/volumes/:id', () => {
  it('returns one row', async () => {
    const response = await server.json<TestcenterVolumeRow>('/v1/testcenter/volumes/10');
    expect(response.status).toBe(200);
    expect(response.data.volume).toBe(10);
    expect(response.data.complete).toBe(true);
  });

  it('404s for unknown and non-numeric ids', async () => {
    expect((await server.json('/v1/testcenter/volumes/2')).status).toBe(404);
    expect((await server.json('/v1/testcenter/volumes/22')).status).toBe(404);
    expect((await server.json('/v1/testcenter/volumes/cambridge')).status).toBe(404);
  });
});

describe('GET /v1/testcenter/groups', () => {
  it('paginates with defaults', async () => {
    const response = await server.json<TestcenterGroup[]>('/v1/testcenter/groups');
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(20);
    expect(response.meta.total).toBe(1099);
    expect(response.meta.sort).toBe('volume');
    expect(response.data[0]?.id).toBe('cambridge-5-test-1-s1-q1-4');
  });

  it('filters by paper, type, scene, difficulty, volume and test', async () => {
    const papers = await server.json<TestcenterGroup[]>('/v1/testcenter/groups?paper=listening&limit=100');
    expect(papers.meta.total).toBe(530);
    expect(papers.data.every((group) => group.paper === 'listening')).toBe(true);

    const types = await server.json<TestcenterGroup[]>(
      '/v1/testcenter/groups?type=true-false-not-given&limit=100',
    );
    expect(types.meta.total).toBe(141);

    const scenes = await server.json<TestcenterGroup[]>('/v1/testcenter/groups?scene=tourism&limit=100');
    expect(scenes.meta.total).toBe(82);

    const difficulties = await server.json<TestcenterGroup[]>(
      '/v1/testcenter/groups?difficulty=easy&paper=listening&limit=100',
    );
    expect(difficulties.meta.total).toBe(137);

    const volume = await server.json<TestcenterGroup[]>('/v1/testcenter/groups?volume=5&test=1&limit=100');
    expect(volume.data.every((group) => group.volume === 5 && group.test === 1)).toBe(true);
  });

  it('searches free text including the Chinese labels', async () => {
    const response = await server.json<TestcenterGroup[]>('/v1/testcenter/groups?q=判断题&limit=100');
    expect(response.meta.total).toBe(141);
    expect(response.data.every((group) => group.rawType === '判断题')).toBe(true);
  });

  it('sorts by questions descending', async () => {
    const response = await server.json<TestcenterGroup[]>(
      '/v1/testcenter/groups?sort=questions&order=desc&limit=2',
    );
    expect(response.data[0]?.questions).toBe(10);
    expect(response.data[0]?.questions).toBeGreaterThanOrEqual(response.data[1]?.questions ?? 0);
  });

  it('rejects unknown facet values and bad integers', async () => {
    expect((await server.json('/v1/testcenter/groups?paper=writing')).status).toBe(400);
    expect((await server.json('/v1/testcenter/groups?type=nope')).status).toBe(400);
    expect((await server.json('/v1/testcenter/groups?scene=nope')).status).toBe(400);
    expect((await server.json('/v1/testcenter/groups?difficulty=impossible')).status).toBe(400);
    expect((await server.json('/v1/testcenter/groups?volume=22')).status).toBe(400);
    expect((await server.json('/v1/testcenter/groups?test=5')).status).toBe(400);
    expect((await server.json('/v1/testcenter/groups?sort=nope')).status).toBe(400);
  });
});

describe('GET /v1/testcenter/scenes', () => {
  it('returns both scene tables with the crosswalk note', async () => {
    const response = await server.json<{
      listening: { id: string; themeGroup: string }[];
      reading: { id: string; themeGroup: string }[];
    }>('/v1/testcenter/scenes');
    expect(response.status).toBe(200);
    expect(response.data.listening).toHaveLength(16);
    expect(response.data.reading).toHaveLength(8);
    expect(response.meta.count).toBe(24);
    expect(response.meta.note).toContain('themes');
  });
});

describe('GET /v1/testcenter/scoring', () => {
  it('returns the whole calibration without parameters', async () => {
    const response = await server.json<{
      provenance: string;
      listening: { rows: unknown[] };
      reading: { rows: unknown[] };
    }>('/v1/testcenter/scoring');
    expect(response.status).toBe(200);
    expect(response.data.provenance).toBe('production-calibration');
    expect(response.data.listening.rows).toHaveLength(14);
    expect(response.data.reading.rows).toHaveLength(15);
  });

  it('returns one table when only paper is given', async () => {
    const response = await server.json<{ reading: { max: number } }>('/v1/testcenter/scoring?paper=reading');
    expect(response.data.reading.max).toBe(40);
    expect(response.meta.paper).toBe('reading');
  });

  it('looks a band up for a raw score', async () => {
    const response = await server.json<{
      paper: string;
      raw: number;
      band: number;
      level: string;
      rawRange: { from: number; to: number };
    }>('/v1/testcenter/scoring?paper=listening&raw=34');
    expect(response.status).toBe(200);
    expect(response.data).toEqual({
      paper: 'listening',
      raw: 34,
      band: 7.5,
      level: 'Good user',
      rawRange: { from: 32, to: 34 },
    });
    expect(response.meta.lookup).toBe(true);
  });

  it('404s for raw scores outside the table', async () => {
    expect((await server.json('/v1/testcenter/scoring?paper=listening&raw=41')).status).toBe(404);
    expect((await server.json('/v1/testcenter/scoring?paper=reading&raw=-2')).status).toBe(404);
  });

  it('rejects a raw score without a paper, a bad paper and a non-integer raw', async () => {
    expect((await server.json('/v1/testcenter/scoring?raw=30')).status).toBe(400);
    expect((await server.json('/v1/testcenter/scoring?paper=writing')).status).toBe(400);
    expect((await server.json('/v1/testcenter/scoring?paper=listening&raw=thirty')).status).toBe(400);
  });
});

describe('GET /v1/testcenter/drill', () => {
  it('composes the default deterministic drill', async () => {
    const response = await server.json<{
      paper: string;
      selection: TestcenterGroup[];
      totals: { groups: number; questions: number };
      timing: { budgetMinutes: number; suggestedMinutes: number };
      scoring: { scale: string; table: { rows: unknown[] } };
    }>('/v1/testcenter/drill?paper=listening');
    expect(response.status).toBe(200);
    expect(response.data.totals).toEqual({ groups: 3, questions: 10 });
    expect(response.data.timing.budgetMinutes).toBe(8);
    expect(response.data.scoring.scale).toBe('listening-raw-40');
    expect(response.meta.count).toBe(3);
    expect(response.meta.deterministic).toBe(true);
    expect(response.meta.note).toBeUndefined();
  });

  it('marks the overshoot when the last group exceeds the budget', async () => {
    const response = await server.json<{ totals: { questions: number } }>(
      '/v1/testcenter/drill?paper=listening&questions=1',
    );
    expect(response.data.totals.questions).toBe(4);
    expect(response.meta.note).toContain('overshoots');
  });

  it('honours filters and an explicit budget', async () => {
    const response = await server.json<{
      filters: Record<string, unknown>;
      selection: TestcenterGroup[];
      timing: { budgetMinutes: number };
    }>('/v1/testcenter/drill?paper=reading&difficulty=hard&volume=10&questions=8&minutes=15');
    expect(response.data.filters).toEqual({
      type: null,
      scene: null,
      difficulty: 'hard',
      volume: 10,
      test: null,
    });
    expect(response.data.selection.every((group) => group.difficulty === 'hard' && group.volume === 10)).toBe(
      true,
    );
    expect(response.data.timing.budgetMinutes).toBe(15);
  });

  it('restricts the selection by scene and test', async () => {
    const response = await server.json<{
      selection: TestcenterGroup[];
      totals: { groups: number };
    }>('/v1/testcenter/drill?paper=listening&scene=tourism&test=1&questions=40');
    expect(response.data.totals.groups).toBeGreaterThan(0);
    expect(response.data.selection.every((group) => group.scene === 'tourism' && group.test === 1)).toBe(
      true,
    );
  });

  it('returns an empty drill when nothing matches', async () => {
    const response = await server.json<{ totals: { groups: number } }>(
      '/v1/testcenter/drill?paper=reading&type=short-answer',
    );
    expect(response.data.totals.groups).toBe(0);
    expect(response.meta.note).toBeUndefined();
  });

  it('rejects a missing or invalid paper and bad parameters', async () => {
    expect((await server.json('/v1/testcenter/drill')).status).toBe(400);
    expect((await server.json('/v1/testcenter/drill?paper=writing')).status).toBe(400);
    expect((await server.json('/v1/testcenter/drill?paper=listening&type=nope')).status).toBe(400);
    expect((await server.json('/v1/testcenter/drill?paper=listening&scene=nope')).status).toBe(400);
    expect((await server.json('/v1/testcenter/drill?paper=listening&difficulty=impossible')).status).toBe(
      400,
    );
    expect((await server.json('/v1/testcenter/drill?paper=listening&questions=0')).status).toBe(400);
    expect((await server.json('/v1/testcenter/drill?paper=listening&questions=41')).status).toBe(400);
    expect((await server.json('/v1/testcenter/drill?paper=listening&minutes=0')).status).toBe(400);
    expect((await server.json('/v1/testcenter/drill?paper=listening&minutes=181')).status).toBe(400);
    expect((await server.json('/v1/testcenter/drill?paper=listening&volume=22')).status).toBe(400);
    expect((await server.json('/v1/testcenter/drill?paper=listening&test=5')).status).toBe(400);
  });
});
