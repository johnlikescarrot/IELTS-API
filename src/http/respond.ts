/**
 * Request and response value types plus the JSON envelope used by every
 * endpoint.
 *
 * The HTTP layer is expressed as a pure function from {@link ApiRequest} to
 * {@link ApiResponse}. Node's `http` module is only ever an adapter around that
 * function, which means the entire API surface can be tested without opening a
 * socket, and the same core can be hosted on any runtime.
 *
 * @packageDocumentation
 */

import { ApiError, isApiError } from "../core/errors.ts";

/** A normalised inbound request. */
export interface ApiRequest {
  /** Upper-case HTTP method. */
  readonly method: string;
  /** Path without the query string, always starting with `/`. */
  readonly path: string;
  /** Parsed query string. */
  readonly query: URLSearchParams;
  /** Lower-cased header names mapped to values. */
  readonly headers: Readonly<Record<string, string>>;
  /** Raw request body, or `null` when there is none. */
  readonly body: string | null;
}

/** A fully rendered response. */
export interface ApiResponse {
  /** HTTP status code. */
  readonly status: number;
  /** Response headers. */
  readonly headers: Readonly<Record<string, string>>;
  /** Serialised response body. */
  readonly body: string;
}

/** Metadata attached to a successful payload. */
export interface ResponseMeta {
  /** Number of items in a collection payload. */
  readonly count?: number;
  /** Total number of items available before pagination. */
  readonly total?: number;
  /** Zero-based offset applied to a collection payload. */
  readonly offset?: number;
  /** Maximum number of items requested. */
  readonly limit?: number;
  /** Deterministic seed used to generate the payload. */
  readonly seed?: number;
  /** Bibliographic sources backing the payload. */
  readonly sources?: readonly string[];
}

/** What a route handler may return. */
export type HandlerResult =
  | {
      readonly kind: "json";
      readonly status?: number;
      readonly data: unknown;
      readonly meta?: ResponseMeta;
    }
  | {
      readonly kind: "raw";
      readonly status?: number;
      readonly contentType: string;
      readonly body: string;
    };

/** Convenience constructor for a JSON payload. */
export function json(data: unknown, meta?: ResponseMeta): HandlerResult {
  return meta === undefined
    ? { kind: "json", data }
    : { kind: "json", data, meta };
}

/** Convenience constructor for a collection payload with count metadata. */
export function collection(
  items: readonly unknown[],
  meta: ResponseMeta = {},
): HandlerResult {
  return { kind: "json", data: items, meta: { count: items.length, ...meta } };
}

/** Convenience constructor for a non-JSON payload such as the docs page. */
export function raw(contentType: string, body: string): HandlerResult {
  return { kind: "raw", contentType, body };
}

/** Headers applied to every response, including errors. */
export const BASE_HEADERS: Readonly<Record<string, string>> = Object.freeze({
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, HEAD, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "86400",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  vary: "Accept-Encoding",
});

function byteLength(body: string): string {
  return String(Buffer.byteLength(body, "utf8"));
}

/**
 * Renders a handler result into a complete response.
 *
 * @param result - The value returned by a route handler.
 * @param pretty - Whether to indent JSON output.
 */
export function render(result: HandlerResult, pretty: boolean): ApiResponse {
  if (result.kind === "raw") {
    return {
      status: result.status ?? 200,
      headers: {
        ...BASE_HEADERS,
        "content-type": result.contentType,
        "content-length": byteLength(result.body),
      },
      body: result.body,
    };
  }

  const payload =
    result.meta === undefined
      ? { data: result.data }
      : { data: result.data, meta: result.meta };
  const body = JSON.stringify(payload, null, pretty ? 2 : 0);

  return {
    status: result.status ?? 200,
    headers: {
      ...BASE_HEADERS,
      "content-type": "application/json; charset=utf-8",
      "content-length": byteLength(body),
    },
    body,
  };
}

/**
 * Renders any thrown value into an error response.
 *
 * Unknown failures are reported as HTTP 500 without leaking internals.
 *
 * @param error - The thrown value.
 * @param pretty - Whether to indent JSON output.
 */
export function renderError(error: unknown, pretty: boolean): ApiResponse {
  const apiError = isApiError(error)
    ? error
    : new ApiError("bad_request", "The request could not be processed.");
  const status = isApiError(error) ? apiError.status : 500;
  const payload = isApiError(error)
    ? apiError.toJSON()
    : {
        error: {
          code: "internal_error",
          message: "An unexpected error occurred.",
          details: {},
        },
      };
  const body = JSON.stringify(payload, null, pretty ? 2 : 0);

  return {
    status,
    headers: {
      ...BASE_HEADERS,
      "content-type": "application/json; charset=utf-8",
      "content-length": byteLength(body),
    },
    body,
  };
}
