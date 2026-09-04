import type { ServiceResponse } from "./types.js";
import { ApiError, isApiError } from "../errors.js";

/** CORS headers applied to every response so browsers on any origin may call. */
export const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "Content-Type, Accept",
  "access-control-max-age": "86400",
};

/** Build a JSON {@link ServiceResponse}. */
export function json(
  status: number,
  payload: unknown,
  extraHeaders: Record<string, string> = {},
): ServiceResponse {
  return {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...CORS_HEADERS,
      ...extraHeaders,
    },
    body: JSON.stringify(payload),
  };
}

/** Wrap a successful value in the standard `{ data, meta }` envelope. */
export function ok(data: unknown, meta?: Record<string, unknown>): ServiceResponse {
  const payload = meta ? { data, meta } : { data };
  return json(200, payload);
}

/** Narrow a handler result to a {@link ServiceResponse} when it is one. */
export function isServiceResponse(value: unknown): value is ServiceResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.status === "number" &&
    typeof candidate.body === "string" &&
    typeof candidate.headers === "object" &&
    candidate.headers !== null
  );
}

/** Serialise a thrown error into a JSON error {@link ServiceResponse}. */
export function fromError(error: unknown): ServiceResponse {
  if (isApiError(error)) {
    return errorResponse(error);
  }
  return json(500, {
    error: {
      code: "internal_error",
      message: "An unexpected internal error occurred.",
    },
  });
}

/** Build a JSON error response from an {@link ApiError}. */
export function errorResponse(error: ApiError): ServiceResponse {
  const body: Record<string, unknown> = {
    error: {
      code: error.code,
      message: error.message,
    },
  };
  if (error.details !== undefined) {
    (body.error as Record<string, unknown>).details = error.details;
  }
  return json(error.status, body);
}
