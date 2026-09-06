import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { ExamPaper, ExamStructure } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/exam', () => {
  it('defaults to the Academic module', async () => {
    const response = await server.json<ExamStructure>('/v1/exam');
    expect(response.status).toBe(200);
    expect(response.data.module).toBe('academic');
    expect(response.data.papers).toHaveLength(4);
    expect(response.meta.source).toContain('British Council');
  });

  it('serves the General Training specification on request', async () => {
    const response = await server.json<ExamStructure>('/v1/exam?module=general-training');
    expect(response.data.sittingOrder[1]).toBe('General Training Reading');
    expect(response.data.writtenMinutesWithTransfer).toBe(160);
  });

  it('rejects an unknown module', async () => {
    const response = await server.request('/v1/exam?module=business');
    expect(response.status).toBe(400);
  });
});

describe('GET /v1/exam/papers', () => {
  it('lists every paper when no module is given', async () => {
    const response = await server.json<ExamPaper[]>('/v1/exam/papers');
    expect(response.data).toHaveLength(6);
    expect(response.meta.module).toBeNull();
    expect(response.meta.writtenMinutes).toBe(150);
  });

  it('filters to one module', async () => {
    const response = await server.json<ExamPaper[]>('/v1/exam/papers?module=academic');
    expect(response.data.map((paper) => paper.id)).toEqual([
      'listening',
      'academic-reading',
      'academic-writing',
      'speaking',
    ]);
    expect(response.meta.total).toBe(4);
  });
});

describe('GET /v1/exam/papers/:id', () => {
  it('returns one paper with its parts', async () => {
    const response = await server.json<ExamPaper>('/v1/exam/papers/listening');
    expect(response.data.parts).toHaveLength(4);
    expect(response.meta.scoring).toContain('/v1/scores/raw');
  });

  it('describes analytic marking for a productive paper', async () => {
    const response = await server.json<ExamPaper>('/v1/exam/papers/academic-writing');
    expect(response.meta.scoring).toContain('/v1/bands/descriptors');
  });

  it('404s on an unknown paper and lists the valid identifiers', async () => {
    const response = await server.request('/v1/exam/papers/reading');
    expect(response.status).toBe(404);
    const body = (await response.json()) as { meta: { error: { details: { allowed: string } } } };
    expect(body.meta.error.details.allowed).toContain('academic-reading');
  });
});
