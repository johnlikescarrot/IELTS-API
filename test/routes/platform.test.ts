import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type {
  ALevelBoard,
  EbbinghausSchedule,
  PlatformManifestItem,
  PlatformMeta,
  PlatformStats,
  VocabTheme,
  VocabThemeCategory,
} from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/platform', () => {
  it('returns meta, stats and facets', async () => {
    const response = await server.json<{ meta: PlatformMeta; stats: PlatformStats }>('/v1/platform');
    expect(response.status).toBe(200);
    expect(response.data.meta.repository).toBe('https://github.com/wanli4473/yysd-testcenter');
    expect(response.data.meta.commit).toBe('0956ea375405e30b31bd554822726e4245bf077a');
    expect(response.data.stats.manifestItems).toBe(377);
    const facets = response.meta.facets as { zone: string[]; subject: string[]; vocabCategory: string[] };
    expect(facets.zone).toContain('mock');
    expect(facets.subject).toContain('vocab');
    expect(facets.vocabCategory).toContain('exam');
  });
});

describe('GET /v1/platform/stats', () => {
  it('returns aggregate stats only', async () => {
    const response = await server.json<PlatformStats>('/v1/platform/stats');
    expect(response.status).toBe(200);
    expect(response.data.listeningGroups).toBe(530);
    expect(response.data.alevelPapers).toBe(852);
  });
});

describe('GET /v1/platform/manifest', () => {
  it('returns manifest stats and facets', async () => {
    const response = await server.json<{ stats: PlatformStats['manifest']; items: number }>(
      '/v1/platform/manifest',
    );
    expect(response.status).toBe(200);
    expect(response.data.items).toBe(377);
    expect(response.data.stats.byZone.mock).toBe(226);
    const facets = response.meta.facets as { zone: string[]; subject: string[] };
    expect(facets.zone).toEqual(['mock', 'practice', 'study']);
  });
});

describe('GET /v1/platform/manifest/items', () => {
  it('paginates manifest', async () => {
    const response = await server.json<PlatformManifestItem[]>('/v1/platform/manifest/items?limit=2');
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(2);
    expect(response.meta.total).toBe(377);
    expect(response.meta.sort).toBe('id');
    expect(response.meta.order).toBe('asc');
    expect(String(response.meta.note)).toContain('is redistributed');
    const facets = response.meta.facets as { zone: string[] };
    expect(facets.zone).toContain('mock');
  });

  it('filters by zone and subject', async () => {
    const mock = await server.json<PlatformManifestItem[]>('/v1/platform/manifest/items?zone=mock&limit=50');
    expect(mock.data.every((item) => item.zone === 'mock')).toBe(true);
    expect(mock.data.length).toBeGreaterThan(0);

    const vocab = await server.json<PlatformManifestItem[]>(
      '/v1/platform/manifest/items?subject=vocab&limit=50',
    );
    expect(vocab.data.every((item) => item.subject === 'vocab')).toBe(true);

    const combined = await server.json<PlatformManifestItem[]>(
      '/v1/platform/manifest/items?zone=study&subject=vocab&limit=50',
    );
    expect(combined.data.every((item) => item.zone === 'study' && item.subject === 'vocab')).toBe(true);
  });

  it('searches free text', async () => {
    const response = await server.json<PlatformManifestItem[]>(
      '/v1/platform/manifest/items?q=cambridge&limit=50',
    );
    expect(response.data.length).toBeGreaterThan(0);
    expect(response.data.length).toBeLessThan(377);
    expect(response.meta.query).toBe('cambridge');
  });

  it('sorts by title and duration', async () => {
    const byDuration = await server.json<PlatformManifestItem[]>(
      '/v1/platform/manifest/items?sort=duration&order=desc&limit=2',
    );
    expect(byDuration.data[0]!.duration).toBeGreaterThanOrEqual(byDuration.data[1]!.duration);

    const byTitle = await server.json<PlatformManifestItem[]>(
      '/v1/platform/manifest/items?sort=title&limit=2',
    );
    expect(byTitle.data.length).toBe(2);

    const byAdded = await server.json<PlatformManifestItem[]>(
      '/v1/platform/manifest/items?sort=added&limit=2',
    );
    expect(byAdded.data.length).toBe(2);
  });

  it('supports offset and query absence', async () => {
    const first = await server.json<PlatformManifestItem[]>('/v1/platform/manifest/items?limit=2&offset=0');
    const second = await server.json<PlatformManifestItem[]>('/v1/platform/manifest/items?limit=2&offset=2');
    expect(first.data[0]!.id).not.toBe(second.data[0]!.id);
    expect(first.meta.query).toBeNull();
  });

  it('rejects unknown facet values', async () => {
    expect((await server.json('/v1/platform/manifest/items?zone=nope')).status).toBe(400);
    expect((await server.json('/v1/platform/manifest/items?subject=nope')).status).toBe(400);
  });

  it('rejects invalid sort/order', async () => {
    expect((await server.json('/v1/platform/manifest/items?sort=nope')).status).toBe(400);
    expect((await server.json('/v1/platform/manifest/items?order=nope')).status).toBe(400);
  });
});

