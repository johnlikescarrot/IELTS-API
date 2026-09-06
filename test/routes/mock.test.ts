import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

interface MockSection {
  skill: string;
  order: number;
  minutes: number;
  content: Record<string, unknown>;
}

interface MockExamBody {
  seed: string;
  module: string;
  sections: MockSection[];
  questions: number;
  scoring: { listening: string; reading: string };
}

describe('GET /v1/mock/exam', () => {
  it('composes a complete four-skill exam with default module', async () => {
    const response = await server.json<MockExamBody>('/v1/mock/exam?seed=research-sitting');
    expect(response.status).toBe(200);
    expect(response.data.seed).toBe('research-sitting');
    expect(response.data.module).toBe('academic');
    expect(response.data.sections.map((section) => section.skill)).toEqual([
      'listening',
      'reading',
      'writing',
      'speaking',
    ]);
    expect(response.data.questions).toBeGreaterThan(0);
    expect(response.data.scoring).toEqual({ listening: 'listening', reading: 'academic-reading' });
    expect(response.meta.method).toContain('Identical seeds return identical exams');
  });

  it('is deterministic across requests for the same seed', async () => {
    const first = await server.json<MockExamBody>('/v1/mock/exam?seed=deterministic');
    const second = await server.json<MockExamBody>('/v1/mock/exam?seed=deterministic');
    expect(first.data).toEqual(second.data);
  });

  it('switches the Task 1 family and reading table for General Training', async () => {
    const response = await server.json<MockExamBody>(
      '/v1/mock/exam?seed=research-sitting&module=general-training',
    );
    expect(response.data.module).toBe('general-training');
    expect(response.data.scoring.reading).toBe('general-training-reading');
    const writing = response.data.sections.find((section) => section.skill === 'writing');
    expect((writing?.content['task1'] as { id: string }).id.length).toBeGreaterThan(0);
  });

  it('defaults the seed to the current date so the homepage mock is shared by every caller', async () => {
    const response = await server.json<MockExamBody>('/v1/mock/exam');
    expect(response.data.seed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('references resolvable content in every section', async () => {
    const response = await server.json<MockExamBody>('/v1/mock/exam?seed=content-check');
    for (const section of response.data.sections) {
      expect(section.minutes).toBeGreaterThan(0);
      expect(Object.keys(section.content).length).toBeGreaterThan(0);
    }
    const listening = response.data.sections[0]?.content['paper'] as { id: string; sourceUrl: string };
    expect(listening.id).toMatch(/^lft-/);
    expect(listening.sourceUrl.startsWith('https://')).toBe(true);
  });

  it('rejects an unknown module', async () => {
    const response = await server.json('/v1/mock/exam?module=life-skills');
    expect(response.status).toBe(400);
  });
});
