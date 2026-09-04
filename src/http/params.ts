/**
 * Parameter parsing and validation helpers.
 *
 * Every helper raises an {@link ApiError} with a machine-readable code so that
 * client-visible validation failures are consistent across all endpoints.
 *
 * @packageDocumentation
 */

import { ApiError } from "../core/errors.ts";
import type { ApiRequest } from "./respond.ts";

/** Maximum accepted request body size in bytes. */
export const MAX_BODY_BYTES = 200_000;

/**
 * Reads a required string parameter.
 *
 * @param query - The parsed query string.
 * @param name - Parameter name.
 */
export function requiredString(query: URLSearchParams, name: string): string {
  const value = query.get(name);
  if (value === null || value.trim().length === 0) {
    throw new ApiError(
      "missing_parameter",
      `The '${name}' parameter is required.`,
      { parameter: name },
    );
  }
  return value.trim();
}

/**
 * Reads an optional string parameter.
 *
 * @param query - The parsed query string.
 * @param name - Parameter name.
 */
export function optionalString(
  query: URLSearchParams,
  name: string,
): string | undefined {
  const value = query.get(name);
  if (value === null || value.trim().length === 0) {
    return undefined;
  }
  return value.trim();
}

/** Options for {@link numberParam}. */
export interface NumberOptions {
  /** Inclusive lower bound. */
  readonly min?: number;
  /** Inclusive upper bound. */
  readonly max?: number;
  /** Whether the value must be an integer. */
  readonly integer?: boolean;
}

/**
 * Parses a string into a bounded number.
 *
 * @param name - Parameter name, used in error messages.
 * @param raw - The raw string value.
 * @param options - Bounds and integrality requirements.
 */
export function parseNumber(
  name: string,
  raw: string,
  options: NumberOptions = {},
): number {
  const value = Number(raw);
  if (raw.trim().length === 0 || !Number.isFinite(value)) {
    throw new ApiError(
      "invalid_parameter",
      `The '${name}' parameter must be a number.`,
      { parameter: name, received: raw },
    );
  }
  if (options.integer === true && !Number.isInteger(value)) {
    throw new ApiError(
      "invalid_parameter",
      `The '${name}' parameter must be an integer.`,
      { parameter: name, received: raw },
    );
  }
  if (options.min !== undefined && value < options.min) {
    throw new ApiError(
      "invalid_parameter",
      `The '${name}' parameter must be at least ${String(options.min)}.`,
      { parameter: name, received: value, min: options.min },
    );
  }
  if (options.max !== undefined && value > options.max) {
    throw new ApiError(
      "invalid_parameter",
      `The '${name}' parameter must be at most ${String(options.max)}.`,
      { parameter: name, received: value, max: options.max },
    );
  }
  return value;
}

/**
 * Reads an optional numeric query parameter.
 *
 * @param query - The parsed query string.
 * @param name - Parameter name.
 * @param options - Bounds and integrality requirements.
 */
export function optionalNumber(
  query: URLSearchParams,
  name: string,
  options: NumberOptions = {},
): number | undefined {
  const raw = optionalString(query, name);
  return raw === undefined ? undefined : parseNumber(name, raw, options);
}

/**
 * Reads a required numeric query parameter.
 *
 * @param query - The parsed query string.
 * @param name - Parameter name.
 * @param options - Bounds and integrality requirements.
 */
export function requiredNumber(
  query: URLSearchParams,
  name: string,
  options: NumberOptions = {},
): number {
  return parseNumber(name, requiredString(query, name), options);
}

/**
 * Validates a value against a closed set of allowed values.
 *
 * @param name - Parameter name, used in error messages.
 * @param raw - The raw string value.
 * @param allowed - The permitted values.
 */
export function parseEnum<T extends string>(
  name: string,
  raw: string,
  allowed: readonly T[],
): T {
  const normalised = raw.trim().toLowerCase();
  const matched = allowed.find((candidate) => candidate === normalised);
  if (matched === undefined) {
    throw new ApiError(
      "invalid_parameter",
      `The '${name}' parameter must be one of: ${allowed.join(", ")}.`,
      { parameter: name, received: raw, allowed },
    );
  }
  return matched;
}

