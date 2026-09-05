/**
 * The request dispatcher.
 *
 * Everything between the socket and the route handlers lives here: method
 * checking, route matching, error translation, ETag negotiation, compression
 * and request logging. Handlers stay pure and trivially testable.
 */

import { HttpError, methodNotAllowed, notFound, payloadTooLarge } from './lib/errors.js';
import { acceptsGzip, sendJson, writeResponse } from './lib/http.js';
import { isRawResult, matchRoute, splitPath } from './lib/route.js';
import { ROUTES } from './routes/index.js';
import { API_VERSION } from './version.js';

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { RouteDefinition } from './lib/route.js';
import type { HttpMethod, JsonValue } from './types.js';

/** Largest request body accepted, in bytes. */
export const MAX_BODY_BYTES = 262144;

/**
 * Read a request body, refusing anything larger than {@link MAX_BODY_BYTES}.
 *
 * @param req - Incoming request.
 * @returns The body decoded as UTF-8.
 */
export async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  // `node:http` always yields Buffers: the request stream is never in object
  // mode and no encoding is set on it.
  for await (const buffer of req as AsyncIterable<Buffer>) {
    size += buffer.byteLength;
    if (size > MAX_BODY_BYTES) {
      throw payloadTooLarge(`Request bodies are limited to ${MAX_BODY_BYTES} bytes.`, {
        limit: String(MAX_BODY_BYTES),
      });
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

/** Options for {@link createRequestHandler}. */
export interface AppOptions {
  /** Route table to serve; defaults to the full API. */
  routes?: readonly RouteDefinition[];
  /** Whether to log each request to stdout. */
  log?: boolean;
  /** Version reported in response metadata. */
  version?: string;
}

/**
 * Create the `node:http` request listener.
 *
 * @param options - Application options.
 */
export function createRequestHandler(
  options: AppOptions = {},
): (req: IncomingMessage, res: ServerResponse) => void {
  const routes = options.routes ?? ROUTES;
  const version = options.version ?? API_VERSION;
  const log = options.log ?? false;

  return (req, res) => {
    void handle(req, res);
  };

  /** Handle one request, translating every failure into a JSON envelope. */
  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const started = process.hrtime.bigint();
    const method = (req.method ?? 'GET').toUpperCase();
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const gzipAllowed = acceptsGzip(req.headers['accept-encoding']);
    const ifNoneMatch = req.headers['if-none-match'];
    let status = 200;

    try {
      if (method === 'OPTIONS') {
        res.writeHead(204, {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET, HEAD, OPTIONS, POST',
          'access-control-allow-headers': 'accept, accept-encoding, content-type, if-none-match',
          'access-control-max-age': '86400',
        });
        res.end();
      } else if (method !== 'GET' && method !== 'HEAD' && method !== 'POST') {
        throw methodNotAllowed();
      } else {
        const lookup: HttpMethod = method === 'POST' ? 'POST' : 'GET';
        const match = matchRoute(routes, splitPath(url.pathname), lookup);
        if (match === undefined) {
          throw notFound(`No endpoint matches ${url.pathname}.`, {
            path: url.pathname,
            documentation: '/docs',
          });
        }
        const body = method === 'POST' ? await readBody(req) : undefined;
        const result = match.route.handler({
          url,
          params: match.params,
          ...(body === undefined ? {} : { body }),
        });
        if (isRawResult(result)) {
          writeResponse(res, {
            status: 200,
            contentType: result.raw.contentType,
            body: result.raw.body,
            gzipAllowed,
            ifNoneMatch,
            headOnly: method === 'HEAD',
          });
        } else {
          status = 200;
          const meta: Record<string, JsonValue> = {
            endpoint: match.route.path,
            version,
            ...(result.meta ?? {}),
          };
          sendJson(res, 200, result.data, meta, {
            gzipAllowed,
            ifNoneMatch,
            headOnly: method === 'HEAD',
            // Analyses are computed from a request body: never cache them.
            ...(method === 'POST' ? { cacheControl: 'no-store' } : {}),
            headers: { 'x-endpoint': match.route.path },
          });
        }
      }
    } catch (error) {
      // A request whose body was never fully read would poison a keep-alive
      // connection, so such responses always close it.
      const extra: Record<string, string> = { 'x-endpoint': url.pathname };
      if (!req.readableEnded && method === 'POST') {
        extra['connection'] = 'close';
      }
      const httpError = error instanceof HttpError ? error : undefined;
      if (httpError !== undefined) {
        status = httpError.status;
        sendJson(
          res,
          httpError.status,
          null,
          {
            error: {
              code: httpError.code,
              message: httpError.message,
              details: httpError.details,
            },
            version,
          },
          { gzipAllowed, headers: extra },
        );
      } else {
        status = 500;
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`ielts-api: unhandled error at ${url.pathname}: ${message}`);
        sendJson(
          res,
          500,
          null,
          {
            error: { code: 'internal_error', message: 'An unexpected error occurred.', details: {} },
            version,
          },
          { gzipAllowed, headers: extra },
        );
      }
    }

    if (log) {
      const elapsed = Number(process.hrtime.bigint() - started) / 1e6;
      console.log(`${method} ${url.pathname}${url.search} ${status} ${elapsed.toFixed(2)}ms`);
    }
  }
}
