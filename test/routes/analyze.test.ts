import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';

/**
 * Issue a POST with raw control over headers (fetch insists on setting a
 * content type for string bodies, which hides the "missing content type"
 * branch of the body reader).
 */
async function rawPost(
  base: string,
  path: string,
  body: string,
  headers: Record<string, string>,
): Promise<{ status: number; body: string }> {
  const { request } = await import('node:http');
  const { hostname, port } = new URL(base);
  return new Promise((resolvePromise, rejectPromise) => {
    const req = request(
      {
        hostname,
        port,
        path,
        method: 'POST',
        headers: { ...headers, 'content-length': Buffer.byteLength(body) },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () =>
          resolvePromise({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') }),
        );
      },
    );
    req.on('error', rejectPromise);
    req.end(body);
  });
}

const ESSAY = `Writing Task 2 asks for a discursive essay. Universities shape the minds that shape economies. Graduates who question assumptions drive innovation forward, and their tolerance for dissenting ideas carries research further.

Society therefore benefits when higher education stays accessible, because talent is evenly distributed while opportunity is not.`;

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/analyze/reference', () => {
  it('describes every metric, the tiers and the limits', async () => {
    const response = await server.json('/v1/analyze/reference');
    expect(response.status).toBe(200);
    const data = response.data as {
      engine: string;
      readability: unknown[];
      lexicalDiversity: unknown[];
      vocabularyCoverage: { tiers: unknown[] };
      limits: { getMaxCharacters: number; postMaxCharacters: number };
    };
    expect(data.engine).toBe('ielts-api/text-metrics');
    expect(data.readability).toHaveLength(7);
    expect(data.lexicalDiversity).toHaveLength(4);
    expect(data.vocabularyCoverage.tiers).toHaveLength(3);
    expect(data.limits).toEqual({ getMaxCharacters: 8000, postMaxCharacters: 50000 });
  });
});

describe('GET /v1/analyze/text', () => {
  it('analyses a query-string text end to end', async () => {
    const text = 'The quick brown fox jumps over the lazy dog. The dog barked loudly.';
    const response = await server.json(`/v1/analyze/text?text=${encodeURIComponent(text)}`);
    expect(response.status).toBe(200);
    expect(response.meta.input).toBe('query');
    expect(response.meta.inputCharacters).toBe(text.length);
    const data = response.data as {
      metrics: {
        counts: { words: number; sentences: number };
        readability: { fleschReadingEase: number; consensusGrade: number };
        cefr: string;
      };
      vocabularyCoverage: {
        totalWords: number;
        coverage: number;
        topOutOfList: { word: string; count: number }[];
      };
      bandEstimate: { cefr: string; bandMin: number; bandMax: number; pointEstimate: number; basis: string };
    };
    expect(data.metrics.counts.words).toBe(13);
    expect(data.metrics.counts.sentences).toBe(2);
    expect(data.metrics.readability.fleschReadingEase).toBe(89.61);
    expect(data.metrics.cefr).toBe('A2');
    expect(data.vocabularyCoverage.totalWords).toBe(13);
    expect(data.bandEstimate).toMatchObject({ cefr: 'A2', bandMin: 3, bandMax: 3.5, pointEstimate: 3.5 });
  });

  it('reports null metrics for text without words', async () => {
    const response = await server.json('/v1/analyze/text?text=...');
    expect(response.status).toBe(200);
    const data = response.data as {
      metrics: { readability: unknown; cefr: unknown };
      bandEstimate: unknown;
    };
    expect(data.metrics.readability).toBeNull();
    expect(data.metrics.cefr).toBeNull();
    expect(data.bandEstimate).toBeNull();
  });

  it('rejects a missing text parameter', async () => {
    const response = await server.json('/v1/analyze/text');
    expect(response.status).toBe(400);
    expect((response.meta.error as { code: string }).code).toBe('bad_request');
  });

  it('rejects an over-long text parameter with guidance to use POST', async () => {
    const longText = 'a'.repeat(8001);
    const response = await server.json(`/v1/analyze/text?text=${longText}`);
    expect(response.status).toBe(400);
    const error = response.meta.error as { message: string; details: Record<string, string> };
    expect(error.details.max).toBe('8000');
    expect(error.message).toContain('POST');
  });
});

