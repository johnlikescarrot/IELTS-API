import { PassThrough } from 'node:stream';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequestHandler } from '../src/app.js';
import { MAX_JSON_BODY_BYTES } from '../src/lib/body.js';
import { HttpError } from '../src/lib/errors.js';
import { createReviewCard } from '../src/lib/review.js';
import { matchRoute } from '../src/lib/route.js';
import { startTestServer } from './helpers/server.js';
import type { IncomingMessage, ServerResponse } from 'node:http';
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
const input = { card: createReviewCard('private-card-id', '2026-09-07'), grade: 4, on: '2026-09-07' };
const post = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

describe('private computation transport', () => {
  it.each([
    { method: 'POST', body: JSON.stringify(input) },
    { ...post(input), headers: { 'content-type': 'text/plain' } },
    { ...post(input), headers: { 'content-type': 'application/json; charset=latin1' } },
    { ...post(input), headers: { 'content-type': 'application/json', 'content-encoding': 'gzip' } },
  ])('rejects non-JSON or compressed uploads: %j', async (request) => {
    const response = await server.request('/v1/study/review', request);
    expect(response.status).toBe(415);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it.each(['', '{', '"text"'])('rejects invalid JSON or a non-object body: %s', async (body) => {
    const response = await server.request('/v1/study/review', { ...post(input), body });
    expect(response.status).toBe(400);
  });

  it('rejects oversized uploads with a bounded error, closes the connection and remains healthy', async () => {
    const response = await server.request('/v1/study/review', {
      ...post(input),
      body: 'x'.repeat(MAX_JSON_BODY_BYTES + 1),
    });
    expect(response.status).toBe(413);
    expect(response.headers.get('connection')).toBe('close');
    expect((await response.text()).length).toBeLessThan(1000);
    expect((await server.request('/health')).status).toBe(200);
  });

  it('never logs JSON bodies or query strings, including rejected query submissions', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    await server.request('/v1/study/review', post(input));
    const rejected = await server.request('/v1/study/review?private=do-not-log-query', post(input));
    expect(rejected.status).toBe(400);
    await server.request('/v1/vocabulary?q=do-not-log-query');
    const logs = spy.mock.calls.flat().join('\n');
    expect(logs).toContain('POST /v1/study/review 200');
    expect(logs).not.toContain('private-card-id');
    expect(logs).not.toContain('do-not-log-query');
    expect(logs).not.toContain('2026-09-07');
  });

  it('returns a private 404 for a POST to an unknown route, and an empty error body for HEAD', async () => {
    const missing = await server.request('/missing', post(input));
    expect(missing.status).toBe(404);
    expect(missing.headers.get('cache-control')).toBe('no-store');
    const head = await server.request('/v1/study/review', { method: 'HEAD' });
    expect(head.status).toBe(405);
    expect(await head.text()).toBe('');
  });

  it('rejects malformed path encodings without a server error', async () => {
    expect((await server.request('/v1/vocabulary/%FF')).status).toBe(400);
  });

  it('dispatches different methods at the same path and advertises the correct Allow header', async () => {
    const routes = [
      {
        method: 'GET' as const,
        path: '/shared',
        versioned: false,
        summary: 'get',
        handler: () => ({ data: 'GET' }),
      },
      {
        method: 'POST' as const,
        path: '/shared',
        versioned: false,
        summary: 'post',
        handler: () => ({ raw: { contentType: 'text/plain', body: 'POST' } }),
      },
    ];
    const custom = await startTestServer({ routes });
    try {
      expect(matchRoute(routes, ['shared'], 'POST')?.route.method).toBe('POST');
      expect(matchRoute([routes[0]!], ['shared'], 'POST')).toBeUndefined();
      const response = await custom.request('/shared', post({}));
      expect(await response.text()).toBe('POST');
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect((await custom.json('/shared')).data).toBe('GET');
      const wrong = await custom.request('/shared', { method: 'PATCH' });
      expect(wrong.headers.get('allow')).toBe('GET, HEAD, POST, OPTIONS');
    } finally {
      await custom.close();
    }
  });

  it('does not leak submitted data through unexpected exception messages', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const custom = await startTestServer({
      routes: [
        {
          method: 'POST',
          path: '/broken',
          versioned: false,
          summary: 'test unexpected errors',
          handler: () => {
            throw new Error('private-card-id');
          },
        },
      ],
    });
    try {
      const response = await custom.request('/broken', post(input));
      expect(response.status).toBe(500);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(await response.text()).not.toContain('private-card-id');
      expect(spy.mock.calls.flat().join('\n')).not.toContain('private-card-id');
    } finally {
      await custom.close();
    }
  });

  it('handles custom 405 errors even when a handler did not supply Allow details', async () => {
    const custom = await startTestServer({
      routes: [
        {
          method: 'GET',
          path: '/custom',
          versioned: false,
          summary: 'custom error',
          handler: () => {
            throw new HttpError(405, 'method_not_allowed', 'No method');
          },
        },
      ],
    });
    try {
      expect((await custom.request('/custom')).headers.get('allow')).toBe('GET, HEAD, POST, OPTIONS');
    } finally {
      await custom.close();
    }
  });
});

describe('dispatcher failure boundaries', () => {
  function response(): { res: ServerResponse; statuses: number[]; chunks: Buffer[] } {
    const statuses: number[] = [];
    const chunks: Buffer[] = [];
    const res = {
      writeHead(status: number) {
        statuses.push(status);
        return res;
      },
      end(chunk?: Buffer) {
        if (chunk !== undefined) chunks.push(chunk);
        return res;
      },
    } as unknown as ServerResponse;
    return { res, statuses, chunks };
  }

  it('translates an invalid Host/URL into an error instead of rejecting the listener promise', async () => {
    const handler = createRequestHandler();
    const capture = response();
    await handler({ method: 'GET', headers: { host: '%%%' }, url: '/' } as IncomingMessage, capture.res);
    expect(capture.statuses).toEqual([400]);
  });

  it('translates body timeout into a 408 envelope', async () => {
    vi.useFakeTimers();
    try {
      const req = new PassThrough() as unknown as IncomingMessage;
      req.method = 'POST';
      req.url = '/v1/study/review';
      req.headers = { 'content-type': 'application/json' };
      const capture = response();
      const completion = createRequestHandler()(req, capture.res);
      await vi.advanceTimersByTimeAsync(10000);
      await completion;
      expect(capture.statuses).toEqual([408]);
      expect(JSON.parse(Buffer.concat(capture.chunks).toString('utf8'))).toMatchObject({
        status: 408,
        meta: { error: { code: 'request_timeout' } },
      });
      (req as unknown as PassThrough).end();
    } finally {
      vi.useRealTimers();
    }
  });
});
