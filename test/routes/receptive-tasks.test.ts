import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startTestServer } from '../helpers/server.js';
import type { TestServer } from '../helpers/server.js';
import type { ReceptiveTask } from '../../src/types.js';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.close();
});

describe('receptive-task endpoints', () => {
  it.each([
    ['reading', 11, 'academic'],
    ['listening', 6, 'academic-and-general-training'],
  ])('serves original %s guidance with scope, provenance and caveats', async (skill, count, scope) => {
    const response = await server.json<ReceptiveTask[]>(`/v1/tasks/${skill}`);
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(Number(count));
    expect(response.meta.count).toBe(count);
    expect(response.meta.scope).toBe(scope);
    expect(response.meta.license).toBe('CC-BY-4.0');
    expect(response.meta.reviewedOn).toBe('2026-09-05');
    expect(response.meta.note).toContain('not official marking rules');
  });

  it('filters exact types and text and returns a genuine empty selection', async () => {
    const response = await server.json<ReceptiveTask[]>(
      '/v1/tasks/reading?type=reading-matching-headings&q=paragraph',
    );
    expect(response.data.map((item) => item.id)).toEqual(['reading-matching-headings']);
    expect((await server.json<ReceptiveTask[]>('/v1/tasks/listening?q=not-a-real-task')).data).toEqual([]);
  });

  it.each([
    'type=invalid',
    'type=reading-matching-headings&type=reading-short-answer',
    'q=a&q=b',
    'module=general-training',
    'q=' + 'x'.repeat(201),
  ])('rejects ambiguous or unsupported controls: %s', async (query) => {
    expect((await server.json(`/v1/tasks/reading?${query}`)).status).toBe(400);
  });
});
