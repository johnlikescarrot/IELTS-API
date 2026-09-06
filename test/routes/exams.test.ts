import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';
import { canonicalSeed } from '../../src/data/exams.js';
import { allEntries } from '../../src/data/vocabulary.js';

import type { TestServer } from '../helpers/server.js';
import type { ExamPaper, VocabularyDrill } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/exams', () => {
  it('publishes the official test format and the assembly contract', async () => {
    const response = await server.json<{
      name: string;
      format: { papers: { skill: string }[]; writtenTotalMinutes: number };
      assembly: { pools: Record<string, number> };
      marking: Record<string, string>;
    }>('/v1/exams');
    expect(response.status).toBe(200);
    expect(response.data.name).toBe('IELTS mock exam center');
    expect(response.data.format.papers.map((paper) => paper.skill)).toEqual([
      'listening',
      'reading',
      'writing',
      'speaking',
    ]);
    expect(response.data.format.writtenTotalMinutes).toBe(160);
    expect(response.data.assembly.pools).toEqual({
      listeningTests: 201,
      readingTests: 269,
      task1Families: 10,
      task2Prompts: 111,
      part1Sets: 26,
      part2CueCards: 30,
      part3Topics: 24,
      themes: 50,
      audioVolumes: 7,
    });
    expect(response.data.marking.overall).toContain('/v1/scores/overall');
    expect(response.meta.reproducibility).toContain('/v1/exams/papers/mock-academic-');
  });
});

describe('GET /v1/exams/blueprint', () => {
  it('assembles an academic paper deterministically', async () => {
    const response = await server.json<ExamPaper>('/v1/exams/blueprint?module=academic&seed=demo');
    expect(response.status).toBe(200);
    expect(response.data.id).toBe(`mock-academic-${canonicalSeed('demo')}`);
    expect(response.data.module).toBe('academic');
    expect(response.data.listening.test.id).toMatch(/^lft-\d+$/);
    expect(response.data.reading.test?.id).toMatch(/^rft-\d+$/);
    expect(response.data.writing.tasks).toHaveLength(2);
    expect(response.data.speaking.part2.prompt.length).toBeGreaterThan(0);
    expect(response.meta.seed).toBe(canonicalSeed('demo'));

    const repeat = await server.json<ExamPaper>('/v1/exams/blueprint?module=academic&seed=demo');
    expect(JSON.stringify(repeat.data)).toBe(JSON.stringify(response.data));
  });

  it('defaults to the Academic module and today as the seed', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const response = await server.json<ExamPaper>('/v1/exams/blueprint');
    expect(response.data.module).toBe('academic');
    expect(response.meta.seed).toBe(canonicalSeed(today));
  });

  it('assembles the general-training paper', async () => {
    const response = await server.json<ExamPaper>('/v1/exams/blueprint?module=general-training&seed=demo');
    expect(response.data.id).toBe(`mock-general-training-${canonicalSeed('demo')}`);
    expect(response.data.reading.test).toBeNull();
    expect(response.data.reading.note).toContain('General Training');
    expect(response.data.writing.tasks[0].link).toBe('/v1/tasks/writing?module=general-training');
  });

  it('rejects an unknown module', async () => {
    const response = await server.json('/v1/exams/blueprint?module=bogus');
    expect(response.status).toBe(400);
  });

  it('rejects an over-long seed', async () => {
    const response = await server.json(`/v1/exams/blueprint?seed=${'x'.repeat(65)}`);
    expect(response.status).toBe(400);
  });

  it('accepts a seed at the published length limit', async () => {
    const response = await server.json<ExamPaper>(`/v1/exams/blueprint?seed=${'x'.repeat(64)}`);
    expect(response.status).toBe(200);
    expect(response.data.seed).toBe(canonicalSeed('x'.repeat(64)));
  });
});

describe('GET /v1/exams/papers/:paperId', () => {
  it('re-derives a paper byte-identically from its identifier', async () => {
    const blueprint = await server.json<ExamPaper>('/v1/exams/blueprint?module=academic&seed=demo');
    const response = await server.json<ExamPaper>(`/v1/exams/papers/${blueprint.data.id}`);
    expect(response.status).toBe(200);
    expect(JSON.stringify(response.data)).toBe(JSON.stringify(blueprint.data));
  });

  it('re-derives general-training papers too', async () => {
    const response = await server.json<ExamPaper>('/v1/exams/papers/mock-general-training-00000000');
    expect(response.status).toBe(200);
    expect(response.data.module).toBe('general-training');
    expect(response.data.seed).toBe('00000000');
  });

  it('rejects malformed identifiers with guidance', async () => {
    for (const id of ['nonsense', 'mock-academic-abcdefzz', 'mock-bogus-3fa2c81d']) {
      const response = await server.json(`/v1/exams/papers/${id}`);
      expect(response.status).toBe(404);
    }
    const response = await server.json('/v1/exams/papers/nonsense');
    expect(JSON.stringify(response.meta.error)).toContain('mock-{module}-{seed}');
  });
});

describe('GET /v1/exams/drill/vocabulary', () => {
  it('builds a keyed drill deterministically', async () => {
    const response = await server.json<VocabularyDrill>('/v1/exams/drill/vocabulary?size=6&seed=demo');
    expect(response.status).toBe(200);
    expect(response.data.items).toHaveLength(6);
    expect(response.data.key).toHaveLength(6);
    expect(response.data.id).toBe(`drill-${canonicalSeed('demo')}`);

    const repeat = await server.json<VocabularyDrill>('/v1/exams/drill/vocabulary?size=6&seed=demo');
    expect(JSON.stringify(repeat.data)).toBe(JSON.stringify(response.data));
  });

  it('hides the key on request', async () => {
    const response = await server.json<VocabularyDrill>(
      '/v1/exams/drill/vocabulary?size=2&seed=demo&key=false',
    );
    expect(response.data.key).toBeNull();
    expect(response.data.items).toHaveLength(2);
  });

  it('restricts the tested words to a volume and a part of speech', async () => {
    const response = await server.json<VocabularyDrill>(
      '/v1/exams/drill/vocabulary?size=5&seed=demo&volume=5&pos=adjective',
    );
    expect(response.status).toBe(200);
    for (const item of response.data.items) {
      expect(item.partOfSpeech).toBe('adjective');
      const source = allEntries().find((entry) => entry.word === item.word);
      expect(source?.volumes).toContain(5);
    }
  });

  it('rejects invalid parameters', async () => {
    for (const query of [
      'size=0',
      'size=51',
      'size=abc',
      'volume=0',
      'volume=23',
      'volume=1.5',
      'pos=nonsense',
      `seed=${'x'.repeat(65)}`,
    ]) {
      const response = await server.json(`/v1/exams/drill/vocabulary?${query}`);
      expect(response.status).toBe(400);
    }
  });

  it('refuses a drill larger than the matching pool', async () => {
    const response = await server.json<VocabularyDrill>(
      '/v1/exams/drill/vocabulary?size=50&volume=5&pos=adjective',
    );
    expect(response.status).toBe(400);
  });
});
