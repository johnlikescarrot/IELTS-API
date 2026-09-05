import { describe, expect, it, vi } from 'vitest';

import { gunzipSync } from 'node:zlib';

import type { ServerResponse } from 'node:http';

import {
  DEFAULT_MAX_AGE_SECONDS,
  GZIP_THRESHOLD_BYTES,
  acceptsGzip,
  apiResponse,
  encodeBody,
  etagFor,
  matchesIfNoneMatch,
  sendHtml,
  sendJson,
  writeResponse,
} from '../../src/lib/http.js';

interface Captured {
  status: number;
  headers: Record<string, string | string[] | number>;
  chunks: Buffer[];
}

/** Minimal stand-in for `node:http`'s ServerResponse. */
function fakeResponse(): { res: ServerResponse; captured: Captured } {
  const captured: Captured = { status: 0, headers: {}, chunks: [] };
  const res = {
    writeHead(status: number, headers: Record<string, string>) {
      captured.status = status;
      captured.headers = headers;
      return res;
    },
    end(chunk?: Buffer) {
      if (chunk !== undefined) {
        captured.chunks.push(chunk);
      }
      return res;
    },
  };
  return { res: res as unknown as ServerResponse, captured };
}

describe('apiResponse', () => {
  it('builds the standard envelope', () => {
    expect(apiResponse(200, [1], { total: 1 })).toEqual({ status: 200, data: [1], meta: { total: 1 } });
  });
});

describe('etagFor', () => {
  it('is stable and weak', () => {
    expect(etagFor('body')).toBe(etagFor('body'));
    expect(etagFor('body')).not.toBe(etagFor('other'));
    expect(etagFor('body').startsWith('W/"')).toBe(true);
  });
});

describe('acceptsGzip', () => {
  it('is false without the header', () => {
    expect(acceptsGzip(undefined)).toBe(false);
  });

  it('detects gzip among other codings and quality values', () => {
    expect(acceptsGzip('gzip')).toBe(true);
    expect(acceptsGzip('br, gzip;q=0.8, *;q=0.1')).toBe(true);
    expect(acceptsGzip('  GZIP ')).toBe(true);
    expect(acceptsGzip('identity')).toBe(false);
    expect(acceptsGzip('gzip;foo')).toBe(true);
    expect(acceptsGzip('gzip;q=abc')).toBe(true);
    expect(acceptsGzip('gzip;q=0')).toBe(false);
    expect(acceptsGzip('gzip;q=invalid')).toBe(true);
    expect(acceptsGzip('gzip;other=val')).toBe(true);
    expect(acceptsGzip('gzip;q')).toBe(true);
    expect(acceptsGzip('*')).toBe(true);
    expect(acceptsGzip('*;q=0')).toBe(false);
  });
});

describe('matchesIfNoneMatch', () => {
  it('handles undefined header', () => {
    expect(matchesIfNoneMatch(undefined, 'W/"123"')).toBe(false);
  });

  it('matches wildcard asterisks', () => {
    expect(matchesIfNoneMatch('*', 'W/"123"')).toBe(true);
  });

  it('matches weak and strong forms across comma-separated lists', () => {
    expect(matchesIfNoneMatch('W/"123", W/"456"', 'W/"123"')).toBe(true);
    expect(matchesIfNoneMatch('"123"', 'W/"123"')).toBe(true);
    expect(matchesIfNoneMatch('W/"abc"', 'W/"xyz"')).toBe(false);
  });
});

describe('encodeBody', () => {
  it('does not compress small or unrequested bodies', () => {
    const small = encodeBody('x'.repeat(GZIP_THRESHOLD_BYTES - 1), true);
    expect(small.contentEncoding).toBeNull();
    const unrequested = encodeBody('x'.repeat(GZIP_THRESHOLD_BYTES * 4), false);
    expect(unrequested.contentEncoding).toBeNull();
    expect(unrequested.contentLength).toBe(GZIP_THRESHOLD_BYTES * 4);
  });

  it('compresses large bodies when gzip is accepted', () => {
    const body = 'x'.repeat(GZIP_THRESHOLD_BYTES * 4);
    const encoded = encodeBody(body, true);
    expect(encoded.contentEncoding).toBe('gzip');
    expect(encoded.contentLength).toBeLessThan(Buffer.byteLength(body));
    expect(gunzipSync(encoded.buffer).toString('utf8')).toBe(body);
  });
});

