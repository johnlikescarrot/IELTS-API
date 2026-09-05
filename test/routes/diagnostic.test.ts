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

interface QuizQuestion {
  index: number;
  entryId: string;
  format: string;
  prompt: string;
  hint: string | null;
  choices: string[] | null;
}

interface Quiz {
  seed: string;
  count: number;
  formats: string[];
  questions: QuizQuestion[];
}

interface Report {
  seed: string;
  total: number;
  score: number;
  accuracy: number;
  wilson95: { lower: number; upper: number };
  rating: string;
  perFormat: { format: string; correct: number; total: number; accuracy: number }[];
  items: { index: number; entryId: string; correct: boolean; expected: string; received: string }[];
  advice: string[];
  recommendation: { wordsPerDay: number; message: string };
}

describe('GET /v1/diagnostic/quiz', () => {
  it('builds a twelve-question quiz by default', async () => {
    const response = await server.json<Quiz>('/v1/diagnostic/quiz');
    expect(response.status).toBe(200);
    expect(response.data.seed).toBe('ielts-diagnostic');
    expect(response.data.count).toBe(12);
    expect(response.data.questions).toHaveLength(12);
    expect(response.data.formats).toEqual(['meaning-choice', 'word-choice', 'spelling']);
  });

  it('never leaks the answers', async () => {
    const response = await server.json<Quiz>('/v1/diagnostic/quiz?seed=leak&count=8');
    for (const question of response.data.questions) {
      expect(Object.keys(question).sort()).toEqual(
        ['choices', 'entryId', 'format', 'hint', 'index', 'prompt'].sort(),
      );
    }
    expect(JSON.stringify(response.data)).not.toContain('expected');
  });

  it('is deterministic for identical parameters', async () => {
    const first = await server.json<Quiz>('/v1/diagnostic/quiz?seed=stable&count=8&formats=spelling');
    const second = await server.json<Quiz>('/v1/diagnostic/quiz?seed=stable&count=8&formats=spelling');
    expect(second.data).toEqual(first.data);
    expect(first.data.questions.every((question) => question.format === 'spelling')).toBe(true);
  });

  it('rejects out-of-range counts and unknown formats', async () => {
    expect((await server.json('/v1/diagnostic/quiz?count=3')).status).toBe(400);
    expect((await server.json('/v1/diagnostic/quiz?count=41')).status).toBe(400);
    expect((await server.json('/v1/diagnostic/quiz?count=many')).status).toBe(400);
    expect((await server.json('/v1/diagnostic/quiz?formats=nope')).status).toBe(400);
  });
});

describe('GET /v1/diagnostic/evaluate', () => {
  it('grades answers against the seeded quiz', async () => {
    const quiz = await server.json<Quiz>('/v1/diagnostic/quiz?seed=grade-me&count=8');
    const answers = quiz.data.questions
      .map((question) => (question.format === 'spelling' ? 'somesuchword' : 'A'))
      .join(',');
    const response = await server.json<Report>(
      `/v1/diagnostic/evaluate?seed=grade-me&count=8&answers=${answers}`,
    );
    expect(response.status).toBe(200);
    expect(response.data.total).toBe(8);
    expect(response.data.items).toHaveLength(8);
    expect(response.data.items.map((item) => item.entryId)).toEqual(
      quiz.data.questions.map((question) => question.entryId),
    );
    expect(response.data.score).toBeLessThanOrEqual(8);
    expect(['excellent', 'good', 'weak']).toContain(response.data.rating);
    expect(response.data.wilson95.lower).toBeLessThanOrEqual(response.data.accuracy);
    expect(response.data.accuracy).toBeLessThanOrEqual(response.data.wilson95.upper);
    expect(response.meta.thresholds).toEqual({ pass: 0.8, excellent: 0.9 });
  });

  it('defaults the seed, count and formats', async () => {
    const answers = Array.from({ length: 12 }, () => 'A').join(',');
    const response = await server.json<Report>(`/v1/diagnostic/evaluate?answers=${answers}`);
    expect(response.status).toBe(200);
    expect(response.data.seed).toBe('ielts-diagnostic');
    expect(response.data.total).toBe(12);
  });

  it('requires answers of the quiz length', async () => {
    const missing = await server.json('/v1/diagnostic/evaluate?seed=x&count=8');
    expect(missing.status).toBe(400);
    const short = await server.json('/v1/diagnostic/evaluate?seed=x&count=8&answers=A,B');
    expect(short.status).toBe(400);
  });

  it('rejects out-of-range counts and unknown formats', async () => {
    const answers = Array.from({ length: 8 }, () => 'A').join(',');
    expect(
      (await server.json(`/v1/diagnostic/evaluate?seed=x&count=3&answers=${answers}`)).status,
    ).toBe(400);
    expect(
      (await server.json(`/v1/diagnostic/evaluate?seed=x&count=8&formats=nope&answers=${answers}`))
        .status,
    ).toBe(400);
  });
});
