/**
 * The request dispatcher.
 *
 * Everything between the socket and the route handlers lives here: method
 * checking, route matching, request-body parsing, error translation, ETag
 * negotiation, compression and request logging. Handlers stay pure and
 * trivially testable.
 */

import {
  badRequest,
  HttpError,
  methodNotAllowed,
  notFound,
  payloadTooLarge,
  unsupportedMediaType,
} from './lib/errors.js';
import { acceptsGzip, sendJson, writeResponse } from './lib/http.js';
import { isRawResult, matchRoute, splitPath } from './lib/route.js';
import { ROUTES } from './routes/index.js';
import { API_VERSION } from './version.js';

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { RouteDefinition } from './lib/route.js';
import type { JsonValue } from './types.js';

/** Maximum request-body size accepted by POST routes, in bytes. */
export const MAX_BODY_BYTES = 262_144;

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
}

/**
 * List the methods allowed on a path template (`HEAD` is implied by `GET`).
 *
 * @param routes - The live route table.
 * @param path - Matched path template.
 */
export function allowedMethods(routes: readonly RouteDefinition[], path: string): readonly string[] {
  const allowed = new Set<string>();
  for (const route of routes) {
    if (route.path === path) {
      allowed.add(route.method);
      if (route.method === 'GET') {
        allowed.add('HEAD');
      }
    }
  }
  return [...allowed].sort();
}

/**
 * Read and JSON-parse a POST request body.
 *
 * The stream is always fully consumed (even past {@link MAX_BODY_BYTES}, so
 * the connection is left in a clean state), then rejected with `413`. Bodies
 * must declare (or, when empty, imply) a JSON content type.
 *
 * @param req - Incoming request.
 */
async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  let exceeded = false;
  for await (const chunk of req as AsyncIterable<Buffer>) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      exceeded = true;
    } else {
      chunks.push(chunk);
    }
  }
  if (exceeded) {
    throw payloadTooLarge('Request body exceeds the 256 KiB limit.', {
      maxBytes: String(MAX_BODY_BYTES),
    });
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (raw.trim().length > 0) {
    const contentType = req.headers['content-type'];
    if (contentType !== undefined && !/^application\/json(?:\s*;|\s*$)/i.test(contentType)) {
      throw unsupportedMediaType('Request body must use the application/json content type.', {
        received: contentType,
      });
    }
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw badRequest('Request body is not valid JSON.', {
      hint: 'POST a JSON object such as {"text": "..."}.',
    });
  }
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

  /** The dispatch body, run asynchronously so POST bodies can be read. */
  async function dispatch(req: IncomingMessage, res: ServerResponse): Promise<void> {
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
      } else {
        const match = matchRoute(routes, splitPath(url.pathname));
        if (match === undefined) {
          throw notFound(`No endpoint matches ${url.pathname}.`, {
            path: url.pathname,
            documentation: '/docs',
          });
        }
        const wanted = method === 'HEAD' ? 'GET' : method;
        const route = routes.find(
          (candidate) => candidate.path === match.route.path && candidate.method === wanted,
        );
        if (route === undefined) {
          const allowed = allowedMethods(routes, match.route.path);
          throw methodNotAllowed(
            `Method ${method} is not allowed for ${match.route.path}.`,
            allowed.join(', '),
          );
        }
        const body = method === 'POST' ? await readJsonBody(req) : undefined;
        const result = route.handler({
          url,
          params: match.params,
          method,
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
            endpoint: route.path,
            version,
            ...(result.meta ?? {}),
          };
          sendJson(res, 200, result.data, meta, {
            gzipAllowed,
            ifNoneMatch,
            headOnly: method === 'HEAD',
            headers: { 'x-endpoint': route.path },
          });
        }
      }
    } catch (error) {
      const httpError = error instanceof HttpError ? error : undefined;
      if (httpError !== undefined) {
        status = httpError.status;
        const headers: Record<string, string> = { 'x-endpoint': url.pathname };
        const allow = httpError.details.allow;
        if (allow !== undefined) {
          headers.allow = allow;
        }
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
          { gzipAllowed, headers },
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

  return (req, res) => {
    void dispatch(req, res);
  };
}
