import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { MoveStructure, RecalledPrompt } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/writing/recall', () => {
  it('lists the recalled prompts with index statistics and provenance', async () => {
    const response = await server.json<RecalledPrompt[]>('/v1/writing/recall?limit=5');
    expect(response.status).toBe(200);
    expect(response.meta.total).toBe(232);
    expect(response.data).toHaveLength(5);
    expect(response.meta.hasMore).toBe(true);
    const stats = response.meta.stats as { prompts: number; rows: number };
    expect(stats).toMatchObject({ prompts: 232, rows: 235 });
    const source = response.meta.source as { repository: string; note: string };
    expect(source.repository).toBe('https://github.com/Oxidaner/ielts');
    expect(source.note).toContain('not an official release');
    expect(response.meta.themes).toContain('教育类');
  });

  it('filters by normalised type, family and theme', async () => {
    const agree = await server.json<RecalledPrompt[]>('/v1/writing/recall?type=agree-disagree&limit=100');
    expect(agree.meta.type).toBe('agree-disagree');
    expect(agree.data.every((prompt) => prompt.type === 'agree-disagree')).toBe(true);

    const discussion = await server.json<RecalledPrompt[]>('/v1/writing/recall?family=discussion');
    expect(discussion.meta.family).toBe('discussion');
    expect(discussion.data.every((prompt) => prompt.family === 'discussion')).toBe(true);

    const theme = await server.json<RecalledPrompt[]>(
      `/v1/writing/recall?theme=${encodeURIComponent('环境类')}`,
    );
    expect(theme.data.every((prompt) => prompt.themeGroup === 'environment')).toBe(true);

    const miss = await server.json<RecalledPrompt[]>(`/v1/writing/recall?type=two-part&family=discussion`);
    expect(miss.data).toHaveLength(0);
    expect(miss.meta.total).toBe(0);
  });

  it('searches the prompt text', async () => {
    const hits = await server.json<RecalledPrompt[]>('/v1/writing/recall?q=advertisement');
    expect(hits.data.length).toBeGreaterThan(0);
    const nothing = await server.json<RecalledPrompt[]>('/v1/writing/recall?q=xyzzy-nothing');
    expect(nothing.data).toHaveLength(0);
  });

  it('sorts by difficulty and recurrence, descending and ascending', async () => {
    const hardest = await server.json<RecalledPrompt[]>(
      '/v1/writing/recall?sort=difficulty&order=desc&limit=4',
    );
    expect(hardest.data.every((prompt) => prompt.difficulty === 3)).toBe(true);

    const easiest = await server.json<RecalledPrompt[]>(
      '/v1/writing/recall?sort=difficulty&order=asc&limit=4',
    );
    expect(easiest.data.every((prompt) => prompt.difficulty === 1)).toBe(true);

    const recurring = await server.json<RecalledPrompt[]>(
      '/v1/writing/recall?sort=occurrences&order=desc&limit=1',
    );
    expect(recurring.data[0]?.occurrences).toBeGreaterThanOrEqual(2);
  });

  it('paginates to the end', async () => {
    const tail = await server.json<RecalledPrompt[]>('/v1/writing/recall?limit=2&offset=230');
    expect(tail.data.map((prompt) => prompt.id)).toEqual(['wr-231', 'wr-232']);
    expect(tail.meta.hasMore).toBe(false);
  });

  it('rejects unknown enums and malformed pagination', async () => {
    expect((await server.json('/v1/writing/recall?type=agree')).status).toBe(400);
    expect((await server.json('/v1/writing/recall?family=problem-solution')).status).toBe(400);
    expect((await server.json('/v1/writing/recall?theme=education')).status).toBe(400);
    expect((await server.json('/v1/writing/recall?sort=prompts')).status).toBe(400);
    expect((await server.json('/v1/writing/recall?limit=-3')).status).toBe(400);
  });
});

describe('GET /v1/writing/recall/:id', () => {
  it('returns one prompt with its attribution', async () => {
    const response = await server.json<RecalledPrompt>('/v1/writing/recall/wr-001');
    expect(response.status).toBe(200);
    expect(response.data.prompt).toContain('local environment');
    const source = response.meta.source as string;
    expect(typeof source).toBe('string');
  });

  it('404s for unknown identifiers', async () => {
    const response = await server.json('/v1/writing/recall/wr-999');
    expect(response.status).toBe(404);
  });
});

describe('GET /v1/writing/move-structures', () => {
  it('lists every structure unfiltered', async () => {
    const response = await server.json<MoveStructure[]>('/v1/writing/move-structures');
    expect(response.status).toBe(200);
    expect(response.meta.total).toBe(3);
    expect(response.data.map((structure) => structure.id)).toContain('writing-task-2-concession-rebuttal');
    expect(response.meta.appliesTo).toBeNull();
  });

  it('filters by the families a structure serves', async () => {
    const trends = await server.json<MoveStructure[]>('/v1/writing/move-structures?applies-to=line%20graph');
    expect(trends.meta.total).toBe(1);
    expect(trends.data[0]?.id).toBe('writing-task-1-dynamic');
    expect(trends.meta.appliesTo).toBe('line graph');

    const nothing = await server.json<MoveStructure[]>('/v1/writing/move-structures?applies-to=xyzzy');
    expect(nothing.data).toHaveLength(0);
  });
});

describe('GET /v1/writing/move-structures/:id', () => {
  it('returns one structure with its moves', async () => {
    const response = await server.json<MoveStructure>('/v1/writing/move-structures/writing-task-1-static');
    expect(response.status).toBe(200);
    expect(response.data.moves.length).toBeGreaterThanOrEqual(5);
    expect(response.data.lexicon?.length).toBeGreaterThan(0);
  });

  it('404s for unknown structures', async () => {
    const response = await server.json('/v1/writing/move-structures/nope');
    expect(response.status).toBe(404);
    const details = (response.meta.error as { details: Record<string, string> }).details;
    expect(details.allowed).toContain('writing-task-2-concession-rebuttal');
  });
});
