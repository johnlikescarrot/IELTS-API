import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { QUESTION_TYPES } from '../../src/data/questions.js';
import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { QuestionType } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/questions', () => {
  it('returns the whole taxonomy by default', async () => {
    const response = await server.json<QuestionType[]>('/v1/questions');
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(QUESTION_TYPES.length);
    expect(response.meta.counts).toEqual({ listening: 6, reading: 11 });
    expect(response.meta.skills).toEqual(['listening', 'reading']);
  });

  it('filters by skill', async () => {
    const response = await server.json<QuestionType[]>('/v1/questions?skill=listening');
    expect(response.data).toHaveLength(6);
    expect(response.data.every((type) => type.skill === 'listening')).toBe(true);
    expect(response.meta.skill).toBe('listening');
  });

  it('filters by whether the answers follow the order of the text', async () => {
    const unordered = await server.json<QuestionType[]>('/v1/questions?ordered=false');
    expect(unordered.data.length).toBeGreaterThan(0);
    expect(unordered.data.every((type) => !type.ordered)).toBe(true);

    const ordered = await server.json<QuestionType[]>('/v1/questions?ordered=true');
    expect(ordered.data.every((type) => type.ordered)).toBe(true);
    expect(ordered.data.length + unordered.data.length).toBe(QUESTION_TYPES.length);
  });

  it('searches names, descriptions, strategies and pitfalls', async () => {
    const response = await server.json<QuestionType[]>('/v1/questions?q=heading');
    expect(response.data.length).toBeGreaterThan(0);
    expect(response.data.some((type) => type.id === 'reading-matching-headings')).toBe(true);
  });

  it('returns an empty page when nothing matches', async () => {
    const response = await server.json<QuestionType[]>('/v1/questions?q=quantumchromodynamics');
    expect(response.data).toHaveLength(0);
    expect(response.meta.total).toBe(0);
  });

  it('paginates', async () => {
    const response = await server.json<QuestionType[]>('/v1/questions?limit=3&offset=2');
    expect(response.data).toHaveLength(3);
    expect(response.meta.hasMore).toBe(true);
    expect(response.meta.offset).toBe(2);
  });

  it('combines filters', async () => {
    const response = await server.json<QuestionType[]>('/v1/questions?skill=reading&q=matching');
    expect(response.data.length).toBeGreaterThan(2);
    expect(response.data.every((type) => type.skill === 'reading')).toBe(true);
  });

  it('rejects an unknown skill', async () => {
    expect((await server.json('/v1/questions?skill=writing')).status).toBe(400);
  });
});

describe('GET /v1/questions/:id', () => {
  it('returns one type with its siblings', async () => {
    const response = await server.json<QuestionType & { related: string[] }>(
      '/v1/questions/reading-matching-headings',
    );
    expect(response.status).toBe(200);
    expect(response.data.name).toBe('Matching headings');
    expect(response.data.related).toHaveLength(10);
    expect(response.data.related).not.toContain('reading-matching-headings');
    expect(response.meta.skill).toBe('reading');
  });

  it('is case-insensitive', async () => {
    const response = await server.json<QuestionType>('/v1/questions/LISTENING-MATCHING');
    expect(response.data.id).toBe('listening-matching');
  });

  it('404s on an unknown identifier', async () => {
    const response = await server.json('/v1/questions/reading-telepathy');
    expect(response.status).toBe(404);
    expect((response.meta.error as { message: string }).message).toContain('reading-telepathy');
  });
});
