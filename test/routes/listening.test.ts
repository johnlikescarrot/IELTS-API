import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type {
  ListeningDifficulty,
  ListeningGroup,
  ListeningScene,
  ListeningStats,
  ListeningType,
} from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/listening', () => {
  it('returns taxonomy overview with facets', async () => {
    const response = await server.json<{ stats: ListeningStats }>('/v1/listening');
    expect(response.status).toBe(200);
    expect(response.data.stats.groups).toBe(530);
    expect(response.data.stats.questions).toBe(2720);
    const facets = response.meta.facets as {
      volume: string[];
      part: string[];
      qType: string[];
      scene: string[];
      diff: string[];
    };
    expect(facets.volume).toContain('5');
    expect(facets.part).toEqual(['1', '2', '3', '4']);
    expect(facets.qType).toContain('gap-fill');
    expect(facets.scene).toContain('travel');
    expect(facets.diff).toContain('easy');
  });
});

describe('GET /v1/listening/stats', () => {
  it('returns stats only', async () => {
    const response = await server.json<ListeningStats>('/v1/listening/stats');
    expect(response.status).toBe(200);
    expect(response.data.byVolume['5']).toBe(32);
    expect(response.data.byType['gap-fill']).toBe(211);
  });
});

describe('GET /v1/listening/types', () => {
  it('returns all listening types', async () => {
    const response = await server.json<ListeningType[]>('/v1/listening/types');
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(7);
    expect(response.data.map((t) => t.id)).toContain('gap-fill');
    const gapFill = response.data.find((t) => t.id === 'gap-fill')!;
    expect(gapFill.chinese).toBe('填空题');
    expect(gapFill.occurrences).toBe(211);
  });
});

describe('GET /v1/listening/types/:id', () => {
  it('returns one type', async () => {
    const response = await server.json<ListeningType>('/v1/listening/types/gap-fill');
    expect(response.status).toBe(200);
    expect(response.data.id).toBe('gap-fill');
    const upper = await server.json<ListeningType>('/v1/listening/types/GAP-FILL');
    expect(upper.data.id).toBe('gap-fill');
  });

  it('returns 404 for unknown type', async () => {
    expect((await server.json('/v1/listening/types/nope')).status).toBe(404);
  });
});

describe('GET /v1/listening/scenes', () => {
  it('returns all scenes', async () => {
    const response = await server.json<ListeningScene[]>('/v1/listening/scenes');
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(16);
    expect(response.data.map((s) => s.id)).toContain('travel');
  });
});

describe('GET /v1/listening/scenes/:id', () => {
  it('returns one scene', async () => {
    const response = await server.json<ListeningScene>('/v1/listening/scenes/travel');
    expect(response.status).toBe(200);
    expect(response.data.id).toBe('travel');
    const upper = await server.json<ListeningScene>('/v1/listening/scenes/TRAVEL');
    expect(upper.data.id).toBe('travel');
  });

  it('returns 404 for unknown scene', async () => {
    expect((await server.json('/v1/listening/scenes/nope')).status).toBe(404);
  });
});

describe('GET /v1/listening/diffs', () => {
  it('returns difficulty tiers', async () => {
    const response = await server.json<ListeningDifficulty[]>('/v1/listening/diffs');
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(4);
    expect(response.data.map((d) => d.id)).toContain('easy');
  });
});

