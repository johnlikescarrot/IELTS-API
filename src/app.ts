/** Request dispatch, bounded POST ingestion, CORS, cache controls and error translation. */

import { HttpError, badRequest, notFound } from './lib/errors.js';
import { readJsonBody } from './lib/body.js';
import { COMMON_HEADERS, acceptsGzip, sendJson, writeResponse } from './lib/http.js';
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
  /** Whether to log method, path, status and duration (never query strings or bodies). */
  log?: boolean;
  /** Version reported in response metadata. */
  version?: string;
}

/** Create the node:http listener. POST submissions are stateless and never cached. */
export function createRequestHandler(
  options: AppOptions = {},
): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
  const routes = options.routes ?? ROUTES;
  const version = options.version ?? API_VERSION;
  const log = options.log ?? false;

  return async (req, res) => {
    const started = process.hrtime.bigint();
    const method = (req.method ?? 'GET').toUpperCase();
    // A fixed parsing origin avoids trusting Host or proxy forwarding headers.
    let url = new URL('http://localhost/');
    const gzipAllowed = acceptsGzip(req.headers['accept-encoding']);
    const headOnly = method === 'HEAD';
    const isPost = method === 'POST';
    const ifNoneMatch = isPost ? undefined : req.headers['if-none-match'];
    const cacheControl = isPost ? 'no-store' : undefined;
    let allow = 'OPTIONS';

    try {
      const target = req.url ?? '/';
      if (!target.startsWith('/') || target.startsWith('//')) {
        throw badRequest('Use an origin-relative request target.');
      }
      try {
        url = new URL(target, url);
      } catch {
        throw badRequest('The request target is not a valid URL.');
      }
      if (url.origin !== 'http://localhost') {
        throw badRequest('The request target must not specify another origin.');
      }
      const segments = splitPath(url.pathname);
      const pathRoutes = routes.filter((route) => matchRoute([route], segments) !== undefined);
      if (pathRoutes.length === 0) {
        throw notFound(`No endpoint matches ${url.pathname}.`, {
          path: url.pathname,
          documentation: '/docs',
        });
      }
      const methods: string[] = pathRoutes.map((route) => route.method);
      if (methods.includes('GET')) methods.push('HEAD');
      methods.push('OPTIONS');
      allow = [...new Set(methods)].join(', ');

      if (method === 'OPTIONS') {
        res.writeHead(204, { ...COMMON_HEADERS, allow, 'access-control-allow-methods': allow });
        res.end();
      } else {
        const match = matchRoute(pathRoutes, segments, headOnly ? 'GET' : method);
        if (match === undefined) {
          throw new HttpError(405, 'method_not_allowed', 'This method is not supported by this endpoint.', {
            allow,
          });
        }
        const body = isPost ? await readJsonBody(req) : undefined;
        const result = match.route.handler({ url, params: match.params, body });
        const responseOptions = { gzipAllowed, ifNoneMatch, headOnly, cacheControl };
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
          sendJson(res, 200, result.data, meta, {
            ...responseOptions,
            headers: { 'x-endpoint': match.route.path },
          });
        }
      }
    } catch (error) {
      const httpError = error instanceof HttpError ? error : undefined;
      const headers: Record<string, string> = { 'x-endpoint': url.pathname };
      if (isPost) headers.connection = 'close';
      if (httpError?.status === 405) headers.allow = httpError.details.allow ?? allow;
      const errorOptions = { gzipAllowed, headOnly, cacheControl: 'no-store', headers };
      if (httpError !== undefined) {
        sendJson(
          res,
          httpError.status,
          null,
          {
            error: { code: httpError.code, message: httpError.message, details: httpError.details },
            version,
          },
          errorOptions,
        );
      } else {
        // Do not include thrown messages: an embedder's error may contain submitted answers.
        console.error(`ielts-api: unhandled error at ${url.pathname}`);
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
      console.log(`${method} ${url.pathname} ${res.statusCode} ${elapsed.toFixed(2)}ms`);
    }
  };
}
