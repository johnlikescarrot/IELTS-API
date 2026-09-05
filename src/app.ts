/**
 * The request dispatcher.
 *
 * Everything between the socket and the route handlers lives here: method
 * checking, route matching, error translation, ETag negotiation, compression
 * and request logging. Handlers stay pure and trivially testable.
 */

import { HttpError, methodNotAllowed, notFound } from './lib/errors.js';
import { MAX_BODY_BYTES, readBody } from './lib/body.js';
import { acceptsGzip, sendJson, writeResponse } from './lib/http.js';
import { isRawResult, matchRoute, splitPath } from './lib/route.js';
import { ROUTES } from './routes/index.js';
import { API_VERSION } from './version.js';

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { RouteDefinition } from './lib/route.js';
import type { JsonValue } from './types.js';

function sanitizeForLog(value: string): string {
  return value.replace(/[\r\n]/g, '');
}

/** Options for {@link createRequestHandler}. */
export interface AppOptions {
  /** Route table to serve; defaults to the full API. */
  routes?: readonly RouteDefinition[];
  /** Whether to log each request to stdout. */
  log?: boolean;
  /** Version reported in response metadata. */
  version?: string;
  /** Largest request body accepted on body-bearing routes, in bytes. */
  maxBodyBytes?: number;
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
  const maxBodyBytes = options.maxBodyBytes ?? MAX_BODY_BYTES;

  return (req, res) => {
    void handle(req, res);
  };

  /**
   * Handle one request.
   *
   * @param req - Incoming request.
   * @param res - Server response.
   */
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
          'access-control-allow-methods': 'GET, HEAD, POST, OPTIONS',
          'access-control-allow-headers': 'accept, accept-encoding, content-type, if-none-match',
          'access-control-max-age': '86400',
        });
        res.end();
      } else if (method !== 'GET' && method !== 'HEAD' && method !== 'POST') {
        throw methodNotAllowed();
      } else {
        const match = matchRoute(routes, splitPath(url.pathname));
        if (match === undefined) {
          throw notFound(`No endpoint matches ${url.pathname}.`, {
            path: url.pathname,
            documentation: '/docs',
          });
        }
        if (method === 'POST' && match.route.acceptsBody !== true) {
          throw methodNotAllowed(`${url.pathname} accepts GET and HEAD only.`);
        }
        const body = method === 'POST' ? await readBody(req, maxBodyBytes) : '';
        const result = match.route.handler({
          url,
          params: match.params,
          body,
          contentType: req.headers['content-type'],
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
            // A POST carries user-submitted text: never let it be cached.
            ...(method === 'POST' ? { cacheControl: 'no-store' } : {}),
            headers: { 'x-endpoint': match.route.path },
          });
        }
      }
    } catch (error) {
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
          { gzipAllowed, headers: { 'x-endpoint': url.pathname } },
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
          { gzipAllowed, headers: { 'x-endpoint': url.pathname } },
        );
      }
    }

    if (log) {
      const elapsed = Number(process.hrtime.bigint() - started) / 1e6;
      const safePathname = sanitizeForLog(url.pathname);
      const safeSearch = sanitizeForLog(url.search);
      console.log(`${method} ${safePathname}${safeSearch} ${status} ${elapsed.toFixed(2)}ms`);
    }
  }
}
