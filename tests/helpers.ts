import { createApp, type App } from "../src/http/app.ts";
import type { ApiRequest, ApiResponse } from "../src/http/respond.ts";

/** A single shared application instance for read-only route tests. */
export const app: App = createApp();

/** Builds a normalised request for the pure dispatcher. */
export function request(
  method: string,
  target: string,
  body: string | null = null,
  headers: Record<string, string> = {},
): ApiRequest {
  const url = new URL(target, "http://test.local");
  return {
    method,
    path: url.pathname,
    query: url.searchParams,
    headers,
    body,
  };
}

/** Dispatches a request against the shared application. */
export function call(
  method: string,
  target: string,
  body?: unknown,
): ApiResponse {
  const payload =
    body === undefined
      ? null
      : typeof body === "string"
        ? body
        : JSON.stringify(body);
  return app.handle(request(method, target, payload));
}

/** Dispatches a request and parses the JSON envelope. */
export function callJson(
  method: string,
  target: string,
  body?: unknown,
): { status: number; data: any; meta: any; error: any } {
  const response = call(method, target, body);
  const parsed = JSON.parse(response.body) as {
    data?: unknown;
    meta?: unknown;
    error?: unknown;
  };
  return {
    status: response.status,
    data: parsed.data,
    meta: parsed.meta,
    error: parsed.error,
  };
}
