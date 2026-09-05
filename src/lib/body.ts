/** Bounded JSON ingestion for stateless practice submissions. No request body is logged. */

import { HttpError } from './errors.js';

import type { IncomingMessage } from 'node:http';

/** Maximum UTF-8 JSON request size, also enforced on chunked requests. */
export const MAX_JSON_BODY_BYTES = 16 * 1024;

/** Absolute deadline for receiving a grading request body. */
export const JSON_BODY_TIMEOUT_MS = 10_000;

/** Internal limits can be lowered by embedders or tests. */
export type JsonBodyLimits = { maxBytes?: number; timeoutMs?: number };

/**
 * Read application/json with UTF-8 encoding and reject malformed, compressed,
 * oversized, incomplete or slow bodies. Listeners are cleaned up on every exit.
 * Rejected bodies are drained; the dispatcher closes the connection on errors.
 */
export async function readJsonBody(req: IncomingMessage, limits: JsonBodyLimits = {}): Promise<unknown> {
  const maxBytes = limits.maxBytes ?? MAX_JSON_BODY_BYTES;
  const timeoutMs = limits.timeoutMs ?? JSON_BODY_TIMEOUT_MS;
  const contentType = req.headers['content-type'] ?? '';
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(contentType)) {
    throw new HttpError(
      415,
      'unsupported_media_type',
      'Use Content-Type: application/json with UTF-8 encoding.',
    );
  }
  const encoding = req.headers['content-encoding'];
  if (encoding !== undefined && encoding.toLowerCase() !== 'identity') {
    throw new HttpError(415, 'unsupported_media_type', 'Compressed request bodies are not supported.');
  }
  const tooLarge = (): HttpError =>
    new HttpError(413, 'payload_too_large', `JSON bodies must not exceed ${maxBytes} bytes.`);
  if (Number(req.headers['content-length'] ?? '0') > maxBytes) {
    req.resume();
    throw tooLarge();
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    const timer = setTimeout(
      () => finish(new HttpError(408, 'request_timeout', 'The request body deadline was exceeded.')),
      timeoutMs,
    );
    timer.unref();

    function finish(error: HttpError | null, value?: unknown): void {
      clearTimeout(timer);
      req.removeListener('data', onData);
      req.removeListener('end', onEnd);
      req.removeListener('aborted', onFailure);
      req.removeListener('error', onFailure);
      if (error !== null) {
        req.resume();
        reject(error);
      } else {
        resolve(value);
      }
    }

    function onData(chunk: Buffer): void {
      size += chunk.byteLength;
      if (size > maxBytes) {
        finish(tooLarge());
        return;
      }
      chunks.push(chunk);
    }

    function onEnd(): void {
      try {
        const text = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
        finish(null, JSON.parse(text) as unknown);
      } catch {
        finish(new HttpError(400, 'invalid_json', 'The request body must be valid UTF-8 JSON.'));
      }
    }

    function onFailure(): void {
      finish(new HttpError(400, 'incomplete_body', 'The request body was not received completely.'));
    }

    req.on('data', onData);
    req.once('end', onEnd);
    req.once('aborted', onFailure);
    req.once('error', onFailure);
  });
}
