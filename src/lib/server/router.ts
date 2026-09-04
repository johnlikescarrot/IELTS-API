import type { Handler, HandlerContext, HttpMethod } from "./types.js";

/** Internal compiled route record. */
export interface RouteEntry {
  method: HttpMethod;
  /** The original path template, e.g. `/v1/papers/:id`. */
  template: string;
  /** Raw path tokens; a token beginning with `:` is a dynamic parameter. */
  segments: readonly string[];
  handler: Handler;
}

/** The outcome of matching a request path against a route template. */
export interface RouteMatch {
  entry: RouteEntry;
  params: Record<string, string>;
}

const DYNAMIC_PREFIX = ":";

/**
 * Split and normalise a URL path into segments. A leading slash is dropped,
 * empty segments caused by repeated slashes are ignored, and percent-encoding
 * is decoded. Trailing slashes are harmless.
 */
export function splitPath(path: string): string[] {
  return path
    .split("/")
    .filter((segment) => segment.length > 0)
    .map((segment) => decodeURIComponent(segment));
}

/** Extract the dynamic parameter names from a set of path tokens. */
function paramNames(segments: readonly string[]): string[] {
  return segments
    .filter((segment) => segment.startsWith(DYNAMIC_PREFIX))
    .map((segment) => segment.slice(1));
}

/** True when a template token matches a request segment. */
function tokenMatches(token: string, segment: string): boolean {
  return token.startsWith(DYNAMIC_PREFIX) || token === segment;
}

/**
 * A small in-memory router. Routes are matched in registration order; to
 * handle ambiguity such as `/v1/items/new` vs `/v1/items/:id`, register the
 * more specific literal route first.
 */
export class Router {
  private readonly routes: RouteEntry[] = [];

  add(method: HttpMethod, template: string, handler: Handler): this {
    this.routes.push({
      method,
      template,
      segments: splitPath(template),
      handler,
    });
    return this;
  }

  get(template: string, handler: Handler): this {
    return this.add("GET", template, handler);
  }

  post(template: string, handler: Handler): this {
    return this.add("POST", template, handler);
  }

  /** Match a method + pathname; returns undefined when no route matches. */
  match(method: HttpMethod, pathname: string): RouteMatch | undefined {
    const segments = splitPath(pathname);
    for (const entry of this.routes) {
      if (entry.method !== method || entry.segments.length !== segments.length) {
        continue;
      }
      let matched = true;
      const params: Record<string, string> = {};
      for (let i = 0; i < segments.length; i += 1) {
        const token = entry.segments[i] as string;
        if (token.startsWith(DYNAMIC_PREFIX)) {
          params[token.slice(1)] = segments[i] as string;
        } else if (token !== segments[i]) {
          matched = false;
          break;
        }
      }
      if (matched) {
        return { entry, params };
      }
    }
    return undefined;
  }

  /** The HTTP methods registered for a given pathname (used for 405 responses). */
  allowedMethods(pathname: string): HttpMethod[] {
    const segments = splitPath(pathname);
    const methods = new Set<HttpMethod>();
    for (const entry of this.routes) {
      if (entry.segments.length !== segments.length) {
        continue;
      }
      let matched = true;
      for (let i = 0; i < segments.length; i += 1) {
        const token = entry.segments[i] as string;
        if (!tokenMatches(token, segments[i] as string)) {
          matched = false;
          break;
        }
      }
      if (matched) {
        methods.add(entry.method);
      }
    }
    return [...methods].sort();
  }

  /** Run a matched handler with a full context, throwing on handler failure. */
  execute(
    method: HttpMethod,
    pathname: string,
    context: Omit<HandlerContext, "params" | "method" | "path">,
  ): unknown {
    const match = this.match(method, pathname);
    if (!match) {
      return undefined;
    }
    return match.entry.handler({
      ...context,
      method,
      path: pathname,
      params: match.params,
    });
  }

  /** Snapshot of every registered route (used for self-documentation). */
  list(): readonly RouteEntry[] {
    return this.routes.map((route) => ({
      ...route,
      segments: [...route.segments],
    }));
  }

  /** The dynamic parameter names exposed by the template (used for docs). */
  paramNamesOf(route: RouteEntry): string[] {
    return paramNames(route.segments);
  }
}