/**
 * Reads an optional enumerated query parameter.
 *
 * @param query - The parsed query string.
 * @param name - Parameter name.
 * @param allowed - The permitted values.
 */
export function optionalEnum<T extends string>(
  query: URLSearchParams,
  name: string,
  allowed: readonly T[],
): T | undefined {
  const raw = optionalString(query, name);
  return raw === undefined ? undefined : parseEnum(name, raw, allowed);
}

/**
 * Reads an optional boolean query parameter. The strings `1`, `true` and `yes`
 * are truthy; `0`, `false` and `no` are falsy.
 *
 * @param query - The parsed query string.
 * @param name - Parameter name.
 */
export function optionalBoolean(
  query: URLSearchParams,
  name: string,
): boolean | undefined {
  const raw = optionalString(query, name);
  if (raw === undefined) {
    return undefined;
  }
  const normalised = raw.toLowerCase();
  if (["1", "true", "yes"].includes(normalised)) {
    return true;
  }
  if (["0", "false", "no"].includes(normalised)) {
    return false;
  }
  throw new ApiError(
    "invalid_parameter",
    `The '${name}' parameter must be a boolean.`,
    { parameter: name, received: raw },
  );
}

/** Pagination window resolved from `limit` and `offset`. */
export interface Pagination {
  /** Maximum number of items to return. */
  readonly limit: number;
  /** Number of items to skip. */
  readonly offset: number;
}

/**
 * Reads `limit` and `offset` query parameters.
 *
 * @param query - The parsed query string.
 * @param defaultLimit - Limit applied when the client does not specify one.
 * @param maxLimit - Hard upper bound on the limit.
 */
export function pagination(
  query: URLSearchParams,
  defaultLimit = 50,
  maxLimit = 1000,
): Pagination {
  const limit =
    optionalNumber(query, "limit", { min: 1, max: maxLimit, integer: true }) ??
    defaultLimit;
  const offset =
    optionalNumber(query, "offset", { min: 0, integer: true }) ?? 0;
  return { limit, offset };
}

/**
 * Parses a JSON request body.
 *
 * @param request - The inbound request.
 * @returns The decoded value, or `undefined` when the body is empty.
 * @throws {ApiError} If the body is too large or is not valid JSON.
 */
export function parseJsonBody(request: ApiRequest): unknown {
  const body = request.body;
  if (body === null || body.trim().length === 0) {
    return undefined;
  }
  if (Buffer.byteLength(body, "utf8") > MAX_BODY_BYTES) {
    throw new ApiError(
      "payload_too_large",
      `Request bodies are limited to ${String(MAX_BODY_BYTES)} bytes.`,
      { limit: MAX_BODY_BYTES },
    );
  }
  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new ApiError("bad_request", "The request body is not valid JSON.");
  }
}

/**
 * Narrows an unknown value to a plain object.
 *
 * @param value - The value to check.
 * @param context - Description used in the error message.
 */
export function asObject(
  value: unknown,
  context: string,
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ApiError("bad_request", `${context} must be a JSON object.`);
  }
  return value as Record<string, unknown>;
}

/**
 * Reads a required numeric field from a decoded JSON object.
 *
 * @param source - The decoded object.
 * @param name - Field name.
 * @param options - Bounds and integrality requirements.
 */
export function requiredNumberField(
  source: Record<string, unknown>,
  name: string,
  options: NumberOptions = {},
): number {
  const value = source[name];
  if (value === undefined || value === null) {
    throw new ApiError(
      "missing_parameter",
      `The '${name}' field is required.`,
      { field: name },
    );
  }
  if (typeof value !== "number" && typeof value !== "string") {
    throw new ApiError(
      "invalid_parameter",
      `The '${name}' field must be a number.`,
      { field: name },
    );
  }
  return parseNumber(name, String(value), options);
}

/**
 * Reads a required string field from a decoded JSON object.
 *
 * @param source - The decoded object.
 * @param name - Field name.
 */
export function requiredStringField(
  source: Record<string, unknown>,
  name: string,
): string {
  const value = source[name];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApiError(
      "missing_parameter",
      `The '${name}' field is required and must be a non-empty string.`,
      { field: name },
    );
  }
  return value;
}
