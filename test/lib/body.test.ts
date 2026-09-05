import { describe, expect, it } from 'vitest';

import { Readable } from 'node:stream';

import {
  ACCEPTED_MEDIA_TYPES,
  MAX_BODY_BYTES,
  mediaTypeOf,
  readBody,
  textFromBody,
} from '../../src/lib/body.js';
import { HttpError } from '../../src/lib/errors.js';

import type { IncomingMessage } from 'node:http';

/** Wrap chunks in something `readBody` can consume. */
function request(chunks: readonly string[]): IncomingMessage {
  const stream = Readable.from(chunks.map((chunk) => Buffer.from(chunk, 'utf8')));
  return stream as unknown as IncomingMessage;
}

describe('mediaTypeOf', () => {
  it('drops parameters and lower-cases', () => {
    expect(mediaTypeOf('Text/Plain; charset=UTF-8')).toBe('text/plain');
  });

  it('returns undefined for a missing or blank header', () => {
    expect(mediaTypeOf(undefined)).toBeUndefined();
    expect(mediaTypeOf('  ; charset=utf-8')).toBeUndefined();
  });
});

describe('readBody', () => {
  it('concatenates chunks', async () => {
    await expect(readBody(request(['hello ', 'world']))).resolves.toBe('hello world');
  });

  it('defaults to the published limit', async () => {
    await expect(readBody(request(['short']))).resolves.toBe('short');
    expect(MAX_BODY_BYTES).toBe(262144);
  });

  it('rejects a body over the limit', async () => {
    await expect(readBody(request(['0123456789']), 4)).rejects.toMatchObject({ status: 413 });
  });

  it('keeps draining after the limit is exceeded, and rejects only once', async () => {
    const stream = request(['0123456789', 'abcdefghij']);
    const drained = new Promise((resolve) => stream.on('end', resolve));
    await expect(readBody(stream, 4)).rejects.toMatchObject({ status: 413 });
    await drained;
  });

  it('propagates stream errors', async () => {
    const stream = new Readable({
      read() {
        this.destroy(new Error('socket reset'));
      },
    });
    await expect(readBody(stream as unknown as IncomingMessage)).rejects.toThrow('socket reset');
  });
});

describe('textFromBody', () => {
  it('treats a missing content type as text/plain', () => {
    expect(textFromBody('raw passage', undefined)).toBe('raw passage');
  });

  it('uses a text/plain body verbatim', () => {
    expect(textFromBody('raw passage', 'text/plain; charset=utf-8')).toBe('raw passage');
  });

  it('reads the text property of a JSON body', () => {
    expect(textFromBody('{"text":"json passage"}', 'application/json')).toBe('json passage');
  });

  it('reads the text field of a form body', () => {
    expect(textFromBody('text=form+passage', 'application/x-www-form-urlencoded')).toBe('form passage');
  });

  it('rejects an unsupported media type', () => {
    expect(() => textFromBody('<x/>', 'application/xml')).toThrowError(HttpError);
    try {
      textFromBody('<x/>', 'application/xml');
    } catch (error) {
      expect((error as HttpError).status).toBe(415);
      expect((error as HttpError).details.accepted).toBe(ACCEPTED_MEDIA_TYPES.join(','));
    }
  });

  it('rejects a form body with no text field', () => {
    expect(() => textFromBody('other=1', 'application/x-www-form-urlencoded')).toThrowError(
      /must contain a "text" field/,
    );
  });

  it('rejects malformed JSON', () => {
    expect(() => textFromBody('{', 'application/json')).toThrowError(/not valid JSON/);
  });

  it.each(['null', '[]', '"a string"'])('rejects the non-object JSON body %s', (body) => {
    expect(() => textFromBody(body, 'application/json')).toThrowError(/must be an object/);
  });

  it('rejects a JSON body whose text property is not a string', () => {
    expect(() => textFromBody('{"text":42}', 'application/json')).toThrowError(/string "text" property/);
  });
});
