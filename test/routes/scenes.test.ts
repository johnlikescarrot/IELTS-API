import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

interface SceneSummary {
  id: string;
  skill: string;
  sections: number[];
  typicalQuestionTypes: string[];
}

describe('GET /v1/scenes', () => {
  it('lists every communicative context', async () => {
    const response = await server.json<SceneSummary[]>('/v1/scenes');
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(20);
    expect(response.meta.total).toBe(20);
  });

  it('filters by skill', async () => {
    const response = await server.json<SceneSummary[]>('/v1/scenes?skill=reading');
    expect(response.data).toHaveLength(8);
    expect(response.data.every((scene) => scene.skill === 'reading')).toBe(true);
    expect(response.meta.skill).toBe('reading');
  });

  it('filters by section', async () => {
    const response = await server.json<SceneSummary[]>('/v1/scenes?section=4');
    expect(response.data).toHaveLength(1);
    expect(response.data[0]?.id).toBe('academic-lecture');
    expect(response.meta.section).toBe(4);
  });

  it('filters by favoured question type', async () => {
    const response = await server.json<SceneSummary[]>('/v1/scenes?type=matching-headings');
    expect(response.data.length).toBeGreaterThan(0);
    expect(response.data.every((scene) => scene.skill === 'reading')).toBe(true);
    expect(response.meta.type).toBe('matching-headings');
  });

  it('searches names, descriptions, signals and keywords', async () => {
    const response = await server.json<SceneSummary[]>('/v1/scenes?q=warranty');
    expect(response.data.map((scene) => scene.id)).toEqual(['shopping-consumer']);
  });

  it('combines every filter', async () => {
    const response = await server.json<SceneSummary[]>(
      '/v1/scenes?skill=listening&section=1&type=sentence-completion&q=rent',
    );
    expect(response.data.map((scene) => scene.id)).toEqual(['accommodation']);
  });

  it('rejects invalid filters', async () => {
    expect((await server.json('/v1/scenes?skill=writing')).status).toBe(400);
    expect((await server.json('/v1/scenes?section=5')).status).toBe(400);
    expect((await server.json('/v1/scenes?type=nope')).status).toBe(400);
  });
});

describe('GET /v1/scenes/:id', () => {
  it('returns one context with dataset links', async () => {
    const response = await server.json<SceneSummary>('/v1/scenes/academic-lecture');
    expect(response.status).toBe(200);
    expect(response.data.id).toBe('academic-lecture');
    const questionTypes = response.meta.questionTypes as string[];
    expect(questionTypes[0]).toMatch(/^\/v1\/question-types\//);
    const vocabulary = response.meta.vocabulary as string[];
    expect(vocabulary[0]).toMatch(/^\/v1\/vocabulary\?q=/);
    expect(response.meta.practice).toBe('/v1/tests/items?skill=listening');
  });

  it('reports unknown identifiers', async () => {
    const response = await server.json('/v1/scenes/nope');
    expect(response.status).toBe(404);
  });
});