describe('POST /v1/analyze/text', () => {
  it('analyses a JSON-body text identically to GET', async () => {
    const text = 'The quick brown fox jumps over the lazy dog. The dog barked loudly.';
    const viaGet = await server.json(`/v1/analyze/text?text=${encodeURIComponent(text)}`);
    const viaPost = await server.json('/v1/analyze/text', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    expect(viaPost.status).toBe(200);
    expect(viaPost.meta.input).toBe('body');
    expect(viaPost.data).toEqual(viaGet.data);
  });

  it('accepts text with a charset parameter on the content type', async () => {
    const response = await server.json('/v1/analyze/text', {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ text: 'Hello world.' }),
    });
    expect(response.status).toBe(200);
  });

  it('analyses a longer essay with two paragraphs', async () => {
    const response = await server.json('/v1/analyze/text', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: ESSAY }),
    });
    expect(response.status).toBe(200);
    const data = response.data as { metrics: { counts: { paragraphs: number } } };
    expect(data.metrics.counts.paragraphs).toBe(2);
  });

  it('still applies gzip to POST responses', async () => {
    const response = await server.request('/v1/analyze/text', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'accept-encoding': 'gzip' },
      body: JSON.stringify({ text: ESSAY.repeat(20) }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-encoding')).toBe('gzip');
    const payload = (await response.json()) as { status: number };
    expect(payload.status).toBe(200);
  });

  it('rejects invalid JSON', async () => {
    const response = await server.json('/v1/analyze/text', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not json',
    });
    expect(response.status).toBe(400);
    expect((response.meta.error as { code: string }).code).toBe('bad_request');
  });

  it('rejects an empty body', async () => {
    const response = await server.json('/v1/analyze/text', { method: 'POST' });
    expect(response.status).toBe(400);
  });

  it('rejects non-object bodies', async () => {
    const arrayResponse = await server.json('/v1/analyze/text', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '[]',
    });
    expect(arrayResponse.status).toBe(400);
    expect((arrayResponse.meta.error as { details: Record<string, string> }).details.received).toBe('array');

    const scalarResponse = await server.json('/v1/analyze/text', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '42',
    });
    expect(scalarResponse.status).toBe(400);

    const nullResponse = await server.json('/v1/analyze/text', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'null',
    });
    expect(nullResponse.status).toBe(400);
    expect((nullResponse.meta.error as { details: Record<string, string> }).details.received).toBe('object');
  });

  it('rejects a missing or non-string text field', async () => {
    const missing = await server.json('/v1/analyze/text', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ wrong: 'field' }),
    });
    expect(missing.status).toBe(400);

    const numeric = await server.json('/v1/analyze/text', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 42 }),
    });
    expect(numeric.status).toBe(400);

    const blank = await server.json('/v1/analyze/text', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: '   ' }),
    });
    expect(blank.status).toBe(400);
  });

  it('rejects texts over 50,000 characters', async () => {
    const response = await server.json('/v1/analyze/text', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: `a${' b'.repeat(25000)}/more` }),
    });
    expect(response.status).toBe(400);
    const error = response.meta.error as { details: Record<string, string> };
    expect(error.details.max).toBe('50000');
  });

  it('rejects non-JSON content types with 415', async () => {
    const response = await server.json('/v1/analyze/text', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'plain essay text',
    });
    expect(response.status).toBe(415);
    expect((response.meta.error as { code: string }).code).toBe('unsupported_media_type');
  });

  it('rejects bodies over the 256 KiB limit with 413', async () => {
    const big = JSON.stringify({ text: `x${' padding'.repeat(40000)}` });
    const response = await server.json('/v1/analyze/text', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: big,
    });
    expect(response.status).toBe(413);
    expect((response.meta.error as { code: string }).code).toBe('payload_too_large');
  });

  it('accepts a JSON body with no content-type header (raw HTTP)', async () => {
    const response = await rawPost(
      server.base,
      '/v1/analyze/text',
      JSON.stringify({ text: 'Hello no header.' }),
      {},
    );
    expect(response.status).toBe(200);
    expect(JSON.parse(response.body)).toMatchObject({ status: 200 });
  });
});

describe('method handling on /v1/analyze/text', () => {
  it('answers HEAD using the GET route', async () => {
    const response = await server.request('/v1/analyze/text?text=hello', { method: 'HEAD' });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('');
  });

  it('rejects PUT with the full allow list', async () => {
    const response = await server.json('/v1/analyze/text', { method: 'PUT' });
    expect(response.status).toBe(405);
    expect((response.meta.error as { details: Record<string, string> }).details.allow).toBe(
      'GET, HEAD, POST',
    );
  });

  it('advertises POST in the OPTIONS preflight', async () => {
    const response = await server.request('/v1/analyze/text', { method: 'OPTIONS' });
    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-methods')).toContain('POST');
  });

  it('sets an allow header on every 405', async () => {
    const response = await server.request('/v1/analyze/text', { method: 'DELETE' });
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET, HEAD, POST');
  });
});
