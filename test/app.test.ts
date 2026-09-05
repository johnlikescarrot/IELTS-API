import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { createRequestHandler } from '../src/app.js';
import { startApiServer } from '../src/server.js';
import { HttpError } from '../src/lib/errors.js';
import { API_VERSION } from '../src/version.js';
import { startTestServer } from './helpers/server.js';

import type { Server } from 'node:http';
import type { TestServer } from './helpers/server.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer({ log: true });
});

afterAll(async () => {
  await server.close();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('request handling', () => {
  it('sets open CORS headers on every response', async () => {
    const response = await server.request('/health');
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('answers HEAD requests with headers but no body', async () => {
    const response = await server.request('/v1/bands', { method: 'HEAD' });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('');
    expect(Number(response.headers.get('content-length'))).toBeGreaterThan(0);
  });

  it('answers OPTIONS requests with 204', async () => {
    const response = await server.request('/v1/bands', { method: 'OPTIONS' });
    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-methods')).toContain('GET');
  });

  it('rejects unsupported methods with 405', async () => {
    for (const method of ['POST', 'PUT', 'DELETE', 'PATCH']) {
      const response = await server.request('/v1/bands', { method });
      expect(response.status).toBe(405);
      const body = (await response.json()) as { meta: { error: { code: string } } };
      expect(body.meta.error.code).toBe('method_not_allowed');
    }
  });

  it('advertises POST in the preflight response', async () => {
    const response = await server.request('/v1/analyze/readability', { method: 'OPTIONS' });
    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-methods')).toContain('POST');
    expect(response.headers.get('access-control-allow-headers')).toContain('content-type');
  });

  it('enforces the request-body size limit', async () => {
    const small = await startTestServer({ maxBodyBytes: 16 });
    try {
      const response = await small.request('/v1/analyze/readability', {
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body: 'x'.repeat(4096),
      });
      expect(response.status).toBe(413);
      const body = (await response.json()) as { meta: { error: { code: string } } };
      expect(body.meta.error.code).toBe('payload_too_large');
    } finally {
      await small.close();
    }
  });

  it('returns 404 with a pointer to the documentation', async () => {
    const response = await server.json('/does/not/exist');
    expect(response.status).toBe(404);
    expect((response.meta.error as { details: Record<string, string> }).details.documentation).toBe('/docs');
  });

  it('sends 304 when the client already has the representation', async () => {
    const first = await server.request('/v1/bands');
    const etag = first.headers.get('etag');
    expect(etag).toBeTruthy();
    const second = await server.request('/v1/bands', { headers: { 'if-none-match': etag ?? '' } });
    expect(second.status).toBe(304);
  });

  it('compresses large responses when gzip is accepted', async () => {
    const response = await server.request('/openapi.json', { headers: { 'accept-encoding': 'gzip' } });
    expect(response.headers.get('content-encoding')).toBe('gzip');
    expect(response.headers.get('vary')).toBe('accept-encoding');
    // fetch decompresses transparently; the header proves the server gzipped it.
    expect(await response.text()).toContain('openapi');
  });

  it('leaves small responses uncompressed', async () => {
    const response = await server.request('/health', { headers: { 'accept-encoding': 'gzip' } });
    expect(response.headers.get('content-encoding')).toBeNull();
  });

  it('adds the endpoint to the envelope metadata and an x-endpoint header', async () => {
    const response = await server.request('/v1/bands');
    expect(response.headers.get('x-endpoint')).toBe('/v1/bands');
    const body = (await response.json()) as { meta: { endpoint: string; version: string } };
    expect(body.meta.endpoint).toBe('/v1/bands');
    expect(body.meta.version).toBe(API_VERSION);
  });
});

describe('the handler with a minimal request', () => {
  it('defaults method, path and host when the request omits them', async () => {
    const handler = createRequestHandler({ routes: [] });
    const chunks: Buffer[] = [];
    const res = {
      writeHead() {
        return res;
      },
      end(chunk?: Buffer) {
        if (chunk !== undefined) {
          chunks.push(chunk);
        }
        return res;
      },
    } as unknown as Parameters<typeof handler>[1];
    handler({ headers: {} } as unknown as Parameters<typeof handler>[0], res);
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { status: number };
    expect(body.status).toBe(404);
  });
});

describe('error handling', () => {
  const start = async (routes: Parameters<typeof createRequestHandler>[0]) => {
    const custom = await startApiServer('127.0.0.1', 0, routes);
    return custom;
  };

  const close = (instance: Server) =>
    new Promise<void>((resolve, reject) => {
      instance.close((error) => (error === undefined ? resolve() : reject(error)));
    });

  it('translates HttpErrors into problem envelopes', async () => {
    const instance = await start({
      routes: [
        {
          method: 'GET',
          path: '/boom',
          versioned: false,
          summary: 'throws',
          handler: () => {
            throw new HttpError(418, 'teapot', 'I am a teapot', { brew: 'tea' });
          },
        },
      ],
    });
    const { port } = instance.address() as { port: number };
    const response = await fetch(`http://127.0.0.1:${port}/boom`);
    expect(response.status).toBe(418);
    const body = (await response.json()) as {
      meta: { error: { code: string; details: Record<string, string> } };
    };
    expect(body.meta.error.code).toBe('teapot');
    expect(body.meta.error.details.brew).toBe('tea');
    await close(instance);
  });

  it('converts unexpected errors into 500 responses', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const instance = await start({
      routes: [
        {
          method: 'GET',
          path: '/broken',
          versioned: false,
          summary: 'throws a non-HTTP error',
          handler: () => {
            throw new Error('kaboom');
          },
        },
      ],
    });
    const { port } = instance.address() as { port: number };
    const response = await fetch(`http://127.0.0.1:${port}/broken`);
    expect(response.status).toBe(500);
    const body = (await response.json()) as { meta: { error: { code: string } } };
    expect(body.meta.error.code).toBe('internal_error');
    expect(spy).toHaveBeenCalled();
    await close(instance);
  });

  it('handles thrown non-Error values too', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const instance = await start({
      routes: [
        {
          method: 'GET',
          path: '/string-throw',
          versioned: false,
          summary: 'throws a string',
          handler: () => {
            throw 'plain string';
          },
        },
      ],
    });
    const { port } = instance.address() as { port: number };
    const response = await fetch(`http://127.0.0.1:${port}/string-throw`);
    expect(response.status).toBe(500);
    await close(instance);
  });
});

describe('logging', () => {
  it('logs each request when enabled', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    await server.request('/health');
    expect(spy).toHaveBeenCalled();
    const line = spy.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(line).toContain('GET /health 200');
  });

  it('does not log by default', async () => {
    const quiet = await startTestServer();
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    await quiet.request('/health');
    expect(spy).not.toHaveBeenCalled();
    await quiet.close();
  });
});
