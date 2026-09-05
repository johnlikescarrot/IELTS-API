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

interface Hit {
  ref: string;
  dataset: string;
  title: string;
  snippet: string | null;
  url: string;
  score: number;
  field: 'primary' | 'secondary';
}

interface DatasetOut {
  label: string;
  endpoint: string;
  total: number;
  items: Hit[];
}

interface SearchBody {
  query: string;
  matches: number;
  datasets: Record<string, DatasetOut | undefined>;
}

describe('GET /v1/search', () => {
  it('searches every dataset at once', async () => {
    const response = await server.json<SearchBody>('/v1/search?q=essay');
    expect(response.status).toBe(200);
    expect(response.data.query).toBe('essay');
    expect(response.data.matches).toBeGreaterThan(0);
    const vocabulary = response.data.datasets.vocabulary;
    expect(vocabulary?.total).toBeGreaterThan(0);
    expect(vocabulary?.items[0]?.title).toBe('essay');
    expect(vocabulary?.items[0]?.url).toBe('/v1/vocabulary/essay');
    expect(response.meta.ranking).toContain('exact match');
  });

  it('hits several datasets for one query', async () => {
    const response = await server.json<SearchBody>('/v1/search?q=education');
    expect(response.data.datasets.vocabulary?.total).toBeGreaterThan(0);
    expect(response.data.datasets['writing-topics']?.total).toBeGreaterThan(0);
    expect(response.data.datasets.themes?.total).toBeGreaterThan(0);
    const summed = Object.values(response.data.datasets).reduce(
      (total, dataset) => total + (dataset?.total ?? 0),
      0,
    );
    expect(response.data.matches).toBe(summed);
  });

  it('restricts the search to the requested datasets', async () => {
    const response = await server.json<SearchBody>('/v1/search?q=essay&datasets=vocabulary,question-types');
    expect(response.status).toBe(200);
    expect(Object.keys(response.data.datasets).sort()).toEqual(['question-types', 'vocabulary']);
    expect(response.meta.datasets).toEqual(['vocabulary', 'question-types']);
  });

  it('rejects unknown dataset names', async () => {
    const response = await server.json('/v1/search?q=essay&datasets=unknown');
    expect(response.status).toBe(400);
    expect((response.meta.error as { details: Record<string, string> }).details.allowed).toContain(
      'vocabulary',
    );
  });

  it('requires the query', async () => {
    expect((await server.json('/v1/search')).status).toBe(400);
  });

  it('bounds the query length', async () => {
    expect((await server.json('/v1/search?q=x')).status).toBe(400);
    expect((await server.json(`/v1/search?q=${'x'.repeat(81)}`)).status).toBe(400);
  });

  it('bounds the per-dataset limit', async () => {
    expect((await server.json('/v1/search?q=essay&limit=0')).status).toBe(400);
    expect((await server.json('/v1/search?q=essay&limit=21')).status).toBe(400);
  });

  it('truncates each dataset to the limit while keeping the totals', async () => {
    const response = await server.json<SearchBody>('/v1/search?q=ielts&limit=2');
    expect(response.status).toBe(200);
    const tests = response.data.datasets.tests;
    expect(tests?.items).toHaveLength(2);
    expect(tests?.total).toBeGreaterThan(2);
  });

  it('returns identical responses for identical queries', async () => {
    const first = await server.json<SearchBody>('/v1/search?q=graph&limit=3');
    const second = await server.json<SearchBody>('/v1/search?q=graph&limit=3');
    expect(second).toEqual(first);
  });

  it('returns empty datasets, not an error, when nothing matches', async () => {
    const response = await server.json<SearchBody>('/v1/search?q=zzzzzz');
    expect(response.status).toBe(200);
    expect(response.data.matches).toBe(0);
  });
});
