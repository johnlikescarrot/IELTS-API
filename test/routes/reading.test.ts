import { request as httpRequest } from 'node:http';
import { createConnection } from 'node:net';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { READING_DATASET } from '../../src/data/reading.js';
import { MAX_JSON_BODY_BYTES } from '../../src/lib/body.js';
import { startTestServer } from '../helpers/server.js';

import type { ReadingExercise, ReadingGrade } from '../../src/reading-types.js';
import type { TestServer } from '../helpers/server.js';

let server: TestServer;
const gradePath = '/v1/reading/library-of-things/grade';
const submission = { answers: [{ questionId: 'q1', answer: 'B' }] };
function post(body: unknown = submission): RequestInit {
  return { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
}

beforeAll(async () => {
  server = await startTestServer({ log: true });
});
afterAll(async () => {
  await server.close();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('original reading HTTP contract', () => {
  it.each([
    'https://untrusted.example/v1/reading',
    '//untrusted.example/v1/reading',
    '/\\[',
    '/\\untrusted.example/',
  ])('rejects unsafe request targets without escaping the error boundary: %s', async (target) => {
    const status = await new Promise<number>((resolve, reject) => {
      const req = httpRequest(server.base, { path: target }, (res) => {
        res.resume();
        res.on('end', () => resolve(res.statusCode!));
      });
      req.on('error', reject);
      req.end();
    });
    expect(status).toBe(400);
    expect((await server.json('/health')).status).toBe(200);
  });

  it('advertises a proxy-safe OpenAPI server without trusting Host', async () => {
    const response = await server.request('/openapi.json', { headers: { host: '[invalid-host' } });
    expect(response.status).toBe(200);
    expect(await response.json()).toHaveProperty('servers', [{ url: '/', description: 'This instance' }]);
  });

  it('lists summaries, actual facets and SHA-256 provenance without questions or solutions', async () => {
    const result = await server.json<{ id: string; questionCount: number }[]>('/v1/reading');
    expect(result.status).toBe(200);
    expect(result.data).toHaveLength(6);
    expect(result.data[0]!.questionCount).toBe(6);
    expect(result.data[0]).not.toHaveProperty('paragraphs');
    expect(result.data[0]).not.toHaveProperty('questions');
    expect(JSON.stringify(result)).not.toContain('acceptedAnswers');
    expect(result.meta).toMatchObject({
      total: 6,
      limit: 20,
      offset: 0,
      hasMore: false,
      dataset: READING_DATASET,
    });
    const stats = await server.json('/v1/reading/stats');
    expect(stats.data).toMatchObject({ exercises: 6, questions: 36 });
  });

  it('supports filters, strict pagination and empty result sets', async () => {
    const result = await server.json<{ level: string }[]>('/v1/reading?level=advanced&limit=1&offset=1');
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.level).toBe('advanced');
    expect(result.meta).toMatchObject({ total: 2, offset: 1, limit: 1, hasMore: false });
    expect((await server.json('/v1/reading?limit=1')).meta.hasMore).toBe(true);
    expect((await server.json('/v1/reading?offset=1000')).data).toEqual([]);
    expect((await server.json('/v1/reading?level=advanced&topic=science&q=rainfall')).meta.total).toBe(1);
    expect((await server.json('/v1/reading?level=foundation&topic=science')).data).toEqual([]);
    expect((await server.json('/v1/reading?q=no-such-topic')).meta.total).toBe(0);
  });

  it.each([
    'level=A1',
    'topic=unknown',
    'limit=0',
    'limit=101',
    'limit=1.5',
    'offset=-1',
    'offset=1001',
    'level=foundation&level=advanced',
    'q=a&q=b',
    'limit=2&limit=3',
  ])('rejects invalid query parameters: %s', async (query) => {
    expect((await server.json(`/v1/reading?${query}`)).status).toBe(400);
  });

  it('returns reproducible samples without replacement, and reports undersized pools honestly', async () => {
    const path = '/v1/reading/random?seed=study-2026&count=4';
    const one = await server.json<ReadingExercise[]>(path);
    const two = await server.json<ReadingExercise[]>(path);
    expect(one).toEqual(two);
    expect(one.data).toHaveLength(4);
    expect(new Set(one.data.map((item) => item.id)).size).toBe(4);
    expect(JSON.stringify(one)).not.toContain('acceptedAnswers');
    expect(one.meta).toMatchObject({ count: 4, requestedCount: 4, seed: 'study-2026', available: 6 });
    const small = await server.json<ReadingExercise[]>('/v1/reading/random?level=foundation&count=6');
    expect(small.data).toHaveLength(2);
    expect(small.meta).toMatchObject({ count: 2, requestedCount: 6, available: 2 });
    expect((await server.json('/v1/reading/random')).meta).toMatchObject({
      count: 1,
      seed: 'ielts-api-reading',
    });
    expect((await server.json('/v1/reading/random?q=missing-everywhere')).data).toEqual([]);
    expect((await server.json('/v1/reading/random?count=7')).status).toBe(400);
    expect((await server.json('/v1/reading/random?seed=a&seed=b')).status).toBe(400);
  });

  it('serves public exercises with ETags, HEAD and no answer key', async () => {
    const path = '/v1/reading/library-of-things';
    const first = await server.request(path);
    expect(first.status).toBe(200);
    expect(first.headers.get('access-control-allow-origin')).toBe('*');
    expect(first.headers.get('set-cookie')).toBeNull();
    const body = (await first.json()) as { data: ReadingExercise };
    expect(body.data.paragraphs).toHaveLength(2);
    expect(body.data.questions).toHaveLength(6);
    expect(JSON.stringify(body)).not.toContain('acceptedAnswers');
    const cached = await server.request(path, { headers: { 'if-none-match': first.headers.get('etag')! } });
    expect(cached.status).toBe(304);
    const head = await server.request(path, { method: 'HEAD' });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe('');
    expect((await server.json('/v1/reading/nonexistent')).status).toBe(404);
    expect((await server.json('/v1/reading/%ZZ')).status).toBe(400);
  });

  it('grades without authentication, state, cookies or submitted-answer echoing', async () => {
    const result = await server.json<ReadingGrade>(gradePath, post());
    expect(result.status).toBe(200);
    expect(result.data).toMatchObject({ correct: 1, total: 6, unanswered: 5, percentage: 16.67 });
    expect(result.data.feedback[0]).toMatchObject({
      questionId: 'q1',
      outcome: 'correct',
      acceptedAnswers: ['B'],
      evidenceParagraphs: [1],
    });
    expect(result.meta.dataset).toEqual(READING_DATASET);
    expect(result.meta.scoring).toContain('not an IELTS band');
    const privateResult = await server.json(
      gradePath,
      post({ answers: [{ questionId: 'q1', answer: 'private-sentinel' }] }),
    );
    expect(JSON.stringify(privateResult)).not.toContain('private-sentinel');
    expect((await server.json(gradePath, post({ answers: [] }))).data).toMatchObject({
      correct: 0,
      unanswered: 6,
    });
  });

  it('never caches grading or error responses, even when If-None-Match is supplied', async () => {
    const first = await server.request(gradePath, post());
    expect(first.headers.get('cache-control')).toBe('no-store');
    expect(first.headers.get('set-cookie')).toBeNull();
    const second = await server.request(gradePath, {
      ...post(),
      headers: { 'content-type': 'application/json', 'if-none-match': first.headers.get('etag')! },
    });
    expect(second.status).toBe(200);
    expect(await first.json()).toEqual(await second.json());
    const invalid = await server.request(gradePath, post({ answers: null }));
    expect(invalid.status).toBe(400);
    expect(invalid.headers.get('cache-control')).toBe('no-store');
    expect(invalid.headers.get('connection')).toBe('close');
    expect((await server.json('/v1/reading/missing/grade', post())).status).toBe(404);
  });

  it('supports browser preflight without credentials and advertises per-path methods', async () => {
    const preflight = await server.request(gradePath, {
      method: 'OPTIONS',
      headers: {
        origin: 'https://example.edu',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type',
      },
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('access-control-allow-origin')).toBe('*');
    expect(preflight.headers.get('access-control-allow-methods')).toBe('POST, OPTIONS');
    expect(preflight.headers.get('access-control-allow-headers')).toContain('content-type');
    expect(preflight.headers.get('access-control-allow-credentials')).toBeNull();
    const wrongMethod = await server.request(gradePath);
    expect(wrongMethod.status).toBe(405);
    expect(wrongMethod.headers.get('allow')).toBe('POST, OPTIONS');
    const head = await server.request(gradePath, { method: 'HEAD' });
    expect(head.status).toBe(405);
    expect(await head.text()).toBe('');
    const head404 = await server.request('/v1/reading/missing', { method: 'HEAD' });
    expect(head404.status).toBe(404);
    expect(await head404.text()).toBe('');
    const readOnly = await server.request('/v1/reading', post());
    expect(readOnly.status).toBe(405);
    expect(readOnly.headers.get('allow')).toBe('GET, HEAD, OPTIONS');
  });

  it('rejects invalid media, JSON and oversized bodies with structured errors', async () => {
    const unsupported = await server.request(gradePath, { method: 'POST', body: '{}' });
    expect(unsupported.status).toBe(415);
    const malformed = await server.json(gradePath, { ...post(), body: '{"private-sentinel":' });
    expect(malformed.status).toBe(400);
    expect(JSON.stringify(malformed)).not.toContain('private-sentinel');
    expect(
      (await server.request(gradePath, { ...post(), body: 'x'.repeat(MAX_JSON_BODY_BYTES + 1) })).status,
    ).toBe(413);
  });

  it('enforces limits on real chunked requests, not just Content-Length', async () => {
    const result = await new Promise<{ status: number; body: string }>((resolve, reject) => {
      const req = httpRequest(
        `${server.base}${gradePath}`,
        { method: 'POST', headers: { 'content-type': 'application/json' } },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () =>
            resolve({ status: res.statusCode!, body: Buffer.concat(chunks).toString('utf8') }),
          );
        },
      );
      req.on('error', reject);
      req.write('{');
      req.end('x'.repeat(MAX_JSON_BODY_BYTES));
    });
    expect(result.status).toBe(413);
    expect(JSON.parse(result.body)).toMatchObject({
      status: 413,
      data: null,
      meta: { error: { code: 'payload_too_large' } },
    });
  });

  it('survives clients disconnecting during a submission', async () => {
    const port = Number(new URL(server.base).port);
    await new Promise<void>((resolve, reject) => {
      const socket = createConnection({ host: '127.0.0.1', port }, () => {
        socket.write(
          `POST ${gradePath} HTTP/1.1\r\nHost: localhost\r\nContent-Type: application/json\r\nContent-Length: 100\r\n\r\n{`,
        );
        socket.end();
      });
      socket.on('data', () => undefined);
      socket.on('error', reject);
      socket.on('close', () => resolve());
    });
    expect((await server.json('/health')).status).toBe(200);
  });

  it('logs actual status codes but never query strings or submission text', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    await server.request('/v1/reading?q=private-query');
    await server.request(gradePath, post({ answers: [{ questionId: 'q1', answer: 'private-body' }] }));
    await server.request(gradePath, { method: 'OPTIONS' });
    const first = await server.request('/v1/reading');
    await server.request('/v1/reading', { headers: { 'if-none-match': first.headers.get('etag')! } });
    const log = spy.mock.calls.flat().join('\n');
    expect(log).toContain('OPTIONS /v1/reading/library-of-things/grade 204');
    expect(log).toContain('GET /v1/reading 304');
    expect(log).not.toContain('private-query');
    expect(log).not.toContain('private-body');
  });
});
