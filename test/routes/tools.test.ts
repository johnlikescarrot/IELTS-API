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

describe('GET /v1/tools/mark', () => {
  interface Sheet {
    answers: { question: number; correct: boolean; reason: string; nearMiss: boolean }[];
    questions: number;
    correct: number;
    incorrect: number;
    blank: number;
    nearMisses: number;
    accuracy: number;
    band: { band: number; cefr: string; extrapolated: boolean } | null;
  }

  const key = encodeURIComponent('(the) river bank|TRUE|B/C|colour');

  it('marks a sheet against a published key', async () => {
    const answers = encodeURIComponent('The River Bank|true|c|color');
    const response = await server.json<Sheet>(`/v1/tools/mark?key=${key}&answers=${answers}`);
    expect(response.status).toBe(200);
    expect(response.data.correct).toBe(4);
    expect(response.data.accuracy).toBe(1);
    expect(response.data.answers.map((entry) => entry.reason)).toEqual([
      'case-insensitive',
      'exact',
      'alternative',
      'spelling-variant',
    ]);
    expect(response.meta.method).toContain('case-insensitive');
  });

  it('treats missing and empty slots as blanks', async () => {
    const response = await server.json<Sheet>(
      `/v1/tools/mark?key=${key}&answers=${encodeURIComponent('|true')}`,
    );
    expect(response.data.blank).toBe(3);
    expect(response.data.correct).toBe(1);
  });

  it('marks a sheet with no answers at all as entirely blank', async () => {
    const response = await server.json<Sheet>(`/v1/tools/mark?key=${key}`);
    expect(response.data.blank).toBe(4);
    expect(response.data.correct).toBe(0);
  });

  it('flags near misses so lost spelling marks are visible', async () => {
    const response = await server.json<Sheet>(
      `/v1/tools/mark?key=${encodeURIComponent('river')}&answers=${encodeURIComponent('rivers')}`,
    );
    expect(response.data.nearMisses).toBe(1);
    expect(response.meta.nearMiss).toContain('one edit');
  });

  it('applies a stated word limit', async () => {
    const response = await server.json<Sheet>(
      `/v1/tools/mark?key=${encodeURIComponent('red box')}&answers=${encodeURIComponent('the big red box')}&wordLimit=2`,
    );
    expect(response.data.answers[0]?.reason).toBe('over-word-limit');
    expect(response.meta.wordLimit).toBe(2);
  });

  it('reports no word limit when none is given', async () => {
    const response = await server.json<Sheet>(`/v1/tools/mark?key=${encodeURIComponent('red box')}`);
    expect(response.meta.wordLimit).toBeNull();
  });

  it('converts a full 40-question sheet into a band', async () => {
    const full = Array.from({ length: 40 }, (_value, index) => `a${index}`);
    const given = full.map((value, index) => (index < 30 ? value : 'x'));
    const response = await server.json<Sheet>(
      `/v1/tools/mark?paper=listening&key=${encodeURIComponent(full.join('|'))}&answers=${encodeURIComponent(given.join('|'))}`,
    );
    expect(response.data.correct).toBe(30);
    expect(response.data.band).toMatchObject({ band: 7, cefr: 'C1', extrapolated: false });
    expect(response.meta.banding).toContain('/v1/scores/raw/tables');
  });

  it('withholds a band when the key is not a full paper', async () => {
    const response = await server.json<Sheet>(`/v1/tools/mark?paper=listening&key=${key}`);
    expect(response.data.band).toBeNull();
    expect(response.meta.banding).toContain('40-question key');
  });

  it('withholds a band when no paper is named', async () => {
    const full = Array.from({ length: 40 }, () => 'a').join('|');
    const response = await server.json<Sheet>(`/v1/tools/mark?key=${encodeURIComponent(full)}`);
    expect(response.data.band).toBeNull();
  });

  it('requires a key', async () => {
    expect((await server.request('/v1/tools/mark')).status).toBe(400);
  });

  it('rejects a key longer than one paper', async () => {
    const long = Array.from({ length: 41 }, () => 'a').join('|');
    const response = await server.request(`/v1/tools/mark?key=${encodeURIComponent(long)}`);
    expect(response.status).toBe(400);
  });

  it('rejects more answers than the key has questions', async () => {
    const response = await server.request(
      `/v1/tools/mark?key=${encodeURIComponent('a|b')}&answers=${encodeURIComponent('a|b|c')}`,
    );
    expect(response.status).toBe(400);
  });

  it('rejects an oversized key', async () => {
    const huge = 'a'.repeat(4001);
    const response = await server.request(`/v1/tools/mark?key=${encodeURIComponent(huge)}`);
    expect(response.status).toBe(400);
  });

  it('rejects an oversized answer list', async () => {
    const huge = 'a'.repeat(4001);
    const response = await server.request(
      `/v1/tools/mark?key=${encodeURIComponent('a')}&answers=${encodeURIComponent(huge)}`,
    );
    expect(response.status).toBe(400);
  });

  it('rejects an unknown paper', async () => {
    const response = await server.request(`/v1/tools/mark?paper=writing&key=${key}`);
    expect(response.status).toBe(400);
  });
});
