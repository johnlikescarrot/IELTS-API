import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { QuestionTypeWithFrequency } from '../../src/data/questionTypes.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/question-types', () => {
  it('returns the whole taxonomy with observed frequencies', async () => {
    const response = await server.json<QuestionTypeWithFrequency[]>('/v1/question-types');
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(13);
    expect(response.meta.total).toBe(13);
    expect(response.meta.skill).toBeNull();
    expect(response.meta.family).toBeNull();
    expect(response.data[0]!.observed.questions).toBeGreaterThan(0);
    expect(response.meta.frequencySource).toContain('UPGRADE-YOUR-IELTS-SKILLS');
  });

  it('filters by skill, family and free text', async () => {
    const listening = await server.json<QuestionTypeWithFrequency[]>('/v1/question-types?skill=listening');
    expect(listening.data.every((type) => type.skills.includes('listening'))).toBe(true);
    expect(listening.meta.skill).toBe('listening');

    const matching = await server.json<QuestionTypeWithFrequency[]>('/v1/question-types?family=matching');
    expect(matching.data.every((type) => type.family === 'matching')).toBe(true);

    const search = await server.json<QuestionTypeWithFrequency[]>('/v1/question-types?q=headings');
    expect(search.data).toHaveLength(1);
    expect(search.data[0]!.id).toBe('matching-headings');

    const empty = await server.json<QuestionTypeWithFrequency[]>('/v1/question-types?q=zzzzz');
    expect(empty.data).toHaveLength(0);
  });

  it('rejects unknown filters', async () => {
    expect((await server.json('/v1/question-types?skill=writing')).status).toBe(400);
    expect((await server.json('/v1/question-types?family=nope')).status).toBe(400);
  });
});

describe('GET /v1/question-types/:id', () => {
  it('returns one type with strategy, traps and label variants', async () => {
    const response = await server.json<QuestionTypeWithFrequency>('/v1/question-types/true-false-not-given');
    expect(response.status).toBe(200);
    expect(response.data.name).toContain('Identifying information');
    expect(response.data.strategy.length).toBeGreaterThan(2);
    expect(response.data.traps.length).toBeGreaterThan(1);
    expect(response.data.observed.rawLabels).toContain('true_false_not_given');
    expect(response.meta.ids).toContain('short-answer');
  });

  it('404s for an unknown identifier', async () => {
    const response = await server.json('/v1/question-types/gap-fill');
    expect(response.status).toBe(404);
    const error = response.meta.error as { code: string; details: Record<string, string> };
    expect(error.code).toBe('not_found');
    expect(error.details.allowed).toContain('multiple-choice');
  });
});
