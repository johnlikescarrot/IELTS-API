import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { ReadabilityReport } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/tools/readability', () => {
  it('profiles a passage with corpus context', async () => {
    const response = await server.json<ReadabilityReport>(
      '/v1/tools/readability?text=Dogs%20run%20fast.%20Cats%20sleep%20a%20lot.',
    );
    expect(response.status).toBe(200);
    expect(response.data.profile.words).toBe(7);
    expect(response.data.fleschReadingEase).toBe(118.68);
    expect(response.data.fleschKincaidGrade).toBe(-2.42);
    expect(response.data.level.label).toBe('very easy');
    expect(response.data.corpusContext.group).toBe('A1-A2');
    expect(response.meta.corpusReference).toContain('/v1/tests/stats');
    expect(response.meta.limits).toEqual({ maxCharacters: 4000 });
  });

  it('requires the text parameter', async () => {
    const response = await server.json('/v1/tools/readability');
    expect(response.status).toBe(400);
    expect((response.meta.error as { details: Record<string, string> }).details.parameter).toBe('text');
  });

  it('rejects text above the character limit', async () => {
    const response = await server.json(`/v1/tools/readability?text=${'word '.repeat(900).trim()}`);
    expect(response.status).toBe(400);
    const error = response.meta.error as { details: Record<string, string>; message: string };
    expect(error.details.limit).toBe('4000');
    expect(error.message).toContain('at most 4000 characters');
  });

  it('rejects text with no analysable words', async () => {
    const response = await server.json('/v1/tools/readability?text=123%20456%20%21%21%21');
    expect(response.status).toBe(400);
    const error = response.meta.error as { message: string };
    expect(error.message).toContain('no analysable words');
  });

  it('rejects a repeated text parameter', async () => {
    const response = await server.json('/v1/tools/readability?text=Dogs%20run.&text=Cats%20sit.');
    expect(response.status).toBe(400);
    const error = response.meta.error as { message: string };
    expect(error.message).toContain('at most once');
  });
});

describe('GET /v1/tools/essay-profile', () => {
  it('profiles a writing sample with hints and themes', async () => {
    const text = encodeURIComponent(
      'Governments should invest in public transport. For example, cities with good networks cut their carbon footprint quickly.',
    );
    const response = await server.json(`/v1/tools/essay-profile?text=${text}`);
    expect(response.status).toBe(200);
    const data = response.data as {
      task: string;
      length: { minimumWords: number; meetsMinimum: boolean };
      lexical: { tokens: number; headwordCoverage: number };
      themes: unknown[];
      hints: { level: string; criterion: string }[];
      strengths: number;
      watches: number;
    };
    expect(data.task).toBe('task2');
    expect(data.length.minimumWords).toBe(250);
    expect(data.length.meetsMinimum).toBe(false);
    expect(data.lexical.tokens).toBe(17);
    expect(data.themes.length).toBeGreaterThan(0);
    expect(data.hints.length).toBe(data.strengths + data.watches);
    expect(response.meta.disclaimer).toContain('not scores');
    expect(response.meta.taskMinimumWords).toBe(250);
  });

  it('honours the task and limit parameters', async () => {
    const text = encodeURIComponent('TwoSentence sample here.');
    const response = await server.json(`/v1/tools/essay-profile?text=${text}&task=task1&limit=1`);
    expect(response.status).toBe(200);
    const data = response.data as { task: string; length: { minimumWords: number }; themes: unknown[] };
    expect(data.task).toBe('task1');
    expect(data.length.minimumWords).toBe(150);
    expect(data.themes).toHaveLength(0);
    expect(response.meta.taskMinimumWords).toBe(150);
  });

  it('rejects an unknown task', async () => {
    const response = await server.json('/v1/tools/essay-profile?text=Something%20happened.&task=task3');
    expect(response.status).toBe(400);
  });

  it('rejects an out-of-range theme limit', async () => {
    const response = await server.json('/v1/tools/essay-profile?text=Something%20happened.&limit=0');
    expect(response.status).toBe(400);
  });

  it('requires analysable text', async () => {
    const response = await server.json('/v1/tools/essay-profile?text=%21%21%21');
    expect(response.status).toBe(400);
  });
});
