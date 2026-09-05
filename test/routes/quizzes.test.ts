import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { VocabularyQuiz } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/quizzes/vocabulary', () => {
  it('generates well-formed four-option items', async () => {
    const response = await server.json<VocabularyQuiz>('/v1/quizzes/vocabulary?count=8&seed=arena-smoke');
    expect(response.status).toBe(200);
    expect(response.data.items).toHaveLength(8);
    expect(response.data.seed).toBe('arena-smoke');
    expect(response.data.direction).toBe('word-to-meaning');
    for (const item of response.data.items) {
      expect(item.options).toHaveLength(4);
      expect(new Set(item.options).size).toBe(4);
      expect(item.options[item.answerIndex]).toBeDefined();
      expect(item.prompt).toContain(item.word);
    }
    expect(response.meta.candidates as number).toBeGreaterThan(4000);
    expect(response.meta.reproducibility).toContain('same seed');
  });

  it('is reproducible across requests with the same seed', async () => {
    const first = await server.json<VocabularyQuiz>('/v1/quizzes/vocabulary?count=5&seed=twice');
    const second = await server.json<VocabularyQuiz>('/v1/quizzes/vocabulary?count=5&seed=twice');
    expect(second.data).toEqual(first.data);
    const other = await server.json<VocabularyQuiz>('/v1/quizzes/vocabulary?count=5&seed=thrice');
    expect(other.data.items.map((item) => item.wordId)).not.toEqual(
      first.data.items.map((item) => item.wordId),
    );
  });

  it('supports the reverse direction', async () => {
    const response = await server.json<VocabularyQuiz>(
      '/v1/quizzes/vocabulary?count=3&seed=flip&direction=meaning-to-word',
    );
    expect(response.data.direction).toBe('meaning-to-word');
    for (const item of response.data.items) {
      expect(item.prompt).toContain('Which word matches');
    }
  });

  it('restricts the pool by part of speech', async () => {
    const response = await server.json<VocabularyQuiz>('/v1/quizzes/vocabulary?count=4&seed=pos&pos=adverb');
    expect(response.status).toBe(200);
    expect(response.meta.candidates as number).toBeLessThan(400);
  });

  it('rejects filters that leave too few candidates', async () => {
    const response = await server.json('/v1/quizzes/vocabulary?count=25&seed=thin&pos=pronoun');
    expect(response.status).toBe(400);
  });

  it('validates parameters', async () => {
    expect((await server.json('/v1/quizzes/vocabulary?direction=speed')).status).toBe(400);
    expect((await server.json('/v1/quizzes/vocabulary?pos=astronomy')).status).toBe(400);
    expect((await server.json('/v1/quizzes/vocabulary?count=99')).status).toBe(400);
    expect((await server.json('/v1/quizzes/vocabulary?count=0')).status).toBe(400);
  });
});
