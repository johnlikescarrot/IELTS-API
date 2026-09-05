import { PassThrough } from 'node:stream';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { JSON_BODY_TIMEOUT_MS, MAX_JSON_BODY_BYTES, readJsonBody } from '../../src/lib/body.js';

import type { IncomingMessage } from 'node:http';

function request(
  headers: IncomingMessage['headers'] = { 'content-type': 'application/json' },
): IncomingMessage & PassThrough {
  return Object.assign(new PassThrough(), { headers }) as unknown as IncomingMessage & PassThrough;
}

function expectClean(req: IncomingMessage): void {
  for (const event of ['data', 'end', 'aborted', 'error']) expect(req.listenerCount(event)).toBe(0);
}

afterEach(() => vi.useRealTimers());

describe('bounded JSON request ingestion', () => {
  it('reads chunked JSON and cleans up listeners', async () => {
    const req = request();
    const pending = readJsonBody(req);
    req.emit('data', Buffer.from('{"answers":'));
    req.emit('data', Buffer.from('[]}'));
    req.emit('end');
    await expect(pending).resolves.toEqual({ answers: [] });
    expectClean(req);
  });

  it('accepts explicit UTF-8 and identity encoding at the exact byte limit', async () => {
    const req = request({
      'content-type': 'application/json; charset=UTF-8',
      'content-encoding': 'IDENTITY',
      'content-length': '7',
    });
    const pending = readJsonBody(req, { maxBytes: 7, timeoutMs: 1000 });
    req.end('{"x":1}');
    await expect(pending).resolves.toEqual({ x: 1 });
    expectClean(req);
  });

  it.each([
    {},
    { 'content-type': 'text/plain' },
    { 'content-type': 'application/json; charset=utf-16' },
    { 'content-type': 'application/json', 'content-encoding': 'gzip' },
  ])('rejects unsupported media headers: %j', async (headers) => {
    const req = request(headers);
    await expect(readJsonBody(req)).rejects.toMatchObject({ status: 415, code: 'unsupported_media_type' });
    expectClean(req);
  });

  it('rejects excessive Content-Length before reading', async () => {
    const req = request({
      'content-type': 'application/json',
      'content-length': String(MAX_JSON_BODY_BYTES + 1),
    });
    await expect(readJsonBody(req)).rejects.toMatchObject({ status: 413 });
    expectClean(req);
  });

  it('also enforces the byte limit when Content-Length is absent or inaccurate', async () => {
    const req = request({ 'content-type': 'application/json', 'content-length': '2' });
    const pending = readJsonBody(req, { maxBytes: 3 });
    req.emit('data', Buffer.from('"'));
    req.emit('data', Buffer.from('é"'));
    await expect(pending).rejects.toMatchObject({ status: 413, code: 'payload_too_large' });
    expectClean(req);
  });

  it.each([Buffer.from(''), Buffer.from('{'), Buffer.from('{"private-sentinel":}'), Buffer.from([0xff])])(
    'rejects malformed JSON or UTF-8 without echoing contents: %j',
    async (input) => {
      const req = request();
      const pending = readJsonBody(req);
      req.end(input);
      await expect(pending).rejects.toMatchObject({
        status: 400,
        code: 'invalid_json',
        message: 'The request body must be valid UTF-8 JSON.',
      });
      expectClean(req);
    },
  );

  it.each(['aborted', 'error'])('rejects an incomplete request on %s', async (event) => {
    const req = request();
    const pending = readJsonBody(req);
    req.emit(event, new Error('private-sentinel'));
    await expect(pending).rejects.toMatchObject({ status: 400, code: 'incomplete_body' });
    expectClean(req);
  });

  it('sets an absolute body deadline and releases its timer and listeners', async () => {
    vi.useFakeTimers();
    const req = request();
    const pending = expect(readJsonBody(req)).rejects.toMatchObject({ status: 408, code: 'request_timeout' });
    req.emit('data', Buffer.from('{'));
    await vi.advanceTimersByTimeAsync(JSON_BODY_TIMEOUT_MS);
    await pending;
    expectClean(req);
    expect(vi.getTimerCount()).toBe(0);
  });
});
