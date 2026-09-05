import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { SampleItem, SamplesStats } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/samples', () => {
  it('returns provenance, statistics, facets and cross-links', async () => {
    const response = await server.json<{ meta: { repository: string }; stats: SamplesStats }>('/v1/samples');
    expect(response.status).toBe(200);
    expect(response.data.meta.repository).toContain('msneloy/IELTS');
    expect(response.data.stats.indexedFiles).toBe(45);
    const facets = response.meta.facets as { collection: string[]; type: string[] };
    expect(facets.collection).toEqual(['learner-writing', 'reading-sample']);
    expect(facets.type).toContain('multiple-choice');
    const crossLinks = response.meta.crossLinks as Record<string, string>;
    expect(crossLinks.questionTypes).toBe('/v1/question-types');
  });
});

describe('GET /v1/samples/stats', () => {
  it('returns statistics only', async () => {
    const response = await server.json<SamplesStats>('/v1/samples/stats');
    expect(response.data.learnerWriting.essays).toBe(24);
    expect(response.data.learnerWriting.sessions).toBe(7);
    expect(response.data.readingSamples.distinctQuestionTypes).toBe(8);
    expect(response.meta.note).toContain('not redistributed');
  });
});

describe('GET /v1/samples/items', () => {
  it('paginates the index with id sort by default', async () => {
    const response = await server.json<SampleItem[]>('/v1/samples/items?limit=20&offset=40');
    expect(response.data).toHaveLength(5);
    expect(response.meta.total).toBe(45);
    expect(response.meta.sort).toBe('id');
    expect(response.meta.hasMore).toBe(false);
    expect(response.meta.note).toContain('not redistributed');
  });

  it('filters learner essays by task family and author', async () => {
    const response = await server.json<SampleItem[]>(
      '/v1/samples/items?collection=learner-writing&kind=essay&task=academic-pie-chart',
    );
    expect(response.meta.total).toBe(3);
    expect(
      response.data.every(
        (item) => item.kind === 'essay' && item.taskFamily === 'academic-pie-chart' && item.session !== null,
      ),
    ).toBe(true);

    const emon = await server.json<SampleItem[]>('/v1/samples/items?author=emon&task=task-2');
    expect(emon.meta.total).toBe(2);
    expect(emon.data.every((item) => item.author === 'emon')).toBe(true);
  });

  it('filters reading samples by canonical question type', async () => {
    const response = await server.json<SampleItem[]>('/v1/samples/items?type=summary-completion');
    expect(response.meta.total).toBe(5);
    expect(
      response.data.every(
        (item) => item.collection === 'reading-sample' && item.questionType === 'summary-completion',
      ),
    ).toBe(true);
  });

  it('filters by session, skill, kind and format', async () => {
    const session = await server.json<SampleItem[]>('/v1/samples/items?session=2022-08-19');
    expect(session.meta.total).toBe(8);
    expect(session.data.every((item) => item.session === '2022-08-19')).toBe(true);

    const grammar = await server.json<SampleItem[]>('/v1/samples/items?skill=grammar');
    expect(grammar.meta.total).toBe(1);
    expect(grammar.data[0]!.kind).toBe('exercise');

    const visuals = await server.json<SampleItem[]>('/v1/samples/items?kind=task-visual&format=jpg');
    expect(visuals.meta.total).toBe(5);
    expect(visuals.data.every((item) => item.format === 'jpg')).toBe(true);
  });

  it('searches free text and reports the query', async () => {
    const response = await server.json<SampleItem[]>('/v1/samples/items?q=pie+chart');
    expect(response.meta.total).toBeGreaterThan(0);
    expect(response.meta.query).toBe('pie chart');
  });

  it('sorts by size descending and session ascending', async () => {
    const bySize = await server.json<SampleItem[]>('/v1/samples/items?sort=size&order=desc&limit=3');
    expect(bySize.data[0]!.sizeBytes).toBeGreaterThanOrEqual(bySize.data[1]!.sizeBytes);
    expect(bySize.meta.order).toBe('desc');

    const bySession = await server.json<SampleItem[]>(
      '/v1/samples/items?sort=session&collection=learner-writing&limit=100',
    );
    const last = bySession.data[bySession.data.length - 1]!;
    expect(last.session).toBe('2022-08-27');
  });

  it('rejects unknown facet values and bad pagination', async () => {
    expect((await server.json('/v1/samples/items?collection=nope')).status).toBe(400);
    expect((await server.json('/v1/samples/items?kind=nope')).status).toBe(400);
    expect((await server.json('/v1/samples/items?type=nope')).status).toBe(400);
    expect((await server.json('/v1/samples/items?task=nope')).status).toBe(400);
    expect((await server.json('/v1/samples/items?session=2022-09-01')).status).toBe(400);
    expect((await server.json('/v1/samples/items?author=nobody')).status).toBe(400);
    expect((await server.json('/v1/samples/items?skill=speaking')).status).toBe(400);
    expect((await server.json('/v1/samples/items?format=mp3')).status).toBe(400);
    expect((await server.json('/v1/samples/items?sort=nope')).status).toBe(400);
    expect((await server.json('/v1/samples/items?limit=0')).status).toBe(400);
  });
});

describe('GET /v1/samples/:id', () => {
  it('returns one indexed essay', async () => {
    const response = await server.json<SampleItem>('/v1/samples/assignments-22-08-15-mahmuda-pie-chart-md');
    expect(response.status).toBe(200);
    expect(response.data).toMatchObject({
      collection: 'learner-writing',
      kind: 'essay',
      session: '2022-08-15',
      author: 'mahmuda',
      taskFamily: 'academic-pie-chart',
    });
    const crossLinks = response.meta.crossLinks as Record<string, string>;
    expect(crossLinks.essayProfiler).toBe('/v1/tools/essay-profile');
  });

  it('returns one reading sample task with its question type', async () => {
    const response = await server.json<SampleItem>(
      '/v1/samples/academic-reading-samples-academic-reading-sample-task-matching-headings-pdf',
    );
    expect(response.data.questionType).toBe('matching-headings');
    expect(response.meta.repository).toContain('msneloy');
  });

  it('answers 404 for an unknown id', async () => {
    const response = await server.json('/v1/samples/definitely-not-a-sample');
    expect(response.status).toBe(404);
  });
});
