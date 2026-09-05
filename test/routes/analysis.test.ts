import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { MAX_TEXT_LENGTH } from '../../src/lib/text.js';
import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';

const SAMPLE =
  'The environment is changing rapidly. However, governments must act, because sustainable ' +
  'development requires collective participation from every citizen.';

let api: TestServer;

beforeAll(async () => {
  api = await startTestServer();
});

afterAll(async () => {
  await api.close();
});

/** Percent-encode a text parameter. */
function q(text: string): string {
  return encodeURIComponent(text);
}

describe('GET /v1/analysis/readability', () => {
  it('returns six formulas and a consensus', async () => {
    const { status, data, meta } = await api.json<{
      scores: { id: string; value: number; unit: string; reference: string }[];
      consensusGrade: number;
      consensus: string;
      stats: { words: number };
    }>(`/v1/analysis/readability?text=${q(SAMPLE)}`);
    expect(status).toBe(200);
    expect(data.scores).toHaveLength(6);
    expect(data.scores[0]?.id).toBe('flesch-reading-ease');
    expect(typeof data.consensusGrade).toBe('number');
    expect(data.stats.words).toBeGreaterThan(0);
    expect(meta['formulas']).toBe(6);
    expect(meta['segmentation']).toContain('vowel-group');
  });

  it('is deterministic across requests', async () => {
    const path = `/v1/analysis/readability?text=${q(SAMPLE)}`;
    const [first, second] = await Promise.all([api.json(path), api.json(path)]);
    expect(first).toEqual(second);
  });

  it('rejects a missing text parameter', async () => {
    const response = await api.request('/v1/analysis/readability');
    expect(response.status).toBe(400);
    const body = (await response.json()) as { meta: { error: { code: string } } };
    expect(body.meta.error.code).toBe('bad_request');
  });

  it('rejects text with no words', async () => {
    const response = await api.request(`/v1/analysis/readability?text=${q('   ')}`);
    expect(response.status).toBe(400);
  });

  it('accepts text at exactly the maximum length', async () => {
    const exact = 'a'.repeat(MAX_TEXT_LENGTH);
    const response = await api.request(`/v1/analysis/readability?text=${q(exact)}`);
    expect(response.status).toBe(200);
  });

  it('rejects text that normalises away to nothing', async () => {
    const response = await api.request(`/v1/analysis/readability?text=${q('.')}`);
    expect(response.status).toBe(200);
  });

  it('rejects over-long text with 422', async () => {
    const oversized = 'a'.repeat(MAX_TEXT_LENGTH + 1);
    const response = await api.request(`/v1/analysis/readability?text=${q(oversized)}`);
    expect(response.status).toBe(422);
    const body = (await response.json()) as {
      meta: { error: { code: string; details: Record<string, string> } };
    };
    expect(body.meta.error.code).toBe('unprocessable_entity');
    expect(body.meta.error.details['maxLength']).toBe(String(MAX_TEXT_LENGTH));
  });
});

describe('GET /v1/analysis/lexical', () => {
  it('reports diversity and Cambridge coverage', async () => {
    const { data, meta } = await api.json<{
      tokens: number;
      types: number;
      cambridgeCoverage: number;
      frequentWords: { word: string }[];
    }>(`/v1/analysis/lexical?text=${q(SAMPLE)}`);
    expect(data.tokens).toBeGreaterThan(0);
    expect(data.types).toBeLessThanOrEqual(data.tokens);
    expect(data.cambridgeCoverage).toBeGreaterThan(0);
    expect(Number(meta['cambridgeHeadwords'])).toBeGreaterThan(1000);
  });

  it('honours the top parameter', async () => {
    const { data } = await api.json<{ frequentWords: unknown[] }>(
      `/v1/analysis/lexical?text=${q(SAMPLE)}&top=2`,
    );
    expect(data.frequentWords).toHaveLength(2);
  });

  it('rejects an out-of-range top parameter', async () => {
    const response = await api.request(`/v1/analysis/lexical?text=${q(SAMPLE)}&top=99`);
    expect(response.status).toBe(400);
  });
});

describe('GET /v1/analysis/essay', () => {
  it('defaults to task-2 and reports the checks', async () => {
    const { data, meta } = await api.json<{
      task: string;
      minimumWords: number;
      checks: { id: string; status: string; rule: string }[];
      indicativeBand: number;
      disclaimer: string;
    }>(`/v1/analysis/essay?text=${q(SAMPLE)}`);
    expect(data.task).toBe('task-2');
    expect(data.minimumWords).toBe(250);
    expect(data.checks.length).toBeGreaterThan(0);
    expect(data.checks.every((check) => check.rule.length > 0)).toBe(true);
    expect(data.indicativeBand).toBeGreaterThanOrEqual(4);
    expect(data.disclaimer).toContain('not a band score');
    expect(meta['task']).toBe('task-2');
  });

  it('accepts task-1', async () => {
    const { data } = await api.json<{ minimumWords: number }>(
      `/v1/analysis/essay?text=${q(SAMPLE)}&task=task-1`,
    );
    expect(data.minimumWords).toBe(150);
  });

  it('rejects an unknown task', async () => {
    const response = await api.request(`/v1/analysis/essay?text=${q(SAMPLE)}&task=task-3`);
    expect(response.status).toBe(400);
  });

  it('counts paragraphs supplied as blank lines', async () => {
    const text = 'First paragraph here.\n\nSecond paragraph here.\n\nThird paragraph here.';
    const { data } = await api.json<{ paragraphs: number }>(`/v1/analysis/essay?text=${q(text)}`);
    expect(data.paragraphs).toBe(3);
  });
});

describe('analysis endpoints are discoverable', () => {
  it('appears in the versioned index', async () => {
    const { data } = await api.json<{ path: string }[]>('/v1');
    const paths = data.map((route) => route.path);
    expect(paths).toContain('/v1/analysis/readability');
    expect(paths).toContain('/v1/analysis/lexical');
    expect(paths).toContain('/v1/analysis/essay');
  });

  it('is documented in the OpenAPI document with a required text parameter', async () => {
    const response = await api.request('/openapi.json');
    const document = (await response.json()) as {
      paths: Record<string, { get: { parameters: { name: string; required?: boolean }[] } }>;
    };
    const parameters = document.paths['/v1/analysis/readability']?.get.parameters ?? [];
    const text = parameters.find((parameter) => parameter.name === 'text');
    expect(text?.required).toBe(true);
    expect(document.paths['/v1/analysis/essay']?.get.parameters.some((p) => p.name === 'task')).toBe(true);
  });
});
