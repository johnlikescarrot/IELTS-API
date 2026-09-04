/**
 * A minimal, dependency-free path router.
 *
 * Routes are declared as static segments plus `:name` parameters. Matching is
 * linear in the number of registered routes, which is more than adequate for an
 * API of this size and keeps the implementation small enough to verify
 * exhaustively.
 *
 * @packageDocumentation
 */

/** HTTP methods the router understands. */
export type HttpMethod = "GET" | "POST" | "OPTIONS" | "HEAD";

/** Path parameters captured from a matched route. */
export type RouteParams = Readonly<Record<string, string>>;

/** A registered route. */
export interface Route<H> {
  /** The HTTP method. */
  readonly method: HttpMethod;
  /** The path pattern, for example `/v1/conversion/:paper/:raw`. */
  readonly pattern: string;
  /** The value associated with the route, normally a handler function. */
  readonly handler: H;
}

/** The result of a successful match. */
export interface RouteMatch<H> {
  /** The matched route. */
  readonly route: Route<H>;
  /** The captured path parameters, URI-decoded. */
  readonly params: RouteParams;
}

/** Outcome of routing a request. */
export type RoutingResult<H> =
  | { readonly kind: "matched"; readonly match: RouteMatch<H> }
  | {
      readonly kind: "method-not-allowed";
      readonly allowed: readonly HttpMethod[];
    }
  | { readonly kind: "not-found" };

function segments(path: string): string[] {
  return path.split("/").filter((segment) => segment.length > 0);
}

function matchPattern(pattern: string, path: string): RouteParams | null {
  const patternParts = segments(pattern);
  const pathParts = segments(path);
  if (patternParts.length !== pathParts.length) {
    return null;
  }

  const params: Record<string, string> = {};
  for (let index = 0; index < patternParts.length; index += 1) {
    const expected = patternParts[index]!;
    const actual = pathParts[index]!;
    if (expected.startsWith(":")) {
      params[expected.slice(1)] = safeDecode(actual);
      continue;
    }
    if (expected !== actual) {
      return null;
    }
  }
  return params;
}

/**
 * Decodes a URI component, falling back to the raw value for malformed input
 * rather than throwing.
 *
 * @param value - A raw path segment.
 */
export function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** A collection of routes that can resolve a method and path to a handler. */
export class Router<H> {
  readonly #routes: Route<H>[] = [];

  /**
   * Registers a route.
   *
   * @param method - HTTP method.
   * @param pattern - Path pattern.
   * @param handler - Handler value.
   * @returns The router, for chaining.
   */
  public add(method: HttpMethod, pattern: string, handler: H): this {
    this.#routes.push({ method, pattern, handler });
    return this;
  }

  /** All registered routes in registration order. */
  public get routes(): readonly Route<H>[] {
    return this.#routes;
  }

  /**
   * Resolves a method and path.
   *
   * @param method - HTTP method of the incoming request.
   * @param path - Path of the incoming request, without the query string.
   */
  public resolve(method: string, path: string): RoutingResult<H> {
    const allowed = new Set<HttpMethod>();

    for (const route of this.#routes) {
      const params = matchPattern(route.pattern, path);
      if (params === null) {
        continue;
      }
      if (route.method === method) {
        return { kind: "matched", match: { route, params } };
      }
      allowed.add(route.method);
    }

    if (allowed.size > 0) {
      return { kind: "method-not-allowed", allowed: [...allowed].sort() };
    }
    return { kind: "not-found" };
  }
}
