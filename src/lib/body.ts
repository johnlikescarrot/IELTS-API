/**
 * Request-body handling for the text-analysis endpoints.
 *
 * The API is read-only, so `POST` is used here purely as a transport: a
 * passage submitted for analysis is routinely longer than a URL may safely be,
 * and query strings end up in proxy and server logs. A body keeps the text out
 * of the request line. Nothing is stored: the body is decoded, analysed in
 * process and discarded.
 */

import { badRequest, payloadTooLarge, unsupportedMediaType } from './errors.js';

import type { IncomingMessage } from 'node:http';

/** Largest body the API will read, in bytes. */
export const MAX_BODY_BYTES = 256 * 1024;

/** Media types accepted on the analysis endpoints. */
export const ACCEPTED_MEDIA_TYPES: readonly string[] = [
  'text/plain',
  'application/json',
  'application/x-www-form-urlencoded',
];

/**
 * Return the media type of a `content-type` header, without parameters.
 *
 * @param header - Raw header value.
 * @returns The lower-cased media type, or `undefined` when absent.
 */
export function mediaTypeOf(header: string | undefined): string | undefined {
  if (header === undefined) {
    return undefined;
  }
  const type = (header.split(';')[0] as string).trim().toLowerCase();
  return type.length === 0 ? undefined : type;
}

/**
 * Read a request body into a string, enforcing the size limit.
 *
 * @param req - Incoming request.
 * @param limit - Maximum number of bytes to accept.
 * @throws {HttpError} `413` when the body exceeds the limit.
 */
export function readBody(req: IncomingMessage, limit: number = MAX_BODY_BYTES): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let aborted = false;
    req.on('data', (chunk: Buffer) => {
      if (aborted) {
        return;
      }
      size += chunk.length;
      if (size > limit) {
        // Stop buffering but keep draining the socket, so that the 413 response
        // can still be written and read by the client.
        aborted = true;
        chunks.length = 0;
        req.resume();
        reject(payloadTooLarge(`Request body exceeds the ${limit}-byte limit.`, { limit: String(limit) }));
        return;
      }
      chunks.push(chunk);
    });
    req.on('error', reject);
    req.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
  });
}

/**
 * Extract the text to analyse from a decoded request body.
 *
 * `text/plain` bodies are used verbatim; `application/json` bodies must be an
 * object with a string `text` property; form-encoded bodies must carry a
 * `text` field. A missing `content-type` is treated as `text/plain`.
 *
 * @param body - Decoded body.
 * @param contentType - Raw `content-type` header.
 * @throws {HttpError} `415` for an unsupported media type, `400` for a body
 *   that does not carry usable text.
 */
export function textFromBody(body: string, contentType: string | undefined): string {
  const mediaType = mediaTypeOf(contentType) ?? 'text/plain';
  if (!ACCEPTED_MEDIA_TYPES.includes(mediaType)) {
    throw unsupportedMediaType(
      `Content type "${mediaType}" is not supported; send ${ACCEPTED_MEDIA_TYPES.join(', ')}.`,
      { received: mediaType, accepted: ACCEPTED_MEDIA_TYPES.join(',') },
    );
  }
  if (mediaType === 'text/plain') {
    return body;
  }
  if (mediaType === 'application/x-www-form-urlencoded') {
    const value = new URLSearchParams(body).get('text');
    if (value === null) {
      throw badRequest('The form body must contain a "text" field.', { parameter: 'text' });
    }
    return value;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw badRequest('The request body is not valid JSON.', { contentType: mediaType });
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw badRequest('The JSON body must be an object with a "text" property.', { parameter: 'text' });
  }
  const value = (parsed as Record<string, unknown>).text;
  if (typeof value !== 'string') {
    throw badRequest('The JSON body must be an object with a string "text" property.', {
      parameter: 'text',
    });
  }
  return value;
}
