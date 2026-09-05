/**
 * HTTP primitives.
 *
 * The API is deliberately dependency-free: everything here is built directly on
 * `node:http`. Responses are JSON envelopes with deterministic ETags, open CORS
 * headers and optional gzip compression, so the API can be consumed directly
 * from a browser, from a notebook, or from a citation-stable archival snapshot.
 */

import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';

import type { ServerResponse } from 'node:http';

import type { ApiResponse, JsonValue } from '../types.js';

/** Bodies smaller than this are never compressed. */
export const GZIP_THRESHOLD_BYTES = 1024;

/** Default shared-cache lifetime for immutable datasets, in seconds. */
export const DEFAULT_MAX_AGE_SECONDS = 300;

/** CORS and content headers applied to every response. */
export const COMMON_HEADERS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, HEAD, OPTIONS',
  'access-control-allow-headers': 'accept, accept-encoding, if-none-match',
  'access-control-expose-headers': 'etag, x-response-time, x-request-id',
  'access-control-max-age': '86400',
  'x-content-type-options': 'nosniff',
  'x-robots-tag': 'index, follow',
  'referrer-policy': 'no-referrer',
  vary: 'accept-encoding',
};

/**
 * Build the standard JSON envelope.
 *
 * @param status - HTTP status code.
 * @param data - Response payload.
 * @param meta - Response metadata.
 */
export function apiResponse(status: number, data: JsonValue, meta: Record<string, JsonValue>): ApiResponse {
  return { status, data, meta };
}

/**
 * Compute a weak ETag for a response body.
 *
 * @param body - Serialised body.
 */
export function etagFor(body: string): string {
  const digest = createHash('sha1').update(body).digest('base64url');
  return `W/"${digest}"`;
}

/**
 * Return `true` when the client accepts gzip.
 *
 * @param header - Raw `accept-encoding` header.
 */
export function acceptsGzip(header: string | undefined): boolean {
  if (header === undefined) {
    return false;
  }
  return header
    .toLowerCase()
    .split(',')
    .some((token) => token.trim().split(';')[0] === 'gzip');
}

/** The encoded body plus the headers needed to describe it. */
export interface EncodedBody {
  /** Bytes to send. */
  buffer: Buffer;
  /** `content-encoding` value, or `null` when uncompressed. */
  contentEncoding: string | null;
  /** `content-length` value. */
  contentLength: number;
}

/**
 * Serialise and optionally compress a body.
 *
 * @param body - Serialised body.
 * @param gzipAllowed - Whether the client accepts gzip.
 */
export function encodeBody(body: string, gzipAllowed: boolean): EncodedBody {
  if (gzipAllowed && Buffer.byteLength(body) >= GZIP_THRESHOLD_BYTES) {
    const buffer = gzipSync(Buffer.from(body, 'utf8'));
    return { buffer, contentEncoding: 'gzip', contentLength: buffer.byteLength };
  }
  const buffer = Buffer.from(body, 'utf8');
  return { buffer, contentEncoding: null, contentLength: buffer.byteLength };
}

/** Optional response controls shared by the `send*` helpers. */
export interface ResponseInit {
  /** Whether the client accepts gzip. */
  gzipAllowed?: boolean | undefined;
  /** Override the default `cache-control`. */
  cacheControl?: string | undefined;
  /** Client-supplied `if-none-match` value. */
  ifNoneMatch?: string | undefined;
  /** Send headers only (HTTP `HEAD`). */
  headOnly?: boolean | undefined;
  /** Extra headers merged into the response. */
  headers?: Record<string, string> | undefined;
}

/** Options for {@link writeResponse}. */
export interface ResponseOptions {
  /** Status code. */
  status: number;
  /** Content type. */
  contentType: string;
  /** Serialised body. */
  body: string;
  /** ETag; computed from the body when omitted. */
  etag?: string | undefined;
  /** `cache-control` value. */
  cacheControl?: string | undefined;
  /** Whether the client accepts gzip. */
  gzipAllowed?: boolean | undefined;
  /** Client-supplied `if-none-match` value, when present. */
  ifNoneMatch?: string | undefined;
  /** Send headers only (HTTP `HEAD`). */
  headOnly?: boolean | undefined;
  /** Extra headers merged into the response. */
  headers?: Record<string, string> | undefined;
}

/**
 * Write a complete response, honouring `if-none-match` conditional requests.
 *
 * @param res - Server response.
 * @param options - Response options.
 * @returns The number of bytes written (0 for `304`).
 */
export function writeResponse(res: ServerResponse, options: ResponseOptions): number {
  const etag = options.etag ?? etagFor(options.body);
  const headers: Record<string, string> = {
    ...COMMON_HEADERS,
    'content-type': options.contentType,
    etag,
    'cache-control': options.cacheControl ?? `public, max-age=${DEFAULT_MAX_AGE_SECONDS}`,
  };
  if (options.ifNoneMatch !== undefined && options.ifNoneMatch === etag) {
    res.writeHead(304, headers);
    res.end();
    return 0;
  }
  const encoded = encodeBody(options.body, options.gzipAllowed ?? false);
  headers['content-length'] = String(encoded.contentLength);
  if (encoded.contentEncoding !== null) {
    headers['content-encoding'] = encoded.contentEncoding;
  }
  if (options.headers !== undefined) {
    Object.assign(headers, options.headers);
  }
  res.writeHead(options.status, headers);
  if (options.headOnly === true) {
    res.end();
    return 0;
  }
  res.end(encoded.buffer);
  return encoded.contentLength;
}

/**
 * Send a JSON envelope.
 *
 * @param res - Server response.
 * @param status - HTTP status code.
 * @param data - Response payload.
 * @param meta - Response metadata.
 * @param init - Optional encoding controls.
 */
export function sendJson(
  res: ServerResponse,
  status: number,
  data: JsonValue,
  meta: Record<string, JsonValue>,
  init: ResponseInit = {},
): number {
  const body = `${JSON.stringify(apiResponse(status, data, meta), null, 2)}\n`;
  return writeResponse(res, {
    status,
    contentType: 'application/json; charset=utf-8',
    body,
    gzipAllowed: init.gzipAllowed,
    cacheControl: init.cacheControl,
    ifNoneMatch: init.ifNoneMatch,
    headOnly: init.headOnly,
    headers: init.headers,
  });
}

/**
 * Send an HTML document.
 *
 * @param res - Server response.
 * @param status - HTTP status code.
 * @param body - HTML body.
 * @param init - Optional encoding controls.
 */
export function sendHtml(res: ServerResponse, status: number, body: string, init: ResponseInit = {}): number {
  return writeResponse(res, {
    status,
    contentType: 'text/html; charset=utf-8',
    body,
    gzipAllowed: init.gzipAllowed,
    cacheControl: init.cacheControl,
    ifNoneMatch: init.ifNoneMatch,
    headOnly: init.headOnly,
    headers: init.headers,
  });
}
