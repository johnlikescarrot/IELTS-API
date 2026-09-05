import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { WRITING_EXERCISES } from '../../src/data/writingExercises.js';
import { startTestServer } from '../helpers/server.js';

import type { WritingExerciseView } from '../../src/data/writingExercises.js';
import type { TestServer } from '../helpers/server.js';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.close();
});

const base = '/v1/practice/writing';

describe('original writing practice routes', () => {
  it('lists answer-free stimuli without authentication and with provenance', async () => {
    const response = await server.json<WritingExerciseView[]>(base);
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(7);
    expect(response.meta).toMatchObject({
      total: 7,
      revision: '1',
      query: null,
      hasMore: false,
      license: 'CC BY 4.0',
    });
    expect(response.meta.note).toMatch(/never|not writing quality/);
    expect(response.meta.sourceReview).toContain('MSNELOY.md');
    for (const exercise of response.data) {
      for (const question of exercise.checks) {
        expect(Object.keys(question)).toEqual(['id', 'question', 'options']);
      }
      expect(exercise.figureUrl.startsWith(`${base}/`)).toBe(true);
    }
  });

  it('filters conjunctively, pages and returns an empty page past the end', async () => {
    const response = await server.json<WritingExerciseView[]>(`${base}?kind=map&q=Meadow&limit=1&offset=0`);
    expect(response.data.map((x) => x.id)).toEqual(['w1-meadow-square']);
    expect(response.meta).toMatchObject({ total: 1, query: 'Meadow', limit: 1, offset: 0 });
    expect((await server.json(`${base}?kind=map&q=refill`)).data).toEqual([]);
    expect((await server.json(`${base}?offset=1000`)).data).toEqual([]);
    expect((await server.json(`${base}?limit=2`)).meta.hasMore).toBe(true);
  });

  it('returns a single exercise and never labels it as an official exam', async () => {
    const response = await server.json<WritingExerciseView>(`${base}/W1-LIBRARY-VISITS`);
    expect(response.status).toBe(200);
    expect(response.data.id).toBe('w1-library-visits');
    expect(response.data.minimumWords).toBe(150);
    expect(response.data.suggestedMinutes).toBe(20);
    expect(response.meta.note).toContain('not official IELTS material');
  });

  it.each(WRITING_EXERCISES)(
    'serves the $kind figure as SVG with public CORS, ETag and HEAD support',
    async (exercise) => {
      const path = `${base}/${exercise.id}/figure`;
      const response = await server.request(path);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('image/svg+xml; charset=utf-8');
      expect(response.headers.get('access-control-allow-origin')).toBe('*');
      const svg = await response.text();
      expect(svg).toContain('<svg');
      expect(svg).toContain(exercise.stimulus.title);
      const etag = response.headers.get('etag')!;
      const conditional = await server.request(path, { headers: { 'if-none-match': etag } });
      expect(conditional.status).toBe(304);
      expect(await conditional.text()).toBe('');
      const head = await server.request(path, { method: 'HEAD' });
      expect(head.status).toBe(200);
      expect(await head.text()).toBe('');
    },
  );

  it('checks all 21 questions, both correct and incorrect, with reproducible explanations', async () => {
    for (const exercise of WRITING_EXERCISES) {
      for (const question of exercise.checks) {
        for (const option of question.options) {
          const path = `${base}/${exercise.id}/check?question=${question.id}&answer=${option.id}`;
          const response = await server.json<{ correct: boolean; correctOption: string }>(path);
          expect(response.status).toBe(200);
          expect(response.data).toEqual({
            exerciseId: exercise.id,
            revision: '1',
            questionId: question.id,
            answer: option.id,
            correct: option.id === question.correctOption,
            correctOption: question.correctOption,
            explanation: question.explanation,
            evidence: question.evidence,
          });
          expect(response.data).not.toHaveProperty('band');
          expect(response.meta.note).toContain('No learner text is collected');
        }
      }
    }
    const path = `${base}/w1-arts-income/check?question=q1&answer=a`;
    expect(await (await server.request(path)).text()).toBe(await (await server.request(path)).text());
  });

  it('accepts case-normalised question and option identifiers', async () => {
    const response = await server.json<{ correct: boolean }>(
      `${base}/w1-arts-income/check?question=%20Q1%20&answer=%20A%20`,
    );
    expect(response.data.correct).toBe(true);
  });

  it.each([
    '?kind=unknown',
    '?limit=0',
    '?limit=101',
    '?limit=1.5',
    '?offset=-1',
    '?offset=1001',
    '?kind=map&kind=table',
    '?q=a&q=b',
    '?limit=1&limit=2',
    '?offset=0&offset=1',
  ])('rejects invalid or repeated list parameters %s', async (query) => {
    expect((await server.request(base + query)).status).toBe(400);
  });

  it.each([
    '',
    '?question=q1',
    '?answer=a',
    '?question=%20&answer=a',
    '?question=q9&answer=a',
    '?question=q1&answer=wrong',
    '?question=q1&answer=a&answer=b',
    '?question=q1&question=q2&answer=a',
  ])('rejects missing, unknown or duplicate check parameters %s', async (query) => {
    const response = await server.request(`${base}/w1-arts-income/check${query}`);
    expect(response.status).toBe(400);
    const body = (await response.json()) as { meta: { error: { code: string } } };
    expect(body.meta.error.code).toBe('bad_request');
  });

  it.each(['', '/figure', '/check?question=q1&answer=a'])(
    'returns 404 for an unknown exercise on %s',
    async (suffix) => {
      expect((await server.request(`${base}/unknown${suffix}`)).status).toBe(404);
    },
  );
});
