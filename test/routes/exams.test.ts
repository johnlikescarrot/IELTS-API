import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { ExamFormat, MockExamBlueprint } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/exams', () => {
  it('describes both module formats', async () => {
    const response = await server.json<ExamFormat[]>('/v1/exams');
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(2);
    expect(response.data.map((format) => format.module)).toEqual(['academic', 'general-training']);
    expect(
      response.data.every((format) => format.listening.questions === 40 && format.reading.questions === 40),
    ).toBe(true);
  });

  it('filters to one module', async () => {
    const response = await server.json<ExamFormat[]>('/v1/exams?module=academic');
    expect(response.data).toHaveLength(1);
    expect(response.data[0]?.module).toBe('academic');
    expect(response.data[0]?.reading.parts.map((part) => part.questions)).toEqual([13, 13, 14]);
  });

  it('reflects the General Training Reading split', async () => {
    const response = await server.json<ExamFormat[]>('/v1/exams?module=general-training');
    expect(response.data[0]?.reading.parts.map((part) => part.questions)).toEqual([14, 13, 13]);
  });

  it('rejects unknown modules', async () => {
    const response = await server.json<ExamFormat[]>('/v1/exams?module=phd');
    expect(response.status).toBe(400);
  });
});

describe('GET /v1/exams/blueprint', () => {
  it('builds a deterministic session for a date', async () => {
    const response = await server.json<MockExamBlueprint>(
      '/v1/exams/blueprint?module=academic&date=2026-09-05',
    );
    expect(response.status).toBe(200);
    expect(response.data.session.module).toBe('academic');
    expect(response.data.session.date).toBe('2026-09-05');
    expect(response.data.writing.task1.endpoint).toContain('module=academic');
    expect(response.meta.seed).toBe('2026-09-05');

    const again = await server.json<MockExamBlueprint>('/v1/exams/blueprint?module=academic&date=2026-09-05');
    expect(again.data).toEqual(response.data);
  });

  it('overrides the seed explicitly', async () => {
    const response = await server.json<MockExamBlueprint>(
      '/v1/exams/blueprint?module=academic&date=2026-09-05&seed=session-42',
    );
    expect(response.data.session.seed).toBe('session-42');
    expect(response.data.session.id).toMatch(/^mock-[0-9a-f]{8}$/);
  });

  it('values a target band into graded reading sources', async () => {
    const response = await server.json<MockExamBlueprint>(
      '/v1/exams/blueprint?module=academic&date=2026-09-05&target=6.5',
    );
    expect(response.data.reading.sources).toHaveLength(3);
    expect(response.data.reading.sources.every((source) => source.level === 'B1-B2')).toBe(true);
    expect(response.meta.target).toBe(6.5);
  });

  it('requires the module', async () => {
    const response = await server.json<MockExamBlueprint>('/v1/exams/blueprint?date=2026-09-05');
    expect(response.status).toBe(400);
    expect((response.meta.error as { details: Record<string, string> }).details.parameter).toBe('module');
  });

  it('rejects invalid dates and targets', async () => {
    expect((await server.json('/v1/exams/blueprint?module=academic&date=2026-02-30')).status).toBe(400);
    expect(
      (await server.json('/v1/exams/blueprint?module=academic&date=2026-09-05&target=7.25')).status,
    ).toBe(400);
    expect((await server.json('/v1/exams/blueprint?module=academic&date=2026-09-05&target=3.5')).status).toBe(
      400,
    );
  });
});
