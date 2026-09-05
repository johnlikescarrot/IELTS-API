import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { AssignmentCollectionStats, AssignmentItem } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/assignments', () => {
  it('returns provenance, statistics and facets', async () => {
    const response = await server.json<{ meta: { repository: string }; stats: AssignmentCollectionStats }>(
      '/v1/assignments',
    );
    expect(response.status).toBe(200);
    expect(response.data.meta.repository).toBe('https://github.com/msneloy/IELTS');
    expect(response.data.stats.documents).toBe(26);
    const facets = response.meta.facets as {
      genre: string[];
      learner: string[];
      task: string[];
      kind: string[];
    };
    expect(facets.genre).toContain('man-made-process');
    expect(facets.learner).toContain('learner-4');
    expect(facets.task).toEqual(['task1', 'task2']);
    expect(facets.kind).toEqual(['instructor', 'submission']);
  });
});

describe('GET /v1/assignments/stats', () => {
  it('returns statistics only', async () => {
    const response = await server.json<AssignmentCollectionStats>('/v1/assignments/stats');
    expect(response.data.submissions).toBe(24);
    expect(response.data.instructorDocuments).toBe(2);
    expect(response.data.byGenre.table).toBe(2);
    expect(response.data.firstDate).toBe('2022-08-11');
  });
});

describe('GET /v1/assignments/items', () => {
  it('paginates the archive in date order', async () => {
    const response = await server.json<AssignmentItem[]>('/v1/assignments/items?limit=3');
    expect(response.data).toHaveLength(3);
    expect(response.meta.total).toBe(26);
    expect(response.meta.sort).toBe('date');
    expect(response.meta.order).toBe('asc');
    expect(response.meta.note).toContain('is redistributed');
    expect(response.meta.hasMore).toBe(true);
  });

  it('filters by task, genre, learner and kind', async () => {
    const task = await server.json<AssignmentItem[]>('/v1/assignments/items?task=task2&limit=50');
    expect(task.data.every((item) => item.task === 'task2')).toBe(true);

    const genre = await server.json<AssignmentItem[]>(
      '/v1/assignments/items?genre=map,natural-process&limit=50',
    );
    expect(genre.meta.total).toBe(6);
    expect(genre.data.every((item) => ['map', 'natural-process'].includes(item.genre))).toBe(true);

    const learner = await server.json<AssignmentItem[]>('/v1/assignments/items?learner=learner-1&limit=50');
    expect(learner.meta.total).toBe(7);

    const kind = await server.json<AssignmentItem[]>('/v1/assignments/items?kind=instructor&limit=50');
    expect(kind.meta.total).toBe(2);
  });

  it('filters by date range', async () => {
    const window = await server.json<AssignmentItem[]>(
      '/v1/assignments/items?from=2022-08-15&to=2022-08-19&limit=50',
    );
    expect(window.meta.total).toBe(11);
  });

  it('searches free text', async () => {
    const response = await server.json<AssignmentItem[]>('/v1/assignments/items?q=pie&limit=50');
    expect(response.meta.total).toBeGreaterThan(0);
    expect(response.meta.query).toBe('pie');
  });

  it('sorts by words descending', async () => {
    const response = await server.json<AssignmentItem[]>(
      '/v1/assignments/items?sort=words&order=desc&limit=2',
    );
    expect(response.data[0]!.stats.words).toBeGreaterThanOrEqual(response.data[1]!.stats.words);
    expect(response.data[0]!.id).toBe('a-2022-08-27-riad-essay');
  });

  it('rejects unknown facet values', async () => {
    const genre = await server.json('/v1/assignments/items?genre=podcast');
    expect(genre.status).toBe(400);
    expect(genre.meta.error).toMatchObject({ details: { parameter: 'genre' } });

    const task = await server.json('/v1/assignments/items?task=task4');
    expect(task.status).toBe(400);

    const kind = await server.json('/v1/assignments/items?kind=secret');
    expect(kind.status).toBe(400);

    const sort = await server.json('/v1/assignments/items?sort=mood');
    expect(sort.status).toBe(400);
  });

  it('rejects out-of-range pagination', async () => {
    const limit = await server.json('/v1/assignments/items?limit=0');
    expect(limit.status).toBe(400);

    const offset = await server.json('/v1/assignments/items?offset=-2');
    expect(offset.status).toBe(400);
  });
});
