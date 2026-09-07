/**
 * Request dispatch, method checks, bounded JSON input, private computation
 * responses and public dataset caching. Domain handlers remain pure.
 */
import { badRequest, HttpError, methodNotAllowed, notFound } from './lib/errors.js';
import { readJsonBody } from './lib/body.js';
import { acceptsGzip, COMMON_HEADERS, sendJson, writeResponse } from './lib/http.js';
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
  /** Log method, path, status and timing, never query strings or request bodies. */
  log?: boolean;
  /** Version reported in response metadata. */
  version?: string;
}

/** Create the node:http listener. POST is available only on explicitly registered routes. */
export function createRequestHandler(
  options: AppOptions = {},
): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
  const routes = options.routes ?? ROUTES;
  const version = options.version ?? API_VERSION;
  const log = options.log ?? false;

  return async (req, res) => {
    const started = process.hrtime.bigint();
    const method = (req.method ?? 'GET').toUpperCase();
    let url = new URL('http://localhost/');
    const gzipAllowed = acceptsGzip(req.headers['accept-encoding']);
    const privateResponse = method === 'POST';
    const ifNoneMatch = privateResponse ? undefined : req.headers['if-none-match'];
    const cacheControl = privateResponse ? 'no-store' : undefined;
    const privacyHeaders: Record<string, string> = privateResponse
      ? { 'x-robots-tag': 'noindex, nofollow' }
      : {};
    let status = 200;

    try {
      try {
        url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
      } catch {
        throw badRequest('The request URL or Host header is invalid.');
      }
      if (method === 'OPTIONS') {
        status = 204;
        res.writeHead(status, COMMON_HEADERS);
        res.end();
      } else {
        const segments = splitPath(url.pathname);
        const candidates = routes.filter((route) => matchRoute([route], segments) !== undefined);
        const allowed =
          candidates.length === 0
            ? 'GET, HEAD, POST, OPTIONS'
            : [
                ...new Set(
                  candidates.flatMap((route) => (route.method === 'GET' ? ['GET', 'HEAD'] : ['POST'])),
                ),
                'OPTIONS',
              ].join(', ');
        if (!['GET', 'HEAD', 'POST'].includes(method)) {
          throw methodNotAllowed(`Method ${method} is not supported at this endpoint.`, allowed);
        }
        if (candidates.length === 0) {
          throw notFound(`No endpoint matches ${url.pathname}.`, {
            path: url.pathname,
            documentation: '/docs',
          });
        }
        const match = matchRoute(
          candidates,
          segments,
          method === 'HEAD' ? 'GET' : (method as 'GET' | 'POST'),
        );
        if (match === undefined) {
          throw methodNotAllowed(`Method ${method} is not supported at this endpoint.`, allowed);
        }
        const body = privateResponse ? await readJsonBody(req) : undefined;
        const result = match.route.handler({ url, params: match.params, body });
        const responseOptions = {
          gzipAllowed,
          ifNoneMatch,
          cacheControl,
          headOnly: method === 'HEAD',
          headers: { 'x-endpoint': match.route.path, ...privacyHeaders },
        };
        if (isRawResult(result)) {
          writeResponse(res, {
            status: 200,
            contentType: result.raw.contentType,
            body: result.raw.body,
            ...responseOptions,
          });
        } else {
          const meta: Record<string, JsonValue> = {
            endpoint: match.route.path,
            version,
            ...(result.meta ?? {}),
          };
          sendJson(res, 200, result.data, meta, responseOptions);
        }
        status = res.statusCode;
      }
    } catch (error) {
      if (privateResponse) req.resume();
      const httpError = error instanceof HttpError ? error : undefined;
      status = httpError?.status ?? 500;
      const errorOptions = {
        gzipAllowed,
        cacheControl: 'no-store',
        headOnly: method === 'HEAD',
        headers: {
          'x-endpoint': url.pathname,
          'x-robots-tag': 'noindex, nofollow',
          ...(httpError?.status === 405
            ? { allow: httpError.details.allow ?? 'GET, HEAD, POST, OPTIONS' }
            : {}),
          ...(status === 408 || status === 413 ? { connection: 'close' } : {}),
        },
      };
      if (httpError !== undefined) {
        sendJson(
          res,
          status,
          null,
          {
            error: { code: httpError.code, message: httpError.message, details: httpError.details },
            version,
          },
          errorOptions,
        );
      } else {
        // A third-party handler may put submitted data in an exception message.
        const message = privateResponse
          ? 'Internal computation failure'
          : error instanceof Error
            ? error.message
            : 'Unknown error';
        console.error(
          `ielts-api: unhandled error at ${sanitizeForLog(url.pathname)}: ${sanitizeForLog(message)}`,
        );
        sendJson(
          res,
          500,
          null,
          {
            error: { code: 'internal_error', message: 'An unexpected error occurred.', details: {} },
            version,
          },
          errorOptions,
        );
      }
    }

    if (log) {
      const elapsed = Number(process.hrtime.bigint() - started) / 1e6;
      console.log(`${method} ${sanitizeForLog(url.pathname)} ${status} ${elapsed.toFixed(2)}ms`);
    }
  };
}
