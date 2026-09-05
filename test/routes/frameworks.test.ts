import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { ResponseFramework } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/frameworks', () => {
  it('returns the whole taxonomy with cross-links', async () => {
    const response = await server.json<ResponseFramework[]>('/v1/frameworks');
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(12);
    expect(response.meta.total).toBe(12);
    expect(response.meta.sections).toEqual(['writing-task-2', 'speaking-part-2', 'speaking-part-3']);
    const crossLinks = response.meta.crossLinks as Record<string, string>;
    expect(crossLinks.writingPrompts).toBe('/v1/topics/writing');
  });

  it('filters by section, skill, question type and part', async () => {
    const section = await server.json<ResponseFramework[]>('/v1/frameworks?section=writing-task-2');
    expect(section.data).toHaveLength(6);
    expect(section.data.every((framework) => framework.section === 'writing-task-2')).toBe(true);

    const skill = await server.json<ResponseFramework[]>('/v1/frameworks?skill=speaking');
    expect(skill.data.every((framework) => framework.skill === 'speaking')).toBe(true);
    expect(skill.data).toHaveLength(6);

    const type = await server.json<ResponseFramework[]>('/v1/frameworks?type=opinion');
    expect(type.data.length).toBeGreaterThan(0);
    expect(type.meta.type).toBe('opinion');
    for (const framework of type.data) {
      expect(framework.questionTypes).toContain('opinion');
    }

    const part = await server.json<ResponseFramework[]>('/v1/frameworks?part=3');
    expect(part.data.length).toBeGreaterThan(0);
    for (const framework of part.data) {
      expect(framework.speakingParts).toContain(3);
    }
  });

  it('searches free text across names and stages', async () => {
    const response = await server.json<ResponseFramework[]>('/v1/frameworks?q=rebuttal');
    expect(response.data).toHaveLength(1);
    expect(response.data[0]!.id).toBe('w2-concession-rebuttal');
  });

  it('combines filters conjunctively', async () => {
    const response = await server.json<ResponseFramework[]>('/v1/frameworks?skill=speaking&part=2');
    expect(response.data).toHaveLength(2);
  });

  it('rejects unknown facet values', async () => {
    expect((await server.json('/v1/frameworks?section=nope')).status).toBe(400);
    expect((await server.json('/v1/frameworks?skill=nope')).status).toBe(400);
    expect((await server.json('/v1/frameworks?type=nope')).status).toBe(400);
    expect((await server.json('/v1/frameworks?part=9')).status).toBe(400);
  });
});

describe('GET /v1/frameworks/:id', () => {
  it('returns one framework with its stages', async () => {
    const response = await server.json<ResponseFramework>('/v1/frameworks/w2-discussion-verdict');
    expect(response.status).toBe(200);
    expect(response.data.name).toContain('Discussion');
    expect(response.data.stages.length).toBeGreaterThanOrEqual(4);
    for (const stage of response.data.stages) {
      expect(stage.moves.length).toBeGreaterThan(0);
      expect(stage.language.length).toBeGreaterThan(0);
    }
  });

  it('404s with the allowed identifiers for an unknown id', async () => {
    const response = await server.json('/v1/frameworks/w9-nope');
    expect(response.status).toBe(404);
    expect(response.meta.error).toBeDefined();
  });
});
