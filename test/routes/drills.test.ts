import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { ClozeItem, MatchingSet } from '../../src/types.js';

const TOKEN = /[a-zA-Z][a-zA-Z'’-]*/g;

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/drills/cloze', () => {
  it('generates valid, seeded multiple-choice items', async () => {
    const response = await server.json<ClozeItem[]>('/v1/drills/cloze?seed=research-2026&count=3&options=4');
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(3);
    expect(response.meta.seed).toBe('research-2026');
    expect(response.meta.generated).toBe(3);
    expect(response.meta.pool).toBe(1711);
    for (const item of response.data) {
      expect(item.text).toContain('_____');
      expect(item.options[item.answerIndex]).toBe(item.answer);
      const tokens = new Set((item.text.match(TOKEN) ?? []).map((token) => token.toLowerCase()));
      for (const option of item.options) {
        if (option.toLowerCase() !== item.answer.toLowerCase()) {
          expect(tokens.has(option.toLowerCase())).toBe(false);
        }
      }
    }
  });

  it('returns the identical item set for the same seed', async () => {
    const first = await server.json('/v1/drills/cloze?seed=stable&count=2');
    const second = await server.json('/v1/drills/cloze?seed=stable&count=2');
    expect(first.data).toEqual(second.data);
    const third = await server.json('/v1/drills/cloze?seed=moved&count=2');
    expect(third.data).not.toEqual(first.data);
  });

  it('filters by part of speech and volume', async () => {
    const verbs = await server.json<ClozeItem[]>('/v1/drills/cloze?seed=v&count=4&pos=verb&options=5');
    expect(verbs.data).toHaveLength(4);
    for (const item of verbs.data) {
      expect(item.partOfSpeech).toBe('verb');
      expect(item.options).toHaveLength(5);
    }
    const volume11 = await server.json<ClozeItem[]>('/v1/drills/cloze?seed=v&count=2&volume=11');
    for (const item of volume11.data) {
      expect(item.volumes).toContain(11);
    }
    expect(volume11.meta.volume).toEqual([11]);
    expect(volume11.meta.partOfSpeech).toBeNull();
  });

  it('defaults the seed to the current date', async () => {
    const response = await server.json<ClozeItem[]>('/v1/drills/cloze?count=1');
    expect(response.status).toBe(200);
    expect(response.meta.seed).toBe(`cloze:${new Date().toISOString().slice(0, 10)}`);
  });

  it('rejects invalid parameters', async () => {
    expect((await server.json('/v1/drills/cloze?count=0')).status).toBe(400);
    expect((await server.json('/v1/drills/cloze?count=21')).status).toBe(400);
    expect((await server.json('/v1/drills/cloze?options=1')).status).toBe(400);
    expect((await server.json('/v1/drills/cloze?options=7')).status).toBe(400);
    expect((await server.json('/v1/drills/cloze?pos=article')).status).toBe(400);
    expect((await server.json('/v1/drills/cloze?volume=23')).status).toBe(400);
    expect((await server.json('/v1/drills/cloze?volume=x')).status).toBe(400);
    expect((await server.json('/v1/drills/cloze?volume=7,19')).status).toBe(200);
    expect((await server.json('/v1/drills/cloze?seed=a&seed=b')).status).toBe(400);
  });
});

describe('GET /v1/drills/matching', () => {
  it('generates a matching set whose answer key matches the source glosses', async () => {
    const response = await server.json<MatchingSet>('/v1/drills/matching?seed=pairs&count=4');
    expect(response.status).toBe(200);
    expect(response.data.words).toHaveLength(4);
    expect(response.data.definitions).toHaveLength(4);
    expect(response.meta.pool).toBe(4026);
    expect(new Set(response.data.definitions).size).toBe(4);
    expect(new Set(response.data.answers).size).toBe(4);
    await Promise.all(
      response.data.words.map(async (word, index) => {
        const answerIndex = response.data.answers[index] as number;
        const entry = await server.json<{ definition: string }>(`/v1/vocabulary/${encodeURIComponent(word)}`);
        expect(response.data.definitions[answerIndex]).toBe(entry.data.definition);
      }),
    );
  });

  it('is deterministic per seed', async () => {
    const first = await server.json<MatchingSet>('/v1/drills/matching?seed=again&count=3');
    const second = await server.json<MatchingSet>('/v1/drills/matching?seed=again&count=3');
    expect(first.data).toEqual(second.data);
    const other = await server.json<MatchingSet>('/v1/drills/matching?seed=never&count=3');
    expect(other.data.words).not.toEqual(first.data.words);
  });

  it('rejects out-of-range pair counts', async () => {
    expect((await server.json('/v1/drills/matching?count=1')).status).toBe(400);
    expect((await server.json('/v1/drills/matching?count=11')).status).toBe(400);
  });
});