describe('GET /v1/platform/manifest/:id', () => {
  it('returns one manifest item', async () => {
    const list = await server.json<PlatformManifestItem[]>('/v1/platform/manifest/items?limit=1');
    const id = list.data[0]!.id;
    const response = await server.json<PlatformManifestItem>(`/v1/platform/manifest/${id}`);
    expect(response.status).toBe(200);
    expect(response.data.id).toBe(id);
    const upper = await server.json<PlatformManifestItem>(`/v1/platform/manifest/${id.toUpperCase()}`);
    expect(upper.data.id).toBe(id);
  });

  it('returns 404 for unknown id', async () => {
    const response = await server.json('/v1/platform/manifest/does-not-exist');
    expect(response.status).toBe(404);
  });
});

describe('GET /v1/platform/vocab-themes', () => {
  it('returns categories and stats', async () => {
    const response = await server.json<{
      categories: VocabThemeCategory[];
      stats: PlatformStats['vocabThemesStats'];
    }>('/v1/platform/vocab-themes');
    expect(response.status).toBe(200);
    expect(response.data.categories).toHaveLength(10);
    expect(response.data.stats.themes).toBe(36);
    const facets = response.meta.facets as { category: string[] };
    expect(facets.category).toContain('exam');
  });
});

describe('GET /v1/platform/vocab-themes/items', () => {
  it('paginates vocab themes', async () => {
    const response = await server.json<VocabTheme[]>('/v1/platform/vocab-themes/items?limit=2');
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(2);
    expect(response.meta.total).toBe(36);
    expect(response.meta.sort).toBe('id');
    const facets = response.meta.facets as { category: string[] };
    expect(facets.category).toContain('exam');
  });

  it('filters by category', async () => {
    const exam = await server.json<VocabTheme[]>('/v1/platform/vocab-themes/items?category=exam&limit=10');
    expect(exam.data.every((item) => item.category === 'exam')).toBe(true);
    expect(exam.data.length).toBeGreaterThan(0);
  });

  it('searches free text', async () => {
    const response = await server.json<VocabTheme[]>('/v1/platform/vocab-themes/items?q=animals&limit=10');
    expect(response.data.length).toBeGreaterThan(0);
    expect(response.data[0]!.id).toBe('animals');
    expect(response.meta.query).toBe('animals');
  });

  it('sorts by count', async () => {
    const response = await server.json<VocabTheme[]>(
      '/v1/platform/vocab-themes/items?sort=count&order=desc&limit=2',
    );
    expect(response.data[0]!.count).toBeGreaterThanOrEqual(response.data[1]!.count);
    const byTitle = await server.json<VocabTheme[]>('/v1/platform/vocab-themes/items?sort=title&limit=2');
    expect(byTitle.data.length).toBe(2);
  });

  it('rejects unknown category and sort', async () => {
    expect((await server.json('/v1/platform/vocab-themes/items?category=nope')).status).toBe(400);
    expect((await server.json('/v1/platform/vocab-themes/items?sort=nope')).status).toBe(400);
  });
});

describe('GET /v1/platform/vocab-themes/:id', () => {
  it('returns one theme', async () => {
    const response = await server.json<VocabTheme>('/v1/platform/vocab-themes/animals');
    expect(response.status).toBe(200);
    expect(response.data.id).toBe('animals');
    const upper = await server.json<VocabTheme>('/v1/platform/vocab-themes/ANIMALS');
    expect(upper.data.id).toBe('animals');
  });

  it('returns 404 for unknown id', async () => {
    expect((await server.json('/v1/platform/vocab-themes/nope')).status).toBe(404);
  });
});

describe('GET /v1/platform/speaking', () => {
  it('returns speaking bank overview', async () => {
    const response = await server.json<{
      id: string;
      part1: unknown[];
      part2: unknown[];
      stats: PlatformStats['speaking'];
    }>('/v1/platform/speaking');
    expect(response.status).toBe(200);
    expect(response.data.id).toBe('2026-q2');
    expect(response.data.stats.totalTopics).toBe(95);
    expect(String(response.meta.note)).toContain('is redistributed');
  });
});

describe('GET /v1/platform/alevel', () => {
  it('returns boards and stats', async () => {
    const response = await server.json<{ boards: ALevelBoard[]; stats: PlatformStats['alevel'] }>(
      '/v1/platform/alevel',
    );
    expect(response.status).toBe(200);
    expect(response.data.boards).toHaveLength(3);
    expect(response.data.stats.papers).toBe(852);
    expect(response.data.boards.map((b) => b.id)).toContain('caie');
  });
});

describe('GET /v1/platform/alevel/:id', () => {
  it('returns one board', async () => {
    const response = await server.json<ALevelBoard>('/v1/platform/alevel/caie');
    expect(response.status).toBe(200);
    expect(response.data.id).toBe('caie');
    const upper = await server.json<ALevelBoard>('/v1/platform/alevel/CAIE');
    expect(upper.data.id).toBe('caie');
  });

  it('returns 404 for unknown board', async () => {
    expect((await server.json('/v1/platform/alevel/nope')).status).toBe(404);
  });
});

describe('GET /v1/platform/schedules', () => {
  it('returns ebbinghaus schedules', async () => {
    const response = await server.json<EbbinghausSchedule[]>('/v1/platform/schedules');
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(2);
    expect(response.data.map((s) => s.bookId)).toContain('cet4-lite');
  });
});
