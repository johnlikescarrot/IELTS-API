import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { ListeningSection, PracticeQuestionType, StudyPlan } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/practice/question-types', () => {
  it('returns every question family with facet metadata', async () => {
    const response = await server.json<PracticeQuestionType[]>('/v1/practice/question-types');
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(19);
    expect(response.meta.total).toBe(19);
    expect(response.meta.skill).toBeNull();
    expect(response.meta.skills).toEqual(['listening', 'reading']);
  });

  it('filters by skill', async () => {
    const listening = await server.json<PracticeQuestionType[]>(
      '/v1/practice/question-types?skill=listening',
    );
    expect(listening.data).toHaveLength(8);
    expect(listening.data.every((type) => type.skill === 'listening')).toBe(true);
    expect(listening.meta.skill).toBe('listening');

    const reading = await server.json<PracticeQuestionType[]>('/v1/practice/question-types?skill=reading');
    expect(reading.data).toHaveLength(11);
    expect(reading.data.every((type) => type.skill === 'reading')).toBe(true);
  });

  it('searches family names, descriptions and guidance', async () => {
    const response = await server.json<PracticeQuestionType[]>('/v1/practice/question-types?q=not%20given');
    expect(response.data.length).toBeGreaterThan(0);
    expect(response.data.length).toBeLessThan(19);
    expect(response.meta.query).toBe('not given');
  });

  it('rejects an unknown skill', async () => {
    expect((await server.json('/v1/practice/question-types?skill=writing')).status).toBe(400);
  });
});

describe('GET /v1/practice/listening/sections', () => {
  it('returns the four sections with the timing model', async () => {
    const response = await server.json<ListeningSection[]>('/v1/practice/listening/sections');
    expect(response.status).toBe(200);
    expect(response.data.map((section) => section.section)).toEqual([1, 2, 3, 4]);
    expect(response.meta.total).toBe(4);
    expect(response.meta.questions).toBe(40);
    expect(response.meta.audioMinutes).toBe(30);
    expect(response.meta.transferMinutes).toBe(10);
    expect(typeof response.meta.note).toBe('string');
  });
});

describe('GET /v1/practice/study-plans', () => {
  it('returns every CEFR plan with level metadata', async () => {
    const response = await server.json<StudyPlan[]>('/v1/practice/study-plans');
    expect(response.status).toBe(200);
    expect(response.data.map((plan) => plan.level)).toEqual(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
    expect(response.meta.total).toBe(6);
    expect(response.meta.level).toBeNull();
    expect(response.meta.levels).toEqual(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
    expect(response.meta.readingMinutes).toBe(60);
  });

  it('filters by level', async () => {
    const response = await server.json<StudyPlan[]>('/v1/practice/study-plans?level=B2');
    expect(response.data).toHaveLength(1);
    expect(response.data[0]?.label).toBe('Upper-intermediate');
    expect(response.meta.level).toBe('B2');
  });

  it('rejects an unknown level', async () => {
    expect((await server.json('/v1/practice/study-plans?level=C3')).status).toBe(400);
  });
});
