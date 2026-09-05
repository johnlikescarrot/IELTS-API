import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { QuizItem } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/quiz', () => {
  it('serves a deterministic default quiz', async () => {
    const response = await server.json<QuizItem[]>('/v1/quiz?seed=study-2026');
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(10);
    expect(response.meta.mode).toBe('word-to-definition');
    expect(response.meta.seed).toBe('study-2026');
    expect(response.meta.dataset).toBe('cambridge-ielts-1-22-vocabulary');
    const replay = await server.json<QuizItem[]>('/v1/quiz?seed=study-2026');
    expect(replay.data).toEqual(response.data);
  });

  it('defaults to a shared fixed seed when none is given', async () => {
    const response = await server.json<QuizItem[]>('/v1/quiz');
    expect(response.meta.seed).toBe('ielts-api-default');
    expect(response.data.length).toBe(10);
  });

  it('withholds the answer key when asked', async () => {
    const keyed = await server.json<QuizItem[]>('/v1/quiz?seed=keys&count=4');
    const hidden = await server.json<QuizItem[]>('/v1/quiz?seed=keys&count=4&answers=omit');
    expect(keyed.status).toBe(200);
    expect(hidden.status).toBe(200);
    expect(keyed.data.every((item) => item.answer !== null && item.answerIndex !== null)).toBe(true);
    for (const item of hidden.data) {
      expect(item.answer).toBeNull();
      expect(item.answerIndex).toBeNull();
      expect(item.explanation).toBeNull();
      expect(item.options).toHaveLength(4);
    }
    expect(hidden.meta.answers).toBe('omit');
  });

  it('supports all three modes over the wire', async () => {
    const words = await server.json<QuizItem[]>('/v1/quiz?seed=m1&mode=word-to-definition');
    expect(words.data[0]?.prompt).toContain('Which definition matches');
    const defs = await server.json<QuizItem[]>('/v1/quiz?seed=m2&mode=definition-to-word');
    expect(defs.data[0]?.options.length).toBe(4);
    const spelling = await server.json<QuizItem[]>('/v1/quiz?seed=m3&mode=spelling&count=3');
    expect(spelling.data).toHaveLength(3);
    expect(spelling.data.every((item) => item.options.length === 0)).toBe(true);
    expect(spelling.data.every((item) => item.answer !== null)).toBe(true);
  });

  it('filters by volume and part of speech, clamping to the pool size', async () => {
    const volume = await server.json<QuizItem[]>('/v1/quiz?seed=v1&volume=1&count=25');
    expect(volume.status).toBe(200);
    expect(volume.data.length).toBeGreaterThan(0);
    expect(volume.data.length).toBeLessThanOrEqual(25);
    expect(volume.meta.volume).toEqual([1]);

    const combined = await server.json<QuizItem[]>('/v1/quiz?seed=v2&volume=1&pos=pronoun&count=5');
    expect(combined.data).toEqual([]);
    expect(combined.meta.count).toBe(0);
  });

  it('rejects invalid parameters', async () => {
    expect((await server.json('/v1/quiz?count=0')).status).toBe(400);
    expect((await server.json('/v1/quiz?count=26')).status).toBe(400);
    expect((await server.json('/v1/quiz?mode=charades')).status).toBe(400);
    expect((await server.json('/v1/quiz?answers=maybe')).status).toBe(400);
    expect((await server.json('/v1/quiz?volume=23')).status).toBe(400);
    expect((await server.json('/v1/quiz?volume=laptop')).status).toBe(400);
    expect((await server.json('/v1/quiz?pos=colour')).status).toBe(400);
  });
});