describe('writeResponse', () => {
  it('writes status, merged headers and body', () => {
    const { res, captured } = fakeResponse();
    const written = writeResponse(res, {
      status: 201,
      contentType: 'application/json',
      body: '{}',
      headers: { 'x-endpoint': '/v1/bands' },
    });
    expect(written).toBe(2);
    expect(captured.status).toBe(201);
    expect(captured.headers['content-type']).toBe('application/json');
    expect(captured.headers['cache-control']).toBe(`public, max-age=${DEFAULT_MAX_AGE_SECONDS}`);
    expect(captured.headers['x-endpoint']).toBe('/v1/bands');
    expect(captured.headers['access-control-allow-origin']).toBe('*');
    expect(captured.chunks[0]?.toString()).toBe('{}');
  });

  it('uses the provided etag and cache-control', () => {
    const { res, captured } = fakeResponse();
    writeResponse(res, {
      status: 200,
      contentType: 'text/plain',
      body: 'hi',
      etag: 'W/"abc"',
      cacheControl: 'no-store',
    });
    expect(captured.headers.etag).toBe('W/"abc"');
    expect(captured.headers['cache-control']).toBe('no-store');
  });

  it('answers 304 when the client already has the body', () => {
    const { res, captured } = fakeResponse();
    const body = 'cached';
    const written = writeResponse(res, {
      status: 200,
      contentType: 'text/plain',
      body,
      ifNoneMatch: etagFor(body),
    });
    expect(written).toBe(0);
    expect(captured.status).toBe(304);
    expect(captured.chunks).toHaveLength(0);
  });

  it('does not answer 304 when the etag differs', () => {
    const { res, captured } = fakeResponse();
    writeResponse(res, {
      status: 200,
      contentType: 'text/plain',
      body: 'fresh',
      ifNoneMatch: 'W/"stale"',
    });
    expect(captured.status).toBe(200);
  });

  it('sends headers only for HEAD requests', () => {
    const { res, captured } = fakeResponse();
    const written = writeResponse(res, {
      status: 200,
      contentType: 'text/plain',
      body: 'headless',
      headOnly: true,
    });
    expect(written).toBe(0);
    expect(captured.chunks).toHaveLength(0);
    expect(captured.headers['content-length']).toBe('8');
  });

  it('adds content-encoding and vary when compressing', () => {
    const { res, captured } = fakeResponse();
    writeResponse(res, {
      status: 200,
      contentType: 'text/plain',
      body: 'x'.repeat(GZIP_THRESHOLD_BYTES * 2),
      gzipAllowed: true,
    });
    expect(captured.headers['content-encoding']).toBe('gzip');
    expect(captured.headers.vary).toBe('accept-encoding');
  });
});

describe('sendJson and sendHtml', () => {
  it('sends a pretty-printed envelope', () => {
    const { res, captured } = fakeResponse();
    sendJson(res, 200, { a: 1 }, { total: 1 });
    const body = Buffer.concat(captured.chunks).toString('utf8');
    expect(body).toContain('\n  "status": 200');
    expect(body.endsWith('\n')).toBe(true);
    expect(JSON.parse(body)).toEqual({ status: 200, data: { a: 1 }, meta: { total: 1 } });
  });

  it('forwards gzip, cache, conditional and head options', () => {
    const { res, captured } = fakeResponse();
    sendJson(res, 200, [], {}, { gzipAllowed: false, cacheControl: 'no-store', headOnly: true });
    expect(captured.headers['cache-control']).toBe('no-store');
    expect(captured.chunks).toHaveLength(0);
  });

  it('sends HTML with the right content type', () => {
    const { res, captured } = fakeResponse();
    sendHtml(res, 200, '<p>hi</p>');
    expect(captured.headers['content-type']).toBe('text/html; charset=utf-8');
    expect(Buffer.concat(captured.chunks).toString()).toBe('<p>hi</p>');
  });

  it('honours conditional requests for HTML too', () => {
    const { res, captured } = fakeResponse();
    sendHtml(res, 200, '<p>hi</p>', { ifNoneMatch: etagFor('<p>hi</p>') });
    expect(captured.status).toBe(304);
  });
});

describe('logging', () => {
  it('never writes to stdout from the http layer', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const { res } = fakeResponse();
    sendJson(res, 200, {}, {});
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
