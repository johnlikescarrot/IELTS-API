import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { Resource } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/resources', () => {
  it('returns free resources only', async () => {
    const response = await server.json<Resource[]>('/v1/resources');
    expect(response.status).toBe(200);
    expect(response.data.length).toBeGreaterThan(20);
    expect(response.meta.freeOnly).toBe(true);
    expect(response.data.every((resource) => resource.free)).toBe(true);
    expect(response.meta.types).toContain('dataset');
  });

  it('filters by type', async () => {
    const response = await server.json<Resource[]>('/v1/resources?type=official');
    expect(response.data.every((resource) => resource.type === 'official')).toBe(true);
    expect(response.meta.type).toBe('official');
  });

  it('searches by name and description', async () => {
    const response = await server.json<Resource[]>('/v1/resources?q=vocabulary');
    expect(response.data.length).toBeGreaterThan(0);
  });

  it('paginates', async () => {
    const response = await server.json<Resource[]>('/v1/resources?limit=2&offset=1');
    expect(response.data).toHaveLength(2);
    expect(response.meta.offset).toBe(1);
  });

  it('rejects unknown types', async () => {
    expect((await server.json('/v1/resources?type=paid')).status).toBe(400);
  });
});
