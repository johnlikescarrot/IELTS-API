import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { SkillFormat } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/skills', () => {
  it('lists all four skill formats', async () => {
    const response = await server.json<SkillFormat[]>('/v1/skills');
    expect(response.status).toBe(200);
    expect(response.data.map((skill) => skill.id)).toEqual(['listening', 'reading', 'writing', 'speaking']);
    expect(response.meta.count).toBe(4);
    expect(response.meta.skills).toEqual(['listening', 'reading', 'writing', 'speaking']);
  });
});

describe('GET /v1/skills/:skillId', () => {
  it('returns one skill with parts', async () => {
    const response = await server.json<SkillFormat>('/v1/skills/listening');
    expect(response.status).toBe(200);
    expect(response.data.parts).toHaveLength(4);
    expect(response.data.questionCount).toBe(40);
    expect(response.meta.skill).toBe('listening');
  });

  it('404s on unknown skills', async () => {
    const response = await server.json('/v1/skills/grammar');
    expect(response.status).toBe(404);
    expect(response.meta.error).toBeDefined();
    const error = response.meta.error as { details: Record<string, string> };
    expect(error.details.allowed).toContain('listening');
  });
});
