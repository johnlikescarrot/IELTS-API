import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type {
  BlueprintGroup,
  BlueprintScene,
  BlueprintStats,
  BlueprintTest,
  BlueprintType,
  BlueprintVolume,
} from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/blueprints', () => {
  it('returns provenance, statistics and facets', async () => {
    const response = await server.json<{
      meta: { repository: string; sources: { path: string }[] };
      stats: BlueprintStats;
    }>('/v1/blueprints');
    expect(response.status).toBe(200);
    expect(response.data.meta.repository).toContain('wanli4473/yysd-testcenter');
    expect(response.data.meta.sources).toHaveLength(2);
    expect(response.data.stats.annotatedGroups).toBe(1099);
    expect(response.data.stats.tests).toBe(136);
    const facets = response.meta.facets as { skill: string[]; difficulty: string[] };
    expect(facets.skill).toEqual(['listening', 'reading']);
    expect(facets.difficulty).toContain('hard');
  });
});

describe('GET /v1/blueprints/stats', () => {
  it('returns statistics only, with the licensing note', async () => {
    const response = await server.json<BlueprintStats>('/v1/blueprints/stats');
    expect(response.data.annotatedQuestions).toBe(5408);
    expect(response.data.completeTests).toBe(125);
    expect(response.meta.note).toContain('Annotation metadata only');
  });
});

describe('GET /v1/blueprints/types', () => {
  it('returns the question-type table', async () => {
    const response = await server.json<BlueprintType[]>('/v1/blueprints/types');
    expect(response.data.length).toBeGreaterThan(5);
    const total = response.data.reduce((sum, row) => sum + row.groups, 0);
    expect(total).toBe(1099);
    const identification = response.data.find((row) => row.questionType === 'true-false-not-given');
    expect(identification?.approximate).toBe(true);
    expect(identification?.sourceLabels).toContain('判断题');
    expect(response.meta.total).toBe(response.data.length);
  });
});

describe('GET /v1/blueprints/scenes', () => {
  it('returns the scene table with skill-scoped slugs', async () => {
    const response = await server.json<BlueprintScene[]>('/v1/blueprints/scenes');
    expect(response.data).toHaveLength(24);
    for (const scene of response.data) {
      expect(scene.scene.startsWith(`${scene.skill}-`)).toBe(true);
    }
    expect(response.meta.note).toContain('separate scene vocabularies');
  });
});

describe('GET /v1/blueprints/volumes', () => {
  it('returns one row per Cambridge volume', async () => {
    const response = await server.json<BlueprintVolume[]>('/v1/blueprints/volumes');
    expect(response.data).toHaveLength(17);
    expect(response.data[0]?.volume).toBe(5);
    expect(response.data.at(-1)?.volume).toBe(21);
    expect(response.meta.total).toBe(17);
  });
});

describe('GET /v1/blueprints/tests', () => {
  it('lists every annotated paper', async () => {
    const response = await server.json<BlueprintTest[]>('/v1/blueprints/tests');
    expect(response.data).toHaveLength(136);
    expect(response.meta.complete).toBe(125);
  });

  it('filters by skill', async () => {
    const response = await server.json<BlueprintTest[]>('/v1/blueprints/tests?skill=reading');
    expect(response.data).toHaveLength(68);
    expect(response.data.every((test) => test.skill === 'reading')).toBe(true);
  });

  it('rejects an unknown skill', async () => {
    const response = await server.json('/v1/blueprints/tests?skill=writing');
    expect(response.status).toBe(400);
  });
});

describe('GET /v1/blueprints/tests/:id', () => {
  it('returns one paper with its groups in question order', async () => {
    const response = await server.json<BlueprintTest & { groups: BlueprintGroup[] }>(
      '/v1/blueprints/tests/reading-cam18-t3',
    );
    expect(response.status).toBe(200);
    expect(response.data.volume).toBe(18);
    expect(response.data.groups.length).toBeGreaterThan(0);
    // This paper is one of the incompletely annotated ones.
    expect(response.data.complete).toBe(false);
    expect(response.data.missingQuestions.length).toBeGreaterThan(0);
  });

  it('404s on an unknown paper', async () => {
    const response = await server.json<null>('/v1/blueprints/tests/reading-cam99-t9');
    expect(response.status).toBe(404);
    const error = response.meta.error as { message: string };
    expect(error.message).toContain('reading-cam99-t9');
  });
});

describe('GET /v1/blueprints/groups', () => {
  it('paginates and reports facets', async () => {
    const response = await server.json<BlueprintGroup[]>('/v1/blueprints/groups?limit=3');
    expect(response.data).toHaveLength(3);
    expect(response.meta.total).toBe(1099);
    expect(response.meta.hasMore).toBe(true);
    expect(response.meta.sort).toBe('volume');
    expect(response.meta.query).toBeNull();
  });

  it('filters on every supported parameter', async () => {
    const response = await server.json<BlueprintGroup[]>(
      '/v1/blueprints/groups?skill=listening&questionType=diagram-label-completion&difficulty=hard&volume=9,10&part=2&limit=50',
    );
    expect(response.status).toBe(200);
    for (const group of response.data) {
      expect(group.skill).toBe('listening');
      expect(group.questionType).toBe('diagram-label-completion');
      expect(group.difficulty).toBe('hard');
      expect([9, 10]).toContain(group.volume);
      expect(group.part).toBe(2);
    }
  });

  it('filters by scene and free text', async () => {
    const scene = await server.json<BlueprintGroup[]>(
      '/v1/blueprints/groups?scene=reading-finance-business&limit=5',
    );
    expect(scene.data.every((group) => group.scene === 'reading-finance-business')).toBe(true);
    const text = await server.json<BlueprintGroup[]>('/v1/blueprints/groups?q=matching-headings');
    expect(text.meta.query).toBe('matching-headings');
    expect(text.data.length).toBeGreaterThan(0);
  });

  it('sorts on request', async () => {
    const response = await server.json<BlueprintGroup[]>(
      '/v1/blueprints/groups?sort=questions&order=desc&limit=1',
    );
    expect(response.meta.order).toBe('desc');
    expect(response.data[0]?.questions).toBe(10);
  });

  it('rejects unknown filter values', async () => {
    for (const path of [
      '/v1/blueprints/groups?skill=speaking',
      '/v1/blueprints/groups?questionType=essay',
      '/v1/blueprints/groups?scene=space',
      '/v1/blueprints/groups?difficulty=impossible',
      '/v1/blueprints/groups?volume=42',
    ]) {
      const response = await server.json(path);
      expect(response.status).toBe(400);
    }
  });
});

describe('GET /v1/blueprints/groups/:id', () => {
  it('returns one annotated group', async () => {
    const response = await server.json<BlueprintGroup>('/v1/blueprints/groups/listening-cam5-t1-q1-4');
    expect(response.status).toBe(200);
    expect(response.data.sourceId).toBe('cambridge-5-test-1-s1-q1-4');
    expect(response.data.questionTypeLabel).toBe('Gap fill / completion');
    expect(response.data.approximate).toBe(true);
  });

  it('404s on an unknown group', async () => {
    const response = await server.json<null>('/v1/blueprints/groups/nope');
    expect(response.status).toBe(404);
  });
});
