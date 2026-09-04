/**
 * A tiny zero-dependency HTTP router.
 *
 * Routes are declared as `{ method, path, handler }` records. Paths support
 * `:name` parameters which are matched and URL-decoded at request time.
 * Matching is done in registration order, so static segments (e.g.
 * `/v1/words/topics`) should be registered before parameterised ones
 * (e.g. `/v1/words/:id`).
 */

import type { IncomingMessage, ServerResponse } from "node:http";

export type HttpMethod = "GET" | "POST";

export interface RequestContext {
  readonly req: IncomingMessage;
  readonly res: ServerResponse;
  readonly params: Readonly<Record<string, string>>;
  readonly query: URLSearchParams;
  /** Parsed JSON body; only set for POST routes. */
  readonly body?: unknown;
}

export type Handler = (ctx: RequestContext) => void | Promise<void>;

export interface Route {
  readonly method: HttpMethod;
  readonly path: string;
  readonly summary: string;
  readonly handler: Handler;
}

type Segment =
  | { readonly kind: "literal"; readonly value: string }
  | { readonly kind: "param"; readonly name: string };

interface CompiledRoute {
  readonly route: Route;
  readonly segments: readonly Segment[];
}

export function compilePath(path: string): readonly Segment[] {
  return path
    .split("/")
    .filter((part) => part.length > 0)
    .map((part) =>
      part.startsWith(":")
        ? { kind: "param", name: part.slice(1) }
        : { kind: "literal", value: part },
    );
}

function compileRoute(route: Route): CompiledRoute {
  return { route, segments: compilePath(route.path) };
}

function matchSegments(
  segments: readonly Segment[],
  parts: readonly string[],
): Record<string, string> | undefined {
  if (segments.length !== parts.length) {
    return undefined;
  }
  const params: Record<string, string> = {};
  for (const [index, segment] of segments.entries()) {
    // Segment counts are equal, so the cast is safe.
    const part = parts[index] as string;
    if (segment.kind === "literal") {
      if (segment.value !== part) {
        return undefined;
      }
    } else {
      try {
        params[segment.name] = decodeURIComponent(part);
      } catch {
        // Malformed percent-encoding (e.g. "%ZZ"): treat as no match.
        return undefined;
      }
    }
  }
  return params;
}

export type ResolveResult =
  | {
      readonly kind: "matched";
      readonly route: Route;
      readonly params: Readonly<Record<string, string>>;
    }
  | { readonly kind: "method_not_allowed"; readonly allowed: readonly string[] }
  | { readonly kind: "not_found" };

/**
 * Resolve a request against a route table. When the path exists but the
 * method differs, a `method_not_allowed` result lists the allowed methods.
 */
export function resolve(
  routes: readonly Route[],
  method: string,
  pathname: string,
): ResolveResult {
  // Empty path segments are preserved so that "/v1//words" (a typo) does
  // not silently alias "/v1/words".
  const parts = pathname === "/" ? [] : pathname.split("/").slice(1);
  const allowed = new Set<string>();
  for (const route of routes) {
    const compiled = compileRoute(route);
    const params = matchSegments(compiled.segments, parts);
    if (params === undefined) {
      continue;
    }
    if (route.method === method) {
      return { kind: "matched", route, params };
    }
    allowed.add(route.method);
  }
  if (allowed.size > 0) {
    return { kind: "method_not_allowed", allowed: [...allowed] };
  }
  return { kind: "not_found" };
}

/** Convenience factory used by route modules. */
export const route = (
  method: HttpMethod,
  path: string,
  summary: string,
  handler: Handler,
): Route => ({ method, path, summary, handler });
