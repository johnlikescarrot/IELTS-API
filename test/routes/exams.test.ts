import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { ExamPaper } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/exams', () => {
  it('returns every paper with its timing and marking', async () => {
    const response = await server.json<ExamPaper[]>('/v1/exams');
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(6);
    expect(response.meta.total).toBe(6);
    expect(response.meta.skill).toBeNull();
    expect(response.meta.module).toBeNull();
    expect(response.meta.ids).toContain('speaking');
    expect(response.data.every((paper) => paper.sections.length > 0)).toBe(true);
    expect(response.meta.crossLinks).toEqual({
      rawScores: '/v1/scores/tables',
      questionTypes: '/v1/question-types',
      descriptors: '/v1/bands/descriptors',
    });
  });

  it('filters by skill', async () => {
    const response = await server.json<ExamPaper[]>('/v1/exams?skill=writing');
    expect(response.data).toHaveLength(2);
    expect(response.data.every((paper) => paper.skill === 'writing')).toBe(true);
    expect(response.meta.skill).toBe('writing');
  });

  it('treats listening and speaking as shared papers in module filters', async () => {
    const academic = await server.json<ExamPaper[]>('/v1/exams?module=academic');
    expect(academic.data.map((paper) => paper.id).sort()).toEqual([
      'academic-reading',
      'academic-writing',
      'listening',
      'speaking',
    ]);
    const general = await server.json<ExamPaper[]>('/v1/exams?module=general-training');
    expect(general.data.map((paper) => paper.id).sort()).toEqual([
      'general-reading',
      'general-writing',
      'listening',
      'speaking',
    ]);
    const shared = await server.json<ExamPaper[]>('/v1/exams?module=both');
    expect(shared.data.map((paper) => paper.id).sort()).toEqual(['listening', 'speaking']);
    expect(shared.meta.module).toBe('both');
  });

  it('searches names, summaries, marking and sections', async () => {
    const letter = await server.json<ExamPaper[]>('/v1/exams?q=letter');
    expect(letter.data.map((paper) => paper.id)).toEqual(['general-writing']);

    const cue = await server.json<ExamPaper[]>('/v1/exams?q=cue-card');
    expect(cue.data.map((paper) => paper.id)).toEqual(['speaking']);

    const empty = await server.json<ExamPaper[]>('/v1/exams?q=zzzzz');
    expect(empty.data).toHaveLength(0);
  });

  it('rejects unknown filters', async () => {
    expect((await server.json('/v1/exams?skill=grammar')).status).toBe(400);
    expect((await server.json('/v1/exams?module=ielts-ukvi')).status).toBe(400);
  });
});

describe('GET /v1/exams/:id', () => {
  it('returns one paper with its sections and cross-links', async () => {
    const response = await server.json<ExamPaper>('/v1/exams/speaking');
    expect(response.status).toBe(200);
    expect(response.data.name).toBe('Speaking');
    expect(response.data.sections).toHaveLength(3);
    expect(response.data.rawScoreTable).toBeNull();
    expect(response.data.relatedUrl).toContain('/v1/bands/descriptors');
    expect(response.meta.ids).toContain('listening');
  });

  it('links the listening paper to its raw-score table', async () => {
    const response = await server.json<ExamPaper>('/v1/exams/listening');
    expect(response.data.rawScoreTable).toBe('listening');
    expect(response.data.questions).toBe(40);
  });

  it('404s for an unknown identifier', async () => {
    const response = await server.json('/v1/exams/general-listening');
    expect(response.status).toBe(404);
    const error = response.meta.error as { code: string; details: Record<string, string> };
    expect(error.code).toBe('not_found');
    expect(error.details.allowed).toContain('speaking');
  });
});