describe('GET /v1/listening/groups', () => {
  it('paginates groups', async () => {
    const response = await server.json<ListeningGroup[]>('/v1/listening/groups?limit=2');
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(2);
    expect(response.meta.total).toBe(530);
    expect(response.meta.sort).toBe('id');
    expect(response.meta.order).toBe('asc');
    const facets = response.meta.facets as { volume: string[] };
    expect(facets.volume).toContain('5');
  });

  it('filters by volume, part, type, scene and diff', async () => {
    const byVolume = await server.json<ListeningGroup[]>('/v1/listening/groups?volume=5&limit=50');
    expect(byVolume.data.every((g) => g.volume === '5')).toBe(true);
    expect(byVolume.data.length).toBe(32);

    const byPart = await server.json<ListeningGroup[]>('/v1/listening/groups?part=1&limit=50');
    expect(byPart.data.every((g) => g.part === 1)).toBe(true);

    const byType = await server.json<ListeningGroup[]>('/v1/listening/groups?qType=matching&limit=50');
    expect(byType.data.every((g) => g.qType === 'matching')).toBe(true);

    const byScene = await server.json<ListeningGroup[]>('/v1/listening/groups?scene=travel&limit=50');
    expect(byScene.data.every((g) => g.scene === 'travel')).toBe(true);

    const byDiff = await server.json<ListeningGroup[]>('/v1/listening/groups?diff=easy&limit=50');
    expect(byDiff.data.every((g) => g.diff === 'easy')).toBe(true);

    const combined = await server.json<ListeningGroup[]>('/v1/listening/groups?volume=5&part=1&limit=10');
    expect(combined.data.every((g) => g.volume === '5' && g.part === 1)).toBe(true);
  });

  it('searches free text', async () => {
    const response = await server.json<ListeningGroup[]>('/v1/listening/groups?q=gap-fill&limit=50');
    expect(response.meta.total).toBe(211);
    expect(response.data.length).toBe(50);
    expect(response.meta.query).toBe('gap-fill');
  });

  it('sorts by volume, part and questions', async () => {
    const byVolume = await server.json<ListeningGroup[]>(
      '/v1/listening/groups?sort=volume&order=desc&limit=3',
    );
    expect(Number(byVolume.data[0]!.volume)).toBeGreaterThanOrEqual(Number(byVolume.data[2]!.volume));

    const byPart = await server.json<ListeningGroup[]>('/v1/listening/groups?sort=part&limit=3');
    expect(byPart.data[0]!.part).toBeLessThanOrEqual(byPart.data[2]!.part);

    const byQuestions = await server.json<ListeningGroup[]>(
      '/v1/listening/groups?sort=questions&order=desc&limit=3',
    );
    expect(byQuestions.data[0]!.questions).toBeGreaterThanOrEqual(byQuestions.data[2]!.questions);
  });

  it('supports offset and null query', async () => {
    const first = await server.json<ListeningGroup[]>('/v1/listening/groups?limit=2&offset=0');
    const second = await server.json<ListeningGroup[]>('/v1/listening/groups?limit=2&offset=2');
    expect(first.data[0]!.id).not.toBe(second.data[0]!.id);
    expect(first.meta.query).toBeNull();
  });

  it('rejects unknown facet values and sort/order', async () => {
    expect((await server.json('/v1/listening/groups?volume=nope')).status).toBe(400);
    expect((await server.json('/v1/listening/groups?qType=nope')).status).toBe(400);
    expect((await server.json('/v1/listening/groups?scene=nope')).status).toBe(400);
    expect((await server.json('/v1/listening/groups?diff=nope')).status).toBe(400);
    expect((await server.json('/v1/listening/groups?part=9')).status).toBe(400);
    expect((await server.json('/v1/listening/groups?sort=nope')).status).toBe(400);
    expect((await server.json('/v1/listening/groups?order=nope')).status).toBe(400);
  });
});

describe('GET /v1/listening/groups/:id', () => {
  it('returns one group', async () => {
    const list = await server.json<ListeningGroup[]>('/v1/listening/groups?limit=1');
    const id = list.data[0]!.id;
    const response = await server.json<ListeningGroup>(`/v1/listening/groups/${id}`);
    expect(response.status).toBe(200);
    expect(response.data.id).toBe(id);
    const upper = await server.json<ListeningGroup>(`/v1/listening/groups/${id.toUpperCase()}`);
    expect(upper.data.id).toBe(id);
  });

  it('returns 404 for unknown group', async () => {
    expect((await server.json('/v1/listening/groups/does-not-exist')).status).toBe(404);
  });
});
