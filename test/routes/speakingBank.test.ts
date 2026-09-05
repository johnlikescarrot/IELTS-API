import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { SpeakingBankCard, SpeakingCard, SpeakingPart1Topic } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/speaking/bank', () => {
  it('returns the season overview with statistics', async () => {
    const response = await server.json<{ season: Record<string, string>; part1Topics: SpeakingPart1Topic[] }>(
      '/v1/speaking/bank',
    );
    expect(response.status).toBe(200);
    expect(response.data.season.start).toBe('2025-09-01');
    expect(response.data.part1Topics).toHaveLength(18);
    expect(response.meta.total).toBe(18);
    const stats = response.meta.stats as { deckCards: number; titleMatches: number };
    expect(stats).toMatchObject({ deckCards: 76, titleMatches: 10 });
    const source = response.meta.source as { repository: string };
    expect(source.repository).toBe('https://github.com/Oxidaner/ielts');
  });

  it('searches the Part 1 topic sets', async () => {
    const hits = await server.json<{ part1Topics: SpeakingPart1Topic[] }>('/v1/speaking/bank?q=phone');
    expect(hits.data.part1Topics.map((topic) => topic.name)).toContain('Phone');
    expect(hits.meta.total).toBe(1);

    const nothing = await server.json<{ part1Topics: SpeakingPart1Topic[] }>(
      '/v1/speaking/bank?q=xyzzy-nothing',
    );
    expect(nothing.data.part1Topics).toHaveLength(0);
  });
});

describe('GET /v1/speaking/bank/cue-cards', () => {
  it('lists the classified deck', async () => {
    const response = await server.json<SpeakingCard[]>('/v1/speaking/bank/cue-cards?limit=10');
    expect(response.status).toBe(200);
    expect(response.meta.total).toBe(76);
    expect(response.meta.season).toContain('September-December 2025');
    expect(response.meta.categories).toEqual(['person', 'object', 'event', 'place']);
    expect(response.meta.statuses).toEqual(['new', 'retained']);
  });

  it('filters by category and rotation status', async () => {
    const freshPeople = await server.json<SpeakingCard[]>(
      '/v1/speaking/bank/cue-cards?category=person&status=new',
    );
    expect(freshPeople.meta.category).toBe('person');
    expect(freshPeople.meta.status).toBe('new');
    expect(freshPeople.data.every((card) => card.category === 'person' && card.status === 'new')).toBe(true);

    const retained = await server.json<SpeakingCard[]>('/v1/speaking/bank/cue-cards?status=retained');
    expect(retained.meta.total).toBe(49);

    // exactly one newly introduced place card exists in the deck
    const freshPlaces = await server.json<SpeakingCard[]>(
      '/v1/speaking/bank/cue-cards?category=place&status=new',
    );
    expect(freshPlaces.meta.total).toBe(1);
  });

  it('searches titles and prompt lines', async () => {
    const english = await server.json<SpeakingCard[]>('/v1/speaking/bank/cue-cards?q=creative person');
    expect(english.data.map((card) => card.id)).toContain('sb-001');
    const chinese = await server.json<SpeakingCard[]>(
      `/v1/speaking/bank/cue-cards?q=${encodeURIComponent('钦佩')}`,
    );
    expect(chinese.meta.total).toBeGreaterThan(0);
    const nothing = await server.json<SpeakingCard[]>('/v1/speaking/bank/cue-cards?q=xyzzy');
    expect(nothing.data).toHaveLength(0);
  });

  it('sorts by prompt line and id in both directions', async () => {
    const byPrompt = await server.json<SpeakingCard[]>('/v1/speaking/bank/cue-cards?sort=prompt&limit=3');
    const prompts = byPrompt.data.map((card) => card.promptLine.toLowerCase());
    expect(prompts).toEqual([...prompts].sort());

    const descending = await server.json<SpeakingCard[]>(
      '/v1/speaking/bank/cue-cards?order=desc&limit=2&offset=74',
    );
    expect(descending.data.map((card) => card.id)).toEqual(['sb-002', 'sb-001']);
    expect(descending.meta.hasMore).toBe(false);
  });

  it('rejects unknown enums and malformed pagination', async () => {
    expect((await server.json('/v1/speaking/bank/cue-cards?category=animal')).status).toBe(400);
    expect((await server.json('/v1/speaking/bank/cue-cards?status=gone')).status).toBe(400);
    expect((await server.json('/v1/speaking/bank/cue-cards?sort=title')).status).toBe(400);
    expect((await server.json('/v1/speaking/bank/cue-cards?limit=abc')).status).toBe(400);
    expect((await server.json('/v1/speaking/bank/cue-cards?offset=2&offset=3')).status).toBe(400);
  });
});

describe('GET /v1/speaking/bank/cue-cards/:id', () => {
  it('returns one card with its classification', async () => {
    const response = await server.json<SpeakingCard>('/v1/speaking/bank/cue-cards/sb-001');
    expect(response.status).toBe(200);
    expect(response.data.titleZh).toBe('钦佩的有创造力的人');
    expect(response.meta.season).toContain('September-December 2025');
  });

  it('cross-references the crowd bank when titles match', async () => {
    // sb-006 appears in both the deck and the bank: the relation carries the bank id
    const matched = await server.json<{ titleZh: string; related: { id: string; followUps: number } | null }>(
      '/v1/speaking/bank/cue-cards/sb-006',
    );
    expect(matched.data.related).not.toBeNull();
    expect(matched.data.related?.id).toMatch(/^p2-/);
    const meta = matched.meta as unknown as { related: string };
    expect(meta.related).toBe(matched.data.related?.id);

    // sb-001's deck title has no bank counterpart -> related stays null
    const unmatched = await server.json<{ related: null }>('/v1/speaking/bank/cue-cards/sb-001');
    expect(unmatched.data.related).toBeNull();
    expect((unmatched.meta as unknown as { related: null }).related).toBeNull();
  });

  it('404s for unknown cards', async () => {
    const response = await server.json('/v1/speaking/bank/cue-cards/sb-999');
    expect(response.status).toBe(404);
  });
});

describe('GET /v1/speaking/bank/part3', () => {
  it('lists the bank index with follow-up counts', async () => {
    const response = await server.json<SpeakingBankCard[]>('/v1/speaking/bank/part3');
    expect(response.status).toBe(200);
    expect(response.meta.total).toBe(22);
    expect(response.meta.followUpTotal).toBe(111);
    expect(response.data.every((card) => card.id.startsWith('p2-'))).toBe(true);
  });

  it('searches the bank index', async () => {
    const hits = await server.json<SpeakingBankCard[]>('/v1/speaking/bank/part3?q=journey');
    expect(hits.data.map((card) => card.titleEn)).toContain('A long journey you want to take again');
    const nothing = await server.json<SpeakingBankCard[]>('/v1/speaking/bank/part3?q=xyzzy');
    expect(nothing.data).toHaveLength(0);
  });
});
