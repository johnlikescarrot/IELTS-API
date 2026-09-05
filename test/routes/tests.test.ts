import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { PracticeItem, PracticeStats } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/tests', () => {
  it('returns provenance, statistics and facets', async () => {
    const response = await server.json<{ meta: { repository: string }; stats: PracticeStats }>('/v1/tests');
    expect(response.status).toBe(200);
    expect(response.data.meta.repository).toContain('UPGRADE-YOUR-IELTS-SKILLS');
    expect(response.data.stats.indexedItems).toBeGreaterThan(1500);
    const facets = response.meta.facets as { collection: string[]; type: string[] };
    expect(facets.collection).toContain('graded-reading');
    expect(facets.type).toContain('matching-headings');
  });
});

describe('GET /v1/tests/stats', () => {
  it('returns statistics only', async () => {
    const response = await server.json<PracticeStats>('/v1/tests/stats');
    expect(response.data.byLevel['C1-C2']).toBe(660);
    expect(response.data.questionTypes['summary-completion']).toBeGreaterThan(0);
    expect(response.meta.note).toContain('Derived metadata only');
  });
});

describe('GET /v1/tests/items', () => {
  it('paginates the index', async () => {
    const response = await server.json<PracticeItem[]>('/v1/tests/items?limit=2');
    expect(response.data).toHaveLength(2);
    expect(response.meta.total).toBeGreaterThan(1500);
    expect(response.meta.sort).toBe('id');
    expect(response.meta.order).toBe('asc');
    expect(response.meta.query).toBeNull();
    expect(response.meta.note).toContain('No passage, question, answer key or audio file');
  });

  it('filters by collection, skill, level and question type', async () => {
    const collection = await server.json<PracticeItem[]>('/v1/tests/items?collection=listening-full-test');
    expect(collection.data.every((item) => item.collection === 'listening-full-test')).toBe(true);

    const skill = await server.json<PracticeItem[]>('/v1/tests/items?skill=reading&limit=5');
    expect(skill.data.every((item) => item.skill === 'reading')).toBe(true);

    const level = await server.json<PracticeItem[]>('/v1/tests/items?level=a1-a2,b1-b2&limit=5');
    expect(level.data.every((item) => item.level === 'A1-A2' || item.level === 'B1-B2')).toBe(true);

    const type = await server.json<PracticeItem[]>('/v1/tests/items?type=matching-headings&limit=5');
    expect(type.data.every((item) => item.questionTypes.includes('matching-headings'))).toBe(true);
  });

  it('filters by question count, readability and audio', async () => {
    const counted = await server.json<PracticeItem[]>(
      '/v1/tests/items?minQuestions=40&maxQuestions=40&limit=5',
    );
    expect(counted.data.every((item) => item.questions === 40)).toBe(true);

    const easy = await server.json<PracticeItem[]>(
      '/v1/tests/items?minReadingEase=60&maxReadingEase=100&limit=5',
    );
    expect(easy.data.every((item) => (item.readability?.fleschReadingEase ?? 0) >= 60)).toBe(true);

    const audio = await server.json<PracticeItem[]>('/v1/tests/items?audio=true&limit=5');
    expect(audio.data.every((item) => item.assets.audio)).toBe(true);
  });

  it('searches free text and sorts', async () => {
    const search = await server.json<PracticeItem[]>('/v1/tests/items?q=Reading%20Practice&limit=3');
    expect(search.meta.query).toBe('Reading Practice');
    expect(search.data.length).toBeGreaterThan(0);

    const sorted = await server.json<PracticeItem[]>('/v1/tests/items?sort=questions&order=desc&limit=2');
    expect(sorted.data[0]!.questions).toBeGreaterThanOrEqual(sorted.data[1]!.questions);
  });

  it('rejects unknown facet values and malformed numbers', async () => {
    expect((await server.json('/v1/tests/items?collection=nope')).status).toBe(400);
    expect((await server.json('/v1/tests/items?skill=nope')).status).toBe(400);
    expect((await server.json('/v1/tests/items?level=z1-z2')).status).toBe(400);
    expect((await server.json('/v1/tests/items?type=gap-fill')).status).toBe(400);
    expect((await server.json('/v1/tests/items?minReadingEase=easy')).status).toBe(400);
    expect((await server.json('/v1/tests/items?audio=maybe')).status).toBe(400);
  });
});

describe('GET /v1/tests/:id', () => {
  it('returns one indexed item with its provenance', async () => {
    const response = await server.json<PracticeItem>('/v1/tests/grd-a1a2-001');
    expect(response.status).toBe(200);
    expect(response.data.level).toBe('A1-A2');
    expect(response.data.readability?.words).toBeGreaterThan(100);
    expect(response.meta.license).toBe('CC BY 4.0');
  });

  it('404s for an unknown identifier', async () => {
    const response = await server.json('/v1/tests/rft-999999');
    expect(response.status).toBe(404);
    const error = response.meta.error as { code: string; message: string };
    expect(error.code).toBe('not_found');
    expect(error.message).toContain('rft-999999');
  });
});
