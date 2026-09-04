import { ApiError, methodNotAllowed, notFound } from './errors.ts';

/** Normalised request passed to handlers. */
export interface ApiRequest {
  method: string;
  path: string;
  query: URLSearchParams;
  params: Record<string, string>;
  body: unknown;
}

/** Response returned by handlers. */
export interface ApiResponse {
  status: number;
  body: unknown;
}

/** A route handler. */
export type Handler = (request: ApiRequest) => ApiResponse | Promise<ApiResponse>;

interface Route {
  method: string;
  segments: string[];
  handler: Handler;
}

/** Minimal, dependency-free router with `:param` segment support. */
export class Router {
  private readonly routes: Route[] = [];

  /** Register a handler for a method and path pattern. */
  public add(method: string, pattern: string, handler: Handler): this {
    this.routes.push({
      method: method.toUpperCase(),
      segments: split(pattern),
      handler,
    });
    return this;
  }

  /** Register a GET handler. */
  public get(pattern: string, handler: Handler): this {
    return this.add('GET', pattern, handler);
  }

  /** Register a POST handler. */
  public post(pattern: string, handler: Handler): this {
    return this.add('POST', pattern, handler);
  }

  /** Resolve and execute a request, converting failures into responses. */
  public async handle(request: {
    method: string;
    url: string;
    body?: unknown;
  }): Promise<ApiResponse> {
    const url = new URL(request.url, 'http://localhost');
    const segments = split(url.pathname);
    const method = request.method.toUpperCase();
    let pathMatched = false;

    for (const route of this.routes) {
      const params = match(route.segments, segments);
      if (params === null) continue;
      pathMatched = true;
      if (route.method !== method && !(route.method === 'GET' && method === 'HEAD')) {
        continue;
      }
      try {
        return await route.handler({
          method,
          path: url.pathname,
          query: url.searchParams,
          params,
          body: request.body,
        });
      } catch (error) {
        return toErrorResponse(error);
      }
    }

    return toErrorResponse(
      pathMatched
        ? methodNotAllowed(`Method ${method} is not allowed for ${url.pathname}`, {
            path: url.pathname,
          })
        : notFound(`No route matches ${url.pathname}`, { path: url.pathname }),
    );
  }
}

/** Convert any thrown value into an error response. */
export function toErrorResponse(error: unknown): ApiResponse {
  if (error instanceof ApiError) {
    return { status: error.status, body: error.toJSON() };
  }
  const message = error instanceof Error ? error.message : 'Unknown error';
  return {
    status: 500,
    body: { error: { code: 'INTERNAL', message, details: {} } },
  };
}

function split(path: string): string[] {
  return path.split('/').filter((segment) => segment.length > 0);
}

function match(pattern: string[], actual: string[]): Record<string, string> | null {
  if (pattern.length !== actual.length) return null;
  const params: Record<string, string> = {};
  for (let index = 0; index < pattern.length; index += 1) {
    const expected = pattern[index]!;
    const received = actual[index]!;
    if (expected.startsWith(':')) {
      params[expected.slice(1)] = decodeURIComponent(received);
    } else if (expected !== received) {
      return null;
    }
  }
  return params;
}
