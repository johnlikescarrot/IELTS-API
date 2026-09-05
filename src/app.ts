/**
 * The request dispatcher.
 *
 * Everything between the socket and the route handlers lives here: method
 * checking, route matching, error translation, ETag negotiation, compression
 * and request logging. Handlers stay pure and trivially testable.
 */

import { HttpError, badRequest, methodNotAllowed, notFound } from './lib/errors.js';
import { acceptsGzip, sendJson, writeResponse } from './lib/http.js';
import { isRawResult, matchRoute, splitPath } from './lib/route.js';
import { ROUTES } from './routes/index.js';
import { API_VERSION } from './version.js';

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { RouteDefinition } from './lib/route.js';
import type { JsonValue } from './types.js';

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
    const started = process.hrtime.bigint();
    const method = (req.method ?? 'GET').toUpperCase();
    // Routing needs only a path/query. Never trust Host as a URL-constructor base.
    let url = new URL('http://localhost/');
    const gzipAllowed = acceptsGzip(req.headers['accept-encoding']);
    const ifNoneMatch = req.headers['if-none-match'];
    let status = 200;

    try {
      try {
        url = new URL(req.url ?? '/', 'http://localhost/');
      } catch {
        throw badRequest('Malformed request target.');
      }
      if (method === 'OPTIONS') {
        res.writeHead(204, {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET, HEAD, OPTIONS',
          'access-control-max-age': '86400',
        });
        res.end();
      } else if (method !== 'GET' && method !== 'HEAD') {
        throw methodNotAllowed();
      } else {
        const match = matchRoute(routes, splitPath(url.pathname));
        if (match === undefined) {
          throw notFound(`No endpoint matches ${url.pathname}.`, {
            path: url.pathname,
            documentation: '/docs',
          });
        }
        const result = match.route.handler({ url, params: match.params });
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
          {
            gzipAllowed,
            headOnly: method === 'HEAD',
            cacheControl: 'no-store',
            headers: { 'x-endpoint': url.pathname },
          },
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
          {
            gzipAllowed,
            headOnly: method === 'HEAD',
            cacheControl: 'no-store',
            headers: { 'x-endpoint': url.pathname },
          },
        );
      }
    }

    if (log) {
      const elapsed = Number(process.hrtime.bigint() - started) / 1e6;
      console.log(`${method} ${url.pathname}${url.search} ${status} ${elapsed.toFixed(2)}ms`);
    }
  };
}
