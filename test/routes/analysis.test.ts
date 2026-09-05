import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';

let server: TestServer;

const ESSAY = [
  'Some people believe that governments should fund public transport entirely from general taxation.',
  'However, others argue that private operators deliver services more efficiently. In my opinion, a',
  'hybrid model is preferable, because it combines democratic accountability with commercial discipline.',
  'For example, several European cities contract private operators under strict public regulation, and',
  'passenger satisfaction there is consistently high. In conclusion, public funding combined with',
  'private delivery is the most pragmatic arrangement available to modern city authorities.',
].join(' ');

const post = (path: string, body: string, headers: Record<string, string> = {}): Promise<Response> =>
  server.request(path, { method: 'POST', body, headers });

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/analyze/text', () => {
  it('measures readability, diversity and sentences', async () => {
    const response = await server.json<{
      counts: { words: number };
      readability: { fleschReadingEase: number };
      diversity: { mtld: number };
      sentences: { count: number };
      frequencies: { word: string }[];
    }>(`/v1/analyze/text?text=${encodeURIComponent(ESSAY)}`);
    expect(response.status).toBe(200);
    expect(response.data.counts.words).toBeGreaterThan(50);
    expect(response.data.readability.fleschReadingEase).toBeLessThan(80);
    expect(response.data.diversity.mtld).toBeGreaterThan(0);
    expect(response.data.sentences.count).toBeGreaterThan(3);
    expect(response.data.frequencies.length).toBeLessThanOrEqual(10);
    expect(response.meta.provenance).toContain('no text is stored');
  });

  it('honours the top parameter', async () => {
    const response = await server.json<{ frequencies: unknown[] }>(
      `/v1/analyze/text?top=3&text=${encodeURIComponent(ESSAY)}`,
    );
    expect(response.data.frequencies).toHaveLength(3);
    expect(response.meta.top).toBe(3);
  });

  it('rejects a request without text', async () => {
    const response = await server.json('/v1/analyze/text');
    expect(response.status).toBe(400);
  });
});

describe('POST /v1/analyze/text', () => {
  it('accepts a JSON body', async () => {
    const response = await post('/v1/analyze/text', JSON.stringify({ text: ESSAY }), {
      'content-type': 'application/json',
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const body = (await response.json()) as { data: { counts: { words: number } } };
    expect(body.data.counts.words).toBeGreaterThan(50);
  });

  it('accepts a plain-text body', async () => {
    const response = await post('/v1/analyze/text', ESSAY);
    expect(response.status).toBe(200);
  });

  it('rejects a malformed JSON body', async () => {
    const response = await post('/v1/analyze/text', '{ "text": ');
    expect(response.status).toBe(400);
    const body = (await response.json()) as { meta: { error: { message: string } } };
    expect(body.meta.error.message).toContain('not valid JSON');
  });

  it('rejects a JSON body without a string text property', async () => {
    const response = await post('/v1/analyze/text', JSON.stringify({ text: 42 }));
    expect(response.status).toBe(400);
  });

  it('rejects an empty body with no query fallback', async () => {
    const response = await post('/v1/analyze/text', '   ');
    expect(response.status).toBe(400);
  });

  it('rejects an oversized body', async () => {
    const response = await post('/v1/analyze/text', 'word '.repeat(80000));
    expect(response.status).toBe(413);
    const body = (await response.json()) as { meta: { error: { code: string } } };
    expect(body.meta.error.code).toBe('payload_too_large');
  });
});

describe('/v1/analyze/cohesion', () => {
  it('lists devices by discourse function', async () => {
    const response = await server.json<{ total: number; byFunction: Record<string, number> }>(
      `/v1/analyze/cohesion?text=${encodeURIComponent(ESSAY)}`,
    );
    expect(response.data.total).toBeGreaterThan(2);
    expect(response.data.byFunction.contrast).toBeGreaterThan(0);
    expect(response.meta.inventory).toBeTruthy();
  });

  it('is available over POST', async () => {
    const response = await post('/v1/analyze/cohesion', ESSAY);
    expect(response.status).toBe(200);
  });
});

describe('/v1/analyze/essay', () => {
  it('defaults to Task 2 and returns evidence-linked dimensions', async () => {
    const response = await server.json<{
      task: string;
      indicativeBand: number;
      dimensions: { name: string; evidence: string }[];
      disclaimer: string;
    }>(`/v1/analyze/essay?text=${encodeURIComponent(ESSAY)}`);
    expect(response.data.task).toBe('task-2');
    expect(response.data.dimensions).toHaveLength(4);
    expect(response.data.disclaimer).toContain('not an IELTS score');
    expect(response.meta.rubric).toBe('deterministic-surface-features-v1');
  });

  it('accepts the task-1 rubric', async () => {
    const response = await server.json<{ minimumWords: number }>(
      `/v1/analyze/essay?task=task-1&text=${encodeURIComponent(ESSAY)}`,
    );
    expect(response.data.minimumWords).toBe(150);
  });

  it('rejects an unknown task', async () => {
    expect((await server.json(`/v1/analyze/essay?task=task-9&text=hello`)).status).toBe(400);
  });

  it('is available over POST', async () => {
    const response = await post('/v1/analyze/essay?task=task-2', JSON.stringify({ text: ESSAY }));
    expect(response.status).toBe(200);
  });
});

describe('/v1/analyze/vocabulary', () => {
  it('profiles a text against the Cambridge dataset', async () => {
    const response = await server.json<{
      types: number;
      inDataset: number;
      coverage: number;
      covered: { word: string }[];
      offList: string[];
    }>(`/v1/analyze/vocabulary?text=${encodeURIComponent(ESSAY)}`);
    expect(response.data.types).toBeGreaterThan(10);
    expect(response.data.coverage).toBeGreaterThanOrEqual(0);
    expect(response.data.coverage).toBeLessThanOrEqual(1);
    expect(response.data.covered.length + response.data.offList.length).toBe(response.data.types);
    expect(response.meta.dataset).toBe('cambridge-ielts-1-22-vocabulary');
  });

  it('is available over POST', async () => {
    const response = await post('/v1/analyze/vocabulary', 'atmosphere');
    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: { inDataset: number } };
    expect(body.data.inDataset).toBeGreaterThanOrEqual(0);
  });

  it('reports zero coverage for text that contains no word tokens', async () => {
    const response = await server.json<{ types: number; coverage: number }>(
      '/v1/analyze/vocabulary?text=12345',
    );
    expect(response.data.types).toBe(0);
    expect(response.data.coverage).toBe(0);
  });

  it('reports zero coverage when nothing matches', async () => {
    const response = await server.json<{ coverage: number; inDataset: number }>(
      '/v1/analyze/vocabulary?text=zzzqqq%20xxwwvv',
    );
    expect(response.data.inDataset).toBe(0);
    expect(response.data.coverage).toBe(0);
  });
});

describe('method dispatch', () => {
  it('returns 405 when a path exists but not for that method', async () => {
    const response = await post('/v1/bands', '{}');
    expect(response.status).toBe(405);
    const body = (await response.json()) as { meta: { error: { code: string } } };
    expect(body.meta.error.code).toBe('method_not_allowed');
  });

  it('still returns 404 for an unknown path', async () => {
    const response = await post('/v1/nope', '{}');
    expect(response.status).toBe(404);
  });
});
