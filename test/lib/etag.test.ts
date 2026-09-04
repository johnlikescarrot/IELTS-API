import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { cacheLong, computeEtag, etagMatches, etagOnSend } from '../../src/lib/etag.js';

function fakeRequest(method: string, ifNoneMatch?: string): FastifyRequest {
  return {
    method,
    headers: ifNoneMatch === undefined ? {} : { 'if-none-match': ifNoneMatch }
  } as unknown as FastifyRequest;
}

function fakeReply(statusCode = 200): {
  reply: FastifyReply;
  headers: Map<string, string>;
  code: ReturnType<typeof vi.fn>;
} {
  const headers = new Map<string, string>();
  const code = vi.fn(() => reply);
  const reply = {
    statusCode,
    header: vi.fn((name: string, value: string) => {
      headers.set(name, value);
      return reply;
    }),
    code
  } as unknown as FastifyReply;
  return { reply, headers, code };
}

describe('computeEtag', () => {
  it('produces a weak ETag matching the SHA-1 of the payload', () => {
    const payload = JSON.stringify({ hello: 'world' });
    const expected = `W/"${createHash('sha1').update(payload).digest('hex')}"`;
    expect(computeEtag(payload)).toBe(expected);
    expect(computeEtag(payload)).toMatch(/^W\/"[0-9a-f]{40}"$/);
  });
});

describe('etagMatches', () => {
  const etag = 'W/"abc123"';

  it('matches the exact weak representation', () => {
    expect(etagMatches('W/"abc123"', etag)).toBe(true);
  });

  it('matches a strong representation of the same digest', () => {
    expect(etagMatches('"abc123"', etag)).toBe(true);
  });

  it('matches when the header is weak but the etag bare form is compared', () => {
    expect(etagMatches('abc123', 'abc123')).toBe(true);
    expect(etagMatches('abc123', etag)).toBe(true);
  });

  it('handles comma-separated lists with whitespace', () => {
    expect(etagMatches('W/"other", W/"abc123"', etag)).toBe(true);
    expect(etagMatches('"x", "y", "abc123"', etag)).toBe(true);
  });

  it('rejects non-matching values', () => {
    expect(etagMatches('"nope"', etag)).toBe(false);
    expect(etagMatches('W/"nope"', etag)).toBe(false);
  });
});

describe('etagOnSend', () => {
  it('passes through non-GET/HEAD requests untouched', async () => {
    const { reply, headers } = fakeReply(200);
    const result = await etagOnSend(fakeRequest('POST'), reply, '{"a":1}');
    expect(result).toBe('{"a":1}');
    expect(headers.has('etag')).toBe(false);
  });

  it('passes through non-200 responses untouched', async () => {
    const { reply, headers } = fakeReply(404);
    const result = await etagOnSend(fakeRequest('GET'), reply, '{"error":{}}');
    expect(result).toBe('{"error":{}}');
    expect(headers.has('etag')).toBe(false);
  });

  it('passes through non-string payloads untouched', async () => {
    const { reply, headers } = fakeReply(200);
    const buffer = Buffer.from('binary');
    const result = await etagOnSend(fakeRequest('GET'), reply, buffer);
    expect(result).toBe(buffer);
    expect(headers.has('etag')).toBe(false);
  });

  it('sets an ETag header on GET 200 string payloads', async () => {
    const { reply, headers } = fakeReply(200);
    const payload = '{"data":123}';
    const result = await etagOnSend(fakeRequest('GET'), reply, payload);
    expect(result).toBe(payload);
    expect(headers.get('etag')).toBe(computeEtag(payload));
  });

  it('sets an ETag header on HEAD requests too', async () => {
    const { reply, headers } = fakeReply(200);
    const result = await etagOnSend(fakeRequest('HEAD'), reply, '{"data":1}');
    expect(result).toBe('{"data":1}');
    expect(headers.get('etag')).toBe(computeEtag('{"data":1}'));
  });

  it('returns an empty payload with 304 when If-None-Match matches (string header)', async () => {
    const payload = '{"data":123}';
    const etag = computeEtag(payload);
    const { reply, headers, code } = fakeReply(200);
    const result = await etagOnSend(fakeRequest('GET', etag), reply, payload);
    expect(result).toBe('');
    expect(code).toHaveBeenCalledWith(304);
    expect(headers.get('etag')).toBe(etag);
  });

  it('handles array-valued If-None-Match headers', async () => {
    const payload = '{"data":123}';
    const etag = computeEtag(payload);
    const { reply, code } = fakeReply(200);
    const request = {
      method: 'GET',
      headers: { 'if-none-match': [etag] }
    } as unknown as FastifyRequest;
    const result = await etagOnSend(request, reply, payload);
    expect(result).toBe('');
    expect(code).toHaveBeenCalledWith(304);
  });

  it('returns 200 when If-None-Match does not match', async () => {
    const payload = '{"data":123}';
    const { reply, code } = fakeReply(200);
    const result = await etagOnSend(fakeRequest('GET', 'W/"different"'), reply, payload);
    expect(result).toBe(payload);
    expect(code).not.toHaveBeenCalled();
  });
});

describe('cacheLong', () => {
  it('sets a long-lived public cache-control header', () => {
    const { reply, headers } = fakeReply(200);
    cacheLong(reply);
    expect(headers.get('cache-control')).toBe(
      'public, max-age=86400, stale-while-revalidate=604800'
    );
  });
});
