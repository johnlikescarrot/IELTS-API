/**
 * Structured, machine-readable API errors.
 *
 * Every failure surfaced by the HTTP layer is an {@link ApiError}, which makes
 * error responses uniform and independently testable.
 *
 * @packageDocumentation
 */

/** Stable, documented error codes returned in the `error.code` field. */
export type ApiErrorCode =
  | "bad_request"
  | "invalid_parameter"
  | "missing_parameter"
  | "not_found"
  | "method_not_allowed"
  | "payload_too_large"
  | "unsupported_media_type";

const STATUS_BY_CODE: Readonly<Record<ApiErrorCode, number>> = {
  bad_request: 400,
  invalid_parameter: 400,
  missing_parameter: 400,
  not_found: 404,
  method_not_allowed: 405,
  payload_too_large: 413,
  unsupported_media_type: 415,
};

/** An error with an HTTP status code and a stable machine-readable code. */
export class ApiError extends Error {
  /** The stable machine-readable error code. */
  public readonly code: ApiErrorCode;

  /** The HTTP status code associated with {@link ApiError.code}. */
  public readonly status: number;

  /** Optional structured context describing what went wrong. */
  public readonly details: Readonly<Record<string, unknown>>;

  /**
   * @param code - Stable machine-readable error code.
   * @param message - Human-readable description, safe to show to end users.
   * @param details - Optional structured context.
   */
  public constructor(
    code: ApiErrorCode,
    message: string,
    details: Readonly<Record<string, unknown>> = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = details;
  }

  /** Serialises the error into the API's JSON error envelope. */
  public toJSON(): {
    error: {
      code: ApiErrorCode;
      message: string;
      details: Readonly<Record<string, unknown>>;
    };
  } {
    return {
      error: { code: this.code, message: this.message, details: this.details },
    };
  }
}

/** Type guard identifying {@link ApiError} instances. */
export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}
