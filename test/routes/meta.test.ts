import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';
import { DOMAIN_ROUTES } from '../../src/routes/index.js';

import type { TestServer } from '../helpers/server.js';
import type { RouteInfo } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /', () => {
  it('describes the service and its datasets', async () => {
    const response = await server.json<{
      name: string;
      authentication: string;
      licenses: { code: string; data: string };
      datasets: Record<string, number>;
      endpoints: Record<string, string>;
    }>('/');
    expect(response.status).toBe(200);
    expect(response.data.name).toBe('ielts-api');
    expect(response.data.authentication).toBe('none');
    expect(response.data.licenses).toEqual({ code: 'MIT', data: 'CC BY 4.0' });
    expect(response.data.datasets.vocabularyWords).toBe(4174);
    expect(response.data.datasets.practiceItems).toBe(1852);
    expect(response.data.datasets.practiceCollections).toBe(4);
    expect(response.data.endpoints.documentation).toBe('/docs');
    expect(response.meta.count).toBe(DOMAIN_ROUTES.length);
  });
});

describe('GET /v1', () => {
  it('lists every versioned endpoint', async () => {
    const response = await server.json<RouteInfo[]>('/v1');
    expect(response.data).toHaveLength(DOMAIN_ROUTES.length);
    expect(response.data.every((route) => route.path.startsWith('/v1'))).toBe(true);
    expect(response.meta.version).toBe('v1');
    expect(response.meta.authentication).toBe('none');
  });
});

describe('GET /health', () => {
  it('reports liveness and dataset sizes', async () => {
    const response = await server.json<{ status: string; datasets: Record<string, number> }>('/health');
    expect(response.data.status).toBe('ok');
    expect(response.data.datasets.corpusFiles).toBe(404);
    expect(response.meta.checks).toContain('vocabulary-dataset');
    expect(response.meta.checks).toContain('practice-index');
  });
});

describe('GET /openapi.json', () => {
  it('serves a valid OpenAPI document', async () => {
    const response = await fetch(`${server.base}/openapi.json`);
    const document = (await response.json()) as { openapi: string; paths: Record<string, unknown> };
    expect(response.status).toBe(200);
    expect(document.openapi).toBe('3.1.0');
    expect(Object.keys(document.paths).length).toBeGreaterThan(15);
    expect(response.headers.get('content-type')).toContain('application/json');
  });
});

describe('GET /docs', () => {
  it('serves the documentation page', async () => {
    const response = await fetch(`${server.base}/docs`);
    const body = await response.text();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(body).toContain('IELTS API');
    expect(body).toContain('/v1/vocabulary');
  });
});
