/** Bounded UTF-8 JSON input for the two stateless POST computations. */
import { TextDecoder } from 'node:util';
import { badRequest, HttpError } from './errors.js';
import type { IncomingMessage } from 'node:http';

/** Maximum actual body size, also enforced when Content-Length is absent or inaccurate. */
export const MAX_JSON_BODY_BYTES = 256 * 1024;
/** Maximum elapsed time to receive a JSON body, independent of socket activity. */
export const JSON_BODY_TIMEOUT_MS = 10_000;

/** Read one uncompressed application/json body without logging or retaining it. */
export async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const contentType = req.headers['content-type'] ?? '';
  if (!/^application\/json(?:\s*;\s*charset\s*=\s*(?:utf-8|"utf-8"))?\s*$/i.test(contentType)) {
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
  const tooLarge = () => new HttpError(413, 'payload_too_large', 'JSON bodies must not exceed 262144 bytes.');
  const length = req.headers['content-length'];
  if (length !== undefined && Number(length) > MAX_JSON_BODY_BYTES) {
    throw tooLarge();
  }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let bytes = 0;
    let settled = false;
    const finish = (error?: HttpError) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      req.off('data', onData);
      if (error !== undefined) {
        chunks.length = 0;
        req.resume();
        reject(error);
        return;
      }
      try {
        const text = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
        resolve(JSON.parse(text) as unknown);
      } catch {
        reject(badRequest('The body must contain valid UTF-8 JSON.'));
      }
      chunks.length = 0;
    };
    const onData = (chunk: Buffer) => {
      bytes += chunk.byteLength;
      if (bytes > MAX_JSON_BODY_BYTES) finish(tooLarge());
      else chunks.push(chunk);
    };
    const timer = setTimeout(() => {
      finish(new HttpError(408, 'request_timeout', 'The JSON body was not received within 10 seconds.'));
    }, JSON_BODY_TIMEOUT_MS);
    timer.unref();
    req.on('data', onData);
    req.once('end', () => finish());
    // Keep these once-listeners until the stream ends/errors: a late socket
    // error after a size/timeout rejection must not become an unhandled event.
    req.once('error', () => finish(badRequest('The request body could not be read.')));
    req.once('aborted', () => finish(badRequest('The request body was aborted.')));
  });
}
