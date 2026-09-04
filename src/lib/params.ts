/**
 * Helpers for parsing and validating HTTP query string parameters. Every
 * helper throws an {@link ApiError} (HTTP 400) when its input is unusable so
 * handlers stay concise and safe.
 */
import { badRequest } from "./errors.js";

/** A parsed integer with an optional minimum and maximum constraint. */
export interface IntOptions {
  min?: number;
  max?: number;
  required?: boolean;
}

/**
 * Parse a raw query value as an integer, clamping nothing but validating
 * range constraints. Absent (or empty) values yield `undefined` unless the
 * parameter is declared required.
 */
export function parseInteger(
  raw: string | null | undefined,
  name: string,
  options: IntOptions = {},
): number | undefined {
  const { min, max, required = false } = options;
  if (raw === undefined || raw === null || raw.trim() === "") {
    if (required) {
      throw badRequest(`query parameter "${name}" is required.`, { name });
    }
    return undefined;
  }
  const trimmed = raw.trim();
  if (!/^-?\d+$/.test(trimmed)) {
    throw badRequest(`query parameter "${name}" must be an integer.`, {
      name,
      received: raw,
    });
  }
  const parsed = Number.parseInt(trimmed, 10);
  if (min !== undefined && parsed < min) {
    throw badRequest(`query parameter "${name}" must be at least ${min}; received ${parsed}.`, {
      name,
      min,
      received: parsed,
    });
  }
  if (max !== undefined && parsed > max) {
    throw badRequest(`query parameter "${name}" must be at most ${max}; received ${parsed}.`, {
      name,
      max,
      received: parsed,
    });
  }
  return parsed;
}

/**
 * Parse a raw query value as one of a closed set of string literals. Absent
 * values yield `undefined` unless the parameter is declared required.
 */
export function parseEnum<T extends string>(
  raw: string | null | undefined,
  name: string,
  allowed: readonly T[],
  opts: { required?: boolean; fallback?: T } = {},
): T | undefined {
  if (raw === undefined || raw === null || raw.trim() === "") {
    if (opts.fallback !== undefined) {
      return opts.fallback;
    }
    if (opts.required) {
      throw badRequest(
        `query parameter "${name}" is required; expected one of ${allowed.join(", ")}.`,
        { name, allowed },
      );
    }
    return undefined;
  }
  const value = raw.trim() as T;
  if (!allowed.includes(value)) {
    throw badRequest(
      `query parameter "${name}" must be one of ${allowed.join(", ")}; ` + `received "${raw}".`,
      { name, allowed, received: raw },
    );
  }
  return value;
}

/** Default number of records returned when no page size is supplied. */
export const DEFAULT_LIMIT = 20;

/** Hard ceiling on the number of records a single page may request. */
export const MAX_LIMIT = 100;

export interface PageOptions {
  offset: number;
  limit: number;
}

/**
 * Parse a paging query. Uses the given search parameters object (already a
 * `URLSearchParams`) and clamps `limit` to {@link MAX_LIMIT}.
 */
export function parsePage(query: URLSearchParams): PageOptions {
  const rawLimit = query.get("limit") ?? undefined;
  const rawOffset = query.get("offset") ?? undefined;
  const limit = parseInteger(rawLimit, "limit", {
    min: 1,
    max: MAX_LIMIT,
  });
  const offset = parseInteger(rawOffset, "offset", {
    min: 0,
  });
  return {
    offset: offset ?? 0,
    limit: limit ?? DEFAULT_LIMIT,
  };
}
