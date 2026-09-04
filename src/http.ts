/**
 * Minimal HTTP helpers: typed JSON responses, API errors, and body parsing.
 *
 * The request-body reader accepts any object with Node stream-style `on`
 * methods so it can be unit-tested deterministically without sockets.
 */

import type { ServerResponse } from "node:http";

/** Error type that maps cleanly onto an HTTP JSON error response. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  readonly headers: Readonly<Record<string, string>>;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
    headers?: Readonly<Record<string, string>>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.headers = headers ?? {};
  }
}

export const badRequest = (message: string, details?: unknown): ApiError =>
  new ApiError(400, "bad_request", message, details);

export const notFound = (message: string): ApiError =>
  new ApiError(404, "not_found", message);

/** 405 with an `Allow` header and the allowed list in the JSON details. */
export const methodNotAllowed = (allowed: readonly string[]): ApiError =>
  new ApiError(
    405,
    "method_not_allowed",
    `Method not allowed. Allowed methods: ${allowed.join(", ")}`,
    { allowed },
    { allow: allowed.join(", ") },
  );

/** Standard error body shape: `{ error: { code, message, details? } }`. */
export interface ErrorBody {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
  };
}

export function errorBody(error: ApiError): ErrorBody {
  return {
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
    },
  };
}

/** Serialise `body` as JSON and end the response. */
export function sendJson(
  res: ServerResponse,
  status: number,
  body: unknown,
  headers?: Readonly<Record<string, string>>,
): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": String(Buffer.byteLength(payload)),
    ...headers,
  });
  res.end(payload);
}

/** Send an `ApiError` (or wrap an unexpected error as HTTP 500). */
export function sendError(res: ServerResponse, error: unknown): void {
  if (res.writableEnded) {
    // The handler already responded (then threw): nothing more to send.
    return;
  }
  if (error instanceof ApiError) {
    sendJson(res, error.status, errorBody(error), error.headers);
    return;
  }
  // Unexpected failure: log the full stack for operators, keep the client
  // response generic so internals never leak.
  console.error("Unhandled error while serving request:", error);
  sendJson(
    res,
    500,
    errorBody(new ApiError(500, "internal_error", "Internal server error")),
  );
}

/** Anything that behaves like the read side of an IncomingMessage. */
export interface BodyReader {
  on(event: "data", listener: (chunk: Buffer) => void): BodyReader;
  on(event: "end", listener: () => void): BodyReader;
  on(event: "error", listener: (error: Error) => void): BodyReader;
  destroy(): void;
}

export const MAX_BODY_BYTES = 65_536;

/**
 * Read and JSON-parse a request body, rejecting oversized or malformed
 * payloads with `413` / `400`.
 */
export function readJsonBody(
  req: BodyReader,
  maxBytes: number = MAX_BODY_BYTES,
): Promise<unknown> {
  return new Promise<unknown>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let settled = false;
    const fail = (error: ApiError): void => {
      if (settled) {
        return;
      }
      settled = true;
      reject(error);
    };
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBytes) {
        req.destroy();
        fail(
          new ApiError(
            413,
            "payload_too_large",
            `Request body exceeds ${maxBytes} bytes`,
          ),
        );
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        fail(badRequest("Request body must be valid JSON"));
      }
    });
    req.on("error", (error: Error) => {
      fail(
        new ApiError(
          400,
          "bad_request",
          `Failed to read request body: ${error.message}`,
        ),
      );
    });
  });
}

/**
 * Validate that a parsed JSON body is a plain object (not an array, string,
 * number, or null) and return it as a record.
 */
export function asObject(
  value: unknown,
  message: string,
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw badRequest(message);
  }
  return value as Record<string, unknown>;
}
