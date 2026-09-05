import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { IeltsTheme } from '../../src/types.js';

describe('theme routes (/v1/themes)', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startTestServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('lists themes with pagination and envelope metadata', async () => {
    const res = await server.json<IeltsTheme[]>('/v1/themes?limit=5&offset=0');
    expect(res.status).toBe(200);
    expect(res.data).toHaveLength(5);
    expect(res.meta.total).toBe(50);
    expect(res.meta.limit).toBe(5);
    expect(res.meta.offset).toBe(0);
    expect(res.meta.hasMore).toBe(true);
  });

  it('filters themes by category, skill, question type, and query', async () => {
    const res = await server.json<IeltsTheme[]>(
      '/v1/themes?category=education&skill=writing&type=opinion&q=university',
    );
    expect(res.status).toBe(200);
    expect(res.data.length).toBeGreaterThan(0);
    expect(res.data[0]?.category).toBe('education');
    expect(res.data[0]?.skills).toContain('writing');
    expect(res.data[0]?.questionTypes).toContain('opinion');
  });

  it('returns aggregate statistics for the theme bank', async () => {
    const res = await server.json<Record<string, unknown>>('/v1/themes/stats');
    expect(res.status).toBe(200);
    expect(res.data.themes).toBe(50);
    expect(res.data.totalPrompts).toBe(150);
    expect(res.meta.meta).toBeDefined();
  });

  it('returns a seeded random sample', async () => {
    const res1 = await server.json<IeltsTheme[]>('/v1/themes/random?count=3&seed=test-seed');
    const res2 = await server.json<IeltsTheme[]>('/v1/themes/random?count=3&seed=test-seed');
    expect(res1.status).toBe(200);
    expect(res1.data).toHaveLength(3);
    expect(res1.data).toEqual(res2.data);
    expect(res1.meta.seed).toBe('test-seed');

    // Default count and seed
    const resDefault = await server.json<IeltsTheme[]>('/v1/themes/random');
    expect(resDefault.status).toBe(200);
    expect(resDefault.data).toHaveLength(3);
  });

  it('looks up a theme by id', async () => {
    const res = await server.json<IeltsTheme>('/v1/themes/th-001');
    expect(res.status).toBe(200);
    expect(res.data.id).toBe('th-001');
    expect(res.data.rank).toBe(1);
    expect(res.meta.id).toBe('th-001');
  });

  it('returns 404 for unknown theme id', async () => {
    const res = await server.json('/v1/themes/th-999');
    expect(res.status).toBe(404);
  });
});
