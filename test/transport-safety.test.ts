import { describe, expect, it } from 'vitest';
import { createRequestHandler } from '../src/app.js';

function invoke(url: string, host: string, method = 'GET') {
  const handler = createRequestHandler();
  let status = 0;
  let headers: Record<string, string> = {};
  let body = '';
  const response = {
    writeHead(code: number, values: Record<string, string>) {
      status = code;
      headers = values;
    },
    end(chunk?: Buffer) {
      body = chunk?.toString('utf8') ?? '';
    },
  };
  const request = {
    url,
    method,
    headers: { host, 'accept-encoding': 'identity', 'access-control-request-headers': 'if-none-match' },
  };
  handler(request as Parameters<typeof handler>[0], response as unknown as Parameters<typeof handler>[1]);
  return { status, headers, body };
}

describe('public HTTP transport safety', () => {
  it.each([
    ['/health', 'bad host'],
    ['http://[invalid', 'localhost'],
    ['/v1/practice/items/%ZZ', 'localhost'],
    ['/v1/vocabulary/%E0%A4%A', 'localhost'],
  ])('returns 400 instead of throwing or returning 500 for %s / %s', (url, host) => {
    const response = invoke(url, host);
    expect(response.status).toBe(400);
    expect(JSON.parse(response.body)).toMatchObject({
      status: 400,
      data: null,
      meta: { error: { code: 'bad_request' } },
    });
  });

  it('allows browser conditional-request preflights without authentication', () => {
    const response = invoke('/v1/practice/export', 'example.e2b.app', 'OPTIONS');
    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('*');
    expect(response.headers['access-control-allow-headers']).toContain('if-none-match');
    expect(response.body).toBe('');
  });

  it('varies even uncompressed representations by encoding and accepts preview hosts', () => {
    const response = invoke('/v1/practice', '3000-preview.e2b.app');
    expect(response.status).toBe(200);
    expect(response.headers.vary).toBe('accept-encoding');
    expect(response.headers['content-encoding']).toBeUndefined();
  });
});
