import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequestHandler } from '../src/app.js';

function invoke(url: string, method = 'GET', host = '[') {
  const handler = createRequestHandler();
  const writeHead = vi.fn();
  const end = vi.fn();
  const req = { url, method, headers: { host } } as unknown as Parameters<typeof handler>[0];
  const res = { writeHead, end } as unknown as Parameters<typeof handler>[1];
  expect(() => handler(req, res)).not.toThrow();
  return { writeHead, end };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('untrusted request-target handling', () => {
  it('does not use the Host header as a URL parser base', () => {
    const response = invoke('/health');
    expect(response.writeHead.mock.calls[0]?.[0]).toBe(200);
    expect(JSON.parse(String(response.end.mock.calls[0]?.[0]))).toMatchObject({ status: 200 });
  });

  it.each(['http://[', '//['])('returns a non-cacheable JSON 400 for malformed target %s', (target) => {
    const response = invoke(target);
    expect(response.writeHead.mock.calls[0]?.[0]).toBe(400);
    expect(response.writeHead.mock.calls[0]?.[1]).toMatchObject({ 'cache-control': 'no-store' });
    expect(JSON.parse(String(response.end.mock.calls[0]?.[0]))).toMatchObject({
      status: 400,
      data: null,
      meta: { error: { code: 'bad_request' } },
    });
  });

  it.each(['%', '%E0%A4%A', '%FF'])('translates invalid encoded IDs into client errors: %s', (id) => {
    const response = invoke(`/v1/practice/${id}`, 'GET', 'valid.example');
    expect(response.writeHead.mock.calls[0]?.[0]).toBe(400);
  });

  it('does not write an error body for HEAD', () => {
    const response = invoke('http://[', 'HEAD');
    expect(response.writeHead.mock.calls[0]?.[0]).toBe(400);
    expect(response.end).toHaveBeenCalledWith();
  });

  it('keeps genuine server errors private and non-cacheable for HEAD as well', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const handler = createRequestHandler({
      routes: [
        {
          method: 'GET',
          path: '/broken',
          versioned: false,
          summary: 'test failure',
          handler: () => {
            throw new Error('private diagnostic');
          },
        },
      ],
    });
    const writeHead = vi.fn();
    const end = vi.fn();
    handler(
      { url: '/broken', method: 'HEAD', headers: {} } as unknown as Parameters<typeof handler>[0],
      { writeHead, end } as unknown as Parameters<typeof handler>[1],
    );
    expect(writeHead.mock.calls[0]?.[0]).toBe(500);
    expect(writeHead.mock.calls[0]?.[1]).toMatchObject({ 'cache-control': 'no-store' });
    expect(end).toHaveBeenCalledWith();
  });
});
