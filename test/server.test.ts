import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CORS_HEADERS, createServer } from '../src/server.ts';

const server = createServer();
let base = '';

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as AddressInfo;
  base = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('http server', () => {
  it('serves JSON with permissive CORS headers', async () => {
    const response = await fetch(`${base}/health`);
    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(await response.json()).toMatchObject({ status: 'ok' });
    expect(CORS_HEADERS['access-control-max-age']).toBe('86400');
  });

  it('answers preflight requests', async () => {
    const response = await fetch(`${base}/health`, { method: 'OPTIONS' });
    expect(response.status).toBe(204);
  });

  it('accepts POST bodies', async () => {
    const response = await fetch(`${base}/v1/text/metrics`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'Two words here.' }),
    });
    const body = (await response.json()) as { words: number };
    expect(body.words).toBe(3);
  });

  it('rejects malformed JSON bodies', async () => {
    const response = await fetch(`${base}/v1/text/metrics`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not json',
    });
    expect(response.status).toBe(400);
  });

  it('treats an empty body as undefined', async () => {
    const response = await fetch(`${base}/v1/text/metrics`, { method: 'POST' });
    expect(response.status).toBe(400);
  });

  it('returns headers but no body for HEAD', async () => {
    const response = await fetch(`${base}/health`, { method: 'HEAD' });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('');
  });

  it('returns 404 JSON for unknown paths', async () => {
    const response = await fetch(`${base}/does-not-exist`);
    expect(response.status).toBe(404);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('NOT_FOUND');
  });
});
