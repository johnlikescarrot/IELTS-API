import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createVocabularyDeck } from '../../src/lib/deck.js';
import { startTestServer } from '../helpers/server.js';
import type { VocabularyDeck } from '../../src/types.js';
import type { TestServer } from '../helpers/server.js';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.close();
});

const base = '/v1/vocabulary/deck?seed=cohort-a&on=2026-09-07';

describe('GET /v1/vocabulary/deck', () => {
  it('registers before the headword lookup and exactly matches the library computation', async () => {
    const response = await server.json<VocabularyDeck>(base);
    expect(response.status).toBe(200);
    expect(response.data).toEqual(createVocabularyDeck({ seed: 'cohort-a', on: '2026-09-07' }));
    expect(response.meta).toMatchObject({
      algorithm: 'sm2-v1',
      storage: 'client-owned',
      volume: null,
      pos: null,
    });
  });

  it('supports multi-select volumes, parts of speech and independent pages', async () => {
    const response = await server.json<VocabularyDeck>(`${base}&volume=1,2&pos=noun,verb&limit=5&offset=5`);
    expect(response.status).toBe(200);
    expect(response.meta).toMatchObject({ volume: [1, 2], pos: ['noun', 'verb'] });
    expect(response.data).toEqual(
      createVocabularyDeck({
        seed: 'cohort-a',
        on: '2026-09-07',
        volumes: [1, 2],
        partsOfSpeech: ['noun', 'verb'],
        limit: 5,
        offset: 5,
      }),
    );
  });

  it('keeps public GET caching and HEAD behaviour', async () => {
    const first = await server.request(base);
    expect(first.headers.get('cache-control')).toBe('public, max-age=300');
    const cached = await server.request(base, { headers: { 'if-none-match': first.headers.get('etag')! } });
    expect(cached.status).toBe(304);
    const head = await server.request(base, { method: 'HEAD' });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe('');
    expect(head.headers.get('etag')).toBe(first.headers.get('etag'));
  });

  it.each([
    '/v1/vocabulary/deck',
    '/v1/vocabulary/deck?seed=s',
    '/v1/vocabulary/deck?on=2026-09-07',
    `${base}&seed=other`,
    `${base}&on=2026-09-08`,
    `${base}&volume=23`,
    `${base}&pos=unknown`,
    `${base}&limit=51`,
    `${base}&offset=-1`,
    `${base}&volume=1&volume=2`,
    '/v1/vocabulary/deck?seed=s&on=2026-02-30',
    `/v1/vocabulary/deck?seed=${'x'.repeat(129)}&on=2026-09-07`,
  ])('returns 400 for missing, repeated or invalid inputs: %s', async (url) => {
    expect((await server.request(url)).status).toBe(400);
  });

  it('passes a deck card directly through queue → review → next-day queue', async () => {
    const deck = await server.json<VocabularyDeck>(`${base}&limit=1`);
    const card = deck.data.cards[0]!.state;
    const post = (input: unknown): RequestInit => ({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
    const due = await server.json<{ items: { card: typeof card }[] }>(
      '/v1/study/review/queue',
      post({ cards: [card], on: '2026-09-07' }),
    );
    expect(due.data.items[0]?.card).toEqual(card);
    const review = await server.json<{ card: typeof card }>(
      '/v1/study/review',
      post({ card, grade: 4, on: '2026-09-07' }),
    );
    const today = await server.json<{ items: unknown[] }>(
      '/v1/study/review/queue',
      post({ cards: [review.data.card], on: '2026-09-07' }),
    );
    expect(today.data.items).toEqual([]);
    const tomorrow = await server.json<{ items: { status: string }[] }>(
      '/v1/study/review/queue',
      post({ cards: [review.data.card], on: '2026-09-08' }),
    );
    expect(tomorrow.data.items[0]?.status).toBe('due');
  });
});
