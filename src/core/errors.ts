/**
 * Error primitives shared by every endpoint.
 *
 * The API never throws raw `Error` objects across a request boundary: every
 * failure is an {@link ApiError} carrying an HTTP status and a machine readable
 * code so that clients can branch without string matching.
 */

/** Machine readable error codes returned in the `error.code` field. */
export type ApiErrorCode = 'BAD_REQUEST' | 'NOT_FOUND' | 'UNPROCESSABLE' | 'METHOD_NOT_ALLOWED';

/** An error that maps deterministically onto an HTTP response. */
export class ApiError extends Error {
  public readonly status: number;
  public readonly code: ApiErrorCode;
  public readonly details: Record<string, unknown>;

  public constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** Serialisable representation embedded in error responses. */
  public toJSON(): {
    error: { code: ApiErrorCode; message: string; details: Record<string, unknown> };
  } {
    return {
      error: { code: this.code, message: this.message, details: this.details },
    };
  }
}

/** 400 helper. */
export const badRequest = (message: string, details: Record<string, unknown> = {}): ApiError =>
  new ApiError(400, 'BAD_REQUEST', message, details);

/** 404 helper. */
export const notFound = (message: string, details: Record<string, unknown> = {}): ApiError =>
  new ApiError(404, 'NOT_FOUND', message, details);

/** 405 helper. */
export const methodNotAllowed = (
  message: string,
  details: Record<string, unknown> = {},
): ApiError => new ApiError(405, 'METHOD_NOT_ALLOWED', message, details);

/** 422 helper. */
export const unprocessable = (message: string, details: Record<string, unknown> = {}): ApiError =>
  new ApiError(422, 'UNPROCESSABLE', message, details);
