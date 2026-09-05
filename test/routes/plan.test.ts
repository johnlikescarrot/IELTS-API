import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { StudyPlan } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/study-plan', () => {
  it('builds a plan for a band gap', async () => {
    const response = await server.json<StudyPlan>('/v1/study-plan?current=5.5&target=7&weeks=6&hours=12');
    expect(response.status).toBe(200);
    expect(response.data.weekly).toHaveLength(6);
    expect(response.data.gap).toBe(1.5);
    expect(response.data.targetCefr).toBe('C1');
    expect(response.data.assumptions.length).toBeGreaterThanOrEqual(4);
    expect(response.meta.method).toContain('heuristic');
  });

  it('applies defaults and reports deterministic results', async () => {
    const first = await server.json<StudyPlan>('/v1/study-plan?current=6&target=6.5');
    const second = await server.json<StudyPlan>('/v1/study-plan?current=6&target=6.5');
    expect(first.data.weekly).toHaveLength(8);
    expect(second.data).toEqual(first.data);
  });

  it('accepts a focus list', async () => {
    const response = await server.json<StudyPlan>(
      '/v1/study-plan?current=4&target=6.5&focus=writing,speaking',
    );
    expect(response.data.focus).toEqual(['writing', 'speaking']);
    expect(response.data.assumptions[0]).toContain('flagged weak skills');
  });

  it('validates its parameters', async () => {
    expect((await server.json('/v1/study-plan?target=7')).status).toBe(400);
    expect((await server.json('/v1/study-plan?current=7&target=5')).status).toBe(400);
    expect((await server.json('/v1/study-plan?current=6.3&target=7')).status).toBe(400);
    expect((await server.json('/v1/study-plan?current=6&target=7&weeks=30')).status).toBe(400);
    expect((await server.json('/v1/study-plan?current=6&target=7&hours=0')).status).toBe(400);
    expect((await server.json('/v1/study-plan?current=6&target=7&focus=astrology')).status).toBe(400);
    expect((await server.json('/v1/study-plan?current=6&target=7&weeks=abc')).status).toBe(400);
  });
});
