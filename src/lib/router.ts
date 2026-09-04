import type { IncomingMessage, ServerResponse } from "node:http";
import { ApiError } from "./errors.ts";

/** Everything a route handler needs to serve a request. */
export interface RequestContext {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  query: URLSearchParams;
  params: Record<string, string>;
}

/** The result a handler returns; the app serialises and sends it. */
export interface HandlerResult {
  status: number;
  /** JSON payload (default). */
  body?: unknown;
  /** Non-JSON payload, e.g. a BibTeX citation. */
  raw?: { body: string; contentType: string };
  /**
   * Opt-in to `ETag`/`Cache-Control` caching. Only honoured for successful
   * GET/HEAD responses; everything else is sent with `Cache-Control: no-store`.
   */
  cacheable?: boolean;
}

export type Handler = (ctx: RequestContext) => HandlerResult | Promise<HandlerResult>;

export type HttpMethod = "GET" | "POST";

/** A single registered API route. `path` may contain `:param` segments. */
export interface Route {
  method: HttpMethod;
  path: string;
  summary: string;
  handler: Handler;
}

export type MatchResult =
  | { kind: "matched"; route: Route; params: Record<string, string>; allowed: string[] }
  | { kind: "method_not_allowed"; allowed: string[] }
  | { kind: "not_found" };

/** Split a path into segments, ignoring empty ones (so "//" behaves like "/"). */
export function segmentsOf(path: string): string[] {
  return path.split("/").filter((segment) => segment.length > 0);
}

/** Collapse a trailing slash ("/v1/topics/" matches "/v1/topics"). */
export function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    // Malformed percent-encoding (e.g. "%zz"): keep the raw text.
    return segment;
  }
}

function matchSegments(
  pattern: readonly string[],
  actual: readonly string[],
): Record<string, string> | undefined {
  if (pattern.length !== actual.length) {
    return undefined;
  }
  const params: Record<string, string> = {};
  for (let i = 0; i < pattern.length; i++) {
    // The loop bound and the length check above guarantee both indices exist.
    const patternSegment = pattern[i] as string;
    const actualSegment = actual[i] as string;
    if (patternSegment.startsWith(":")) {
      params[patternSegment.slice(1)] = decodeSegment(actualSegment);
    } else if (patternSegment !== actualSegment) {
      return undefined;
    }
  }
  return params;
}

/**
 * Read a path parameter from the request context. Route patterns guarantee
 * the parameter exists, so this never throws for a matched route.
 */
export function getParam(ctx: RequestContext, name: string): string {
  const value = ctx.params[name];
  if (value === undefined) {
    throw new ApiError(500, "route_error", `Route parameter '${name}' is missing.`);
  }
  return value;
}

/**
 * Match a request against the route table.
 *
 * HEAD is served by GET handlers (the app strips the body). The `allowed`
 * list on matches and 405s includes OPTIONS, which the app answers with 204.
 */
export function matchRoute(
  routes: readonly Route[],
  method: string,
  pathname: string,
): MatchResult {
  const target = segmentsOf(normalizePath(pathname));
  const lookupMethod = method === "HEAD" ? "GET" : method;

  const allowed = new Set<string>();
  let matched: { route: Route; params: Record<string, string> } | undefined;

  for (const route of routes) {
    const params = matchSegments(segmentsOf(route.path), target);
    if (params === undefined) {
      continue;
    }
    if (route.method === "GET") {
      allowed.add("HEAD");
    }
    allowed.add(route.method);
    if (route.method === lookupMethod && matched === undefined) {
      matched = { route, params };
    }
  }

  if (matched !== undefined) {
    allowed.add("OPTIONS");
    return { kind: "matched", route: matched.route, params: matched.params, allowed: [...allowed] };
  }
  if (allowed.size > 0) {
    allowed.add("OPTIONS");
    return { kind: "method_not_allowed", allowed: [...allowed] };
  }
  return { kind: "not_found" };
}
