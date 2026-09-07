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

const fresh = {
  id: 'w00001',
  algorithm: 'sm2-v1',
  repetitions: 0,
  lapses: 0,
  intervalDays: 0,
  easeFactor: 2.5,
  lastReviewedOn: null,
  dueOn: '2026-09-07',
};
const post = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

describe('stateless review HTTP contract', () => {
  it('publishes the versioned policy and all six recall grades without authentication', async () => {
    const response = await server.json<{ algorithm: string; grades: { grade: number }[]; note: string }>(
      '/v1/study/review/policy',
    );
    expect(response.status).toBe(200);
    expect(response.data.algorithm).toBe('sm2-v1');
    expect(response.data.grades.map((item) => item.grade)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(response.data.note).toContain('not a prediction');
  });

  it('returns a new card state, not a saved session or a claimed mastery score', async () => {
    const response = await server.json<{ card: typeof fresh; repeatToday: boolean }>(
      '/v1/study/review',
      post({ card: fresh, grade: 5, on: '2026-09-07' }),
    );
    expect(response.status).toBe(200);
    expect(response.data.card).toEqual({
      ...fresh,
      repetitions: 1,
      intervalDays: 1,
      easeFactor: 2.6,
      lastReviewedOn: '2026-09-07',
      dueOn: '2026-09-08',
    });
    expect(response.data.repeatToday).toBe(false);
    expect(response.meta.storage).toBe('client-owned');
  });

  it('is replayable and does not contaminate independent learners or cache submitted progress', async () => {
    const input = post({ card: fresh, grade: 2, on: '2026-09-07' });
    const first = await server.request('/v1/study/review', input);
    const body = await first.json();
    await server.request('/v1/study/review', post({ card: fresh, grade: 5, on: '2026-09-07' }));
    const again = await server.request('/v1/study/review', {
      ...input,
      headers: { 'content-type': 'application/json', 'if-none-match': first.headers.get('etag') ?? '' },
    });
    expect(again.status).toBe(200);
    expect(await again.json()).toEqual(body);
    expect(again.headers.get('cache-control')).toBe('no-store');
    expect(again.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    expect(again.headers.get('access-control-allow-origin')).toBe('*');
    expect(again.headers.get('set-cookie')).toBeNull();
  });

  it('selects a bounded new-card queue and reports items left out by the budget', async () => {
    const response = await server.json<{ items: { card: typeof fresh }[]; remaining: number }>(
      '/v1/study/review/queue',
      post({ cards: [fresh, { ...fresh, id: 'w00002' }], on: '2026-09-07', limit: 10, newLimit: 1 }),
    );
    expect(response.status).toBe(200);
    expect(response.data.items.map((item) => item.card.id)).toEqual(['w00001']);
    expect(response.data.remaining).toBe(1);
  });

  it('requires POST only on the two computation endpoints', async () => {
    for (const method of ['GET', 'HEAD', 'PUT', 'DELETE']) {
      const response = await server.request('/v1/study/review', { method });
      expect(response.status).toBe(405);
      expect(response.headers.get('allow')).toBe('POST, OPTIONS');
    }
    expect((await server.request('/v1/vocabulary', post({}))).status).toBe(405);
  });

  it('supports browser JSON preflight without cookies or credentials', async () => {
    const response = await server.request('/v1/study/review', {
      method: 'OPTIONS',
      headers: { origin: 'https://example.org', 'access-control-request-headers': 'content-type' },
    });
    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-methods')).toContain('POST');
    expect(response.headers.get('access-control-allow-headers')).toContain('content-type');
  });

  it.each([
    null,
    [],
    {},
    { card: fresh, on: '2026-09-07' },
    { card: fresh, grade: '5', on: '2026-09-07' },
    { card: fresh, grade: 6, on: '2026-09-07' },
    { card: { ...fresh, algorithm: 'unknown' }, grade: 5, on: '2026-09-07' },
    { card: fresh, grade: 5, on: '2026-02-30' },
    { card: fresh, grade: 5, on: '2026-09-06' },
    { card: fresh, grade: 5, on: '2026-09-07', userId: 'not-needed' },
  ])('rejects malformed review inputs with a private error envelope: %j', async (input) => {
    const response = await server.request('/v1/study/review', post(input));
    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toMatchObject({
      status: 400,
      data: null,
      meta: { error: { code: 'bad_request' } },
    });
  });

  it.each([
    {},
    { cards: {}, on: '2026-09-07' },
    { cards: [fresh, fresh], on: '2026-09-07' },
    { cards: [fresh], on: '2026-09-07', limit: 0 },
    { cards: [fresh], on: '2026-09-07', newLimit: -1 },
  ])('rejects invalid queue inputs: %j', async (input) => {
    expect((await server.request('/v1/study/review/queue', post(input))).status).toBe(400);
  });

  it('handles an empty queue and explicit zero new-card allowance', async () => {
    const empty = await server.json<{ items: unknown[]; remaining: number }>(
      '/v1/study/review/queue',
      post({ cards: [], on: '2026-09-07' }),
    );
    expect(empty.status).toBe(200);
    expect(empty.data.items).toEqual([]);
    expect(empty.data.remaining).toBe(0);
    const disabled = await server.json<{ items: unknown[]; remaining: number }>(
      '/v1/study/review/queue',
      post({ cards: [fresh], on: '2026-09-07', newLimit: 0 }),
    );
    expect(disabled.data.items).toEqual([]);
    expect(disabled.data.remaining).toBe(1);
  });
});
