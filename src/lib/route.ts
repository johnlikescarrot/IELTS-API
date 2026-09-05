/**
 * Routing primitives shared by the route table and the request dispatcher.
 */

import { badRequest } from './errors.js';

import type { JsonValue, RouteInfo } from '../types.js';

/** Everything a handler needs to produce a response. */
export interface RouteContext {
  /** Fully parsed request URL (path and query string). */
  url: URL;
  /** Path parameters extracted by the router. */
  params: Record<string, string>;
}

/** A handler result rendered as a JSON envelope. */
export interface JsonResult {
  /** Response payload. */
  data: JsonValue;
  /** Extra metadata merged into the response envelope. */
  meta?: Record<string, JsonValue> | undefined;
}

/** A handler result rendered verbatim (used by `/docs`). */
export interface RawResult {
  /** Response rendered without the JSON envelope. */
  raw: {
    /** Content type of the raw response. */
    contentType: string;
    /** Serialised body. */
    body: string;
  };
}

/** What a handler returns. */
export type HandlerResult = JsonResult | RawResult;

/**
 * Narrow a handler result to the raw variant.
 *
 * @param result - Handler result.
 */
export function isRawResult(result: HandlerResult): result is RawResult {
  return 'raw' in result;
}

/** A route handler. */
export type Handler = (context: RouteContext) => HandlerResult;

/** A route definition. */
export interface RouteDefinition extends RouteInfo {
  /** Path template, e.g. `/v1/vocabulary/:word`. */
  path: string;
  /** Handler invoked when the route matches. */
  handler: Handler;
}

/**
 * Split a path into non-empty segments.
 *
 * @param path - URL path.
 */
export function splitPath(path: string): string[] {
  return path.split('/').filter((segment) => segment.length > 0);
}

/** A successful route match. */
export interface RouteMatch {
  /** The matched route. */
  route: RouteDefinition;
  /** Extracted path parameters. */
  params: Record<string, string>;
}

/**
 * Find the first route whose template matches the requested segments.
 *
 * Literal segments must match exactly; segments starting with `:` capture the
 * corresponding path segment. Routes are tried in registration order, so
 * literal routes such as `/v1/vocabulary/stats` must be registered before the
 * parameterised `/v1/vocabulary/:word`.
 *
 * @param routes - Candidate routes.
 * @param segments - Requested path segments.
 */
export function matchRoute(
  routes: readonly RouteDefinition[],
  segments: readonly string[],
): RouteMatch | undefined {
  for (const route of routes) {
    const template = splitPath(route.path);
    if (template.length !== segments.length) {
      continue;
    }
    const params: Record<string, string> = {};
    let matched = true;
    for (let index = 0; index < template.length; index += 1) {
      const expected = template[index] as string;
      const actual = segments[index] as string;
      if (expected.startsWith(':')) {
        try {
          params[expected.slice(1)] = decodeURIComponent(actual);
        } catch {
          throw badRequest('Malformed percent-encoding in path parameter.', { parameter: expected.slice(1) });
        }
        continue;
      }
      if (expected !== actual) {
        matched = false;
        break;
      }
    }
    if (matched) {
      return { route, params };
    }
  }
  return undefined;
}
