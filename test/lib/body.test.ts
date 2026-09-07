import { PassThrough } from 'node:stream';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { JSON_BODY_TIMEOUT_MS, MAX_JSON_BODY_BYTES, readJsonBody } from '../../src/lib/body.js';
import type { IncomingHttpHeaders, IncomingMessage } from 'node:http';

function request(headers: IncomingHttpHeaders = { 'content-type': 'application/json' }): IncomingMessage {
  const stream = new PassThrough() as unknown as IncomingMessage;
  stream.headers = headers;
  return stream;
}
function write(req: IncomingMessage, value: Buffer | string): void {
  (req as unknown as PassThrough).end(value);
}
afterEach(() => vi.useRealTimers());

describe('bounded UTF-8 JSON reader', () => {
  it('reads UTF-8 split across chunks, including inside a multibyte character', async () => {
    const req = request({
      'content-type': 'APPLICATION/JSON; charset="UTF-8"',
      'content-encoding': 'identity',
    });
    const result = readJsonBody(req);
    const buffer = Buffer.from('{"word":"汉字"}');
    (req as unknown as PassThrough).write(buffer.subarray(0, 11));
    write(req, buffer.subarray(11));
    expect(await result).toEqual({ word: '汉字' });
  });

  it.each(['', '{', '{"x":}', 'null garbage'])('rejects malformed or empty JSON: %s', async (value) => {
    const req = request();
    const result = readJsonBody(req);
    write(req, value);
    await expect(result).rejects.toMatchObject({ status: 400, code: 'bad_request' });
  });

  it('rejects invalid UTF-8 instead of silently substituting replacement characters', async () => {
    const req = request();
    const result = readJsonBody(req);
    write(req, Buffer.from([0x22, 0xc3, 0x28, 0x22]));
    await expect(result).rejects.toThrow('UTF-8');
  });

  it.each([undefined, 'text/plain', 'application/json; charset=latin1', 'application/octet-stream'])(
    'rejects unsupported content type %s',
    async (contentType) => {
      await expect(readJsonBody(request({ 'content-type': contentType }))).rejects.toMatchObject({
        status: 415,
      });
    },
  );

  it('rejects compressed bodies before consuming them', async () => {
    await expect(
      readJsonBody(request({ 'content-type': 'application/json', 'content-encoding': 'gzip' })),
    ).rejects.toMatchObject({ status: 415 });
  });

  it('accepts a body at the byte limit with a declared length', async () => {
    const req = request({
      'content-type': 'application/json',
      'content-length': String(MAX_JSON_BODY_BYTES),
    });
    const result = readJsonBody(req);
    write(req, JSON.stringify('x'.repeat(MAX_JSON_BODY_BYTES - 2)));
    expect(await result).toHaveLength(MAX_JSON_BODY_BYTES - 2);
  });

  it('rejects oversized declared lengths immediately', async () => {
    await expect(
      readJsonBody(
        request({ 'content-type': 'application/json', 'content-length': String(MAX_JSON_BODY_BYTES + 1) }),
      ),
    ).rejects.toMatchObject({ status: 413, code: 'payload_too_large' });
  });

  it('enforces actual bytes without Content-Length and safely ignores late stream failures', async () => {
    const req = request();
    const result = readJsonBody(req);
    write(req, JSON.stringify('汉'.repeat(MAX_JSON_BODY_BYTES / 2)));
    await expect(result).rejects.toMatchObject({ status: 413 });
    req.emit('error', new Error('late socket failure'));
    req.emit('aborted');
  });

  it('does not trust an understated Content-Length', async () => {
    const req = request({ 'content-type': 'application/json', 'content-length': '1' });
    const result = readJsonBody(req);
    write(req, Buffer.alloc(MAX_JSON_BODY_BYTES + 1));
    await expect(result).rejects.toMatchObject({ status: 413 });
  });

  it('rejects stream errors and aborted uploads without exposing exception details', async () => {
    for (const event of ['error', 'aborted']) {
      const req = request();
      const result = readJsonBody(req);
      req.emit(event, new Error('private input'));
      await expect(result).rejects.toMatchObject({ status: 400 });
      await expect(result).rejects.not.toThrow('private input');
      write(req, '{}');
    }
  });

  it('times out by elapsed time, even if some data arrived', async () => {
    vi.useFakeTimers();
    const req = request();
    const result = readJsonBody(req);
    const assertion = expect(result).rejects.toMatchObject({ status: 408, code: 'request_timeout' });
    (req as unknown as PassThrough).write('{');
    await vi.advanceTimersByTimeAsync(JSON_BODY_TIMEOUT_MS);
    await assertion;
    write(req, '}');
    await vi.advanceTimersByTimeAsync(0);
  });
});
