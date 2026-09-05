/**
 * Query-string helpers shared by every route.
 */

import { badRequest } from './errors.js';

import type { QueryParams } from '../types.js';

/** Default page size for paginated endpoints. */
export const DEFAULT_LIMIT = 20;

/** Maximum page size accepted by paginated endpoints. */
export const MAX_LIMIT = 100;

/**
 * Read a single string parameter.
 *
 * Repeated parameters (`?tag=a&tag=b`) are rejected rather than silently
 * truncated, so clients never receive a partially-applied filter.
 */
export function getString(params: QueryParams, key: string): string | undefined {
  const value = params[key];
  if (value === undefined) {
    return undefined;
  }
  if (Array.isArray(value)) {
    throw badRequest(`Parameter "${key}" must be provided at most once.`, { parameter: key });
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

/** Read a required single string parameter. */
export function requireString(params: QueryParams, key: string): string {
  const value = getString(params, key);
  if (value === undefined) {
    throw badRequest(`Parameter "${key}" is required.`, { parameter: key });
  }
  return value;
}

/** Read an integer parameter constrained to an inclusive range with a fallback. */
export function getInt(params: QueryParams, key: string, min: number, max: number, fallback: number): number {
  const raw = getString(params, key);
  if (raw === undefined) {
    return fallback;
  }
  if (!/^[+-]?\d+$/.test(raw)) {
    throw badRequest(`Parameter "${key}" must be an integer.`, { parameter: key, received: raw });
  }
  const parsed = Number.parseInt(raw, 10);
  if (parsed < min || parsed > max) {
    throw badRequest(`Parameter "${key}" must be between ${min} and ${max}.`, {
      parameter: key,
      received: raw,
      min: String(min),
      max: String(max),
    });
  }
  return parsed;
}

/** Read an optional integer parameter constrained to an inclusive range. */
export function getOptionalInt(
  params: QueryParams,
  key: string,
  min: number,
  max: number,
): number | undefined {
  const raw = getString(params, key);
  if (raw === undefined) {
    return undefined;
  }
  if (!/^[+-]?\d+$/.test(raw)) {
    throw badRequest(`Parameter "${key}" must be an integer.`, { parameter: key, received: raw });
  }
  const parsed = Number.parseInt(raw, 10);
  if (parsed < min || parsed > max) {
    throw badRequest(`Parameter "${key}" must be between ${min} and ${max}.`, {
      parameter: key,
      received: raw,
      min: String(min),
      max: String(max),
    });
  }
  return parsed;
}

/** Read a number parameter constrained to an inclusive range. */
export function getNumber(params: QueryParams, key: string, min: number, max: number): number | undefined {
  const raw = getString(params, key);
  if (raw === undefined) {
    return undefined;
  }
  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(raw)) {
    throw badRequest(`Parameter "${key}" must be a number.`, { parameter: key, received: raw });
  }
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw badRequest(`Parameter "${key}" must be between ${min} and ${max}.`, {
      parameter: key,
      received: raw,
      min: String(min),
      max: String(max),
    });
  }
  return parsed;
}

/** Read an enumeration parameter, returning `undefined` when absent. */
export function getEnum<T extends string>(
  params: QueryParams,
  key: string,
  allowed: readonly T[],
): T | undefined {
  const raw = getString(params, key);
  if (raw === undefined) {
    return undefined;
  }
  const match = allowed.find((candidate) => candidate === raw);
  if (match === undefined) {
    throw badRequest(`Parameter "${key}" must be one of: ${allowed.join(', ')}.`, {
      parameter: key,
      received: raw,
      allowed: allowed.join(','),
    });
  }
  return match;
}

/** Read a boolean-ish parameter (`1`, `true`, `yes`, `on` are truthy). */
export function getBoolean(params: QueryParams, key: string, fallback: boolean): boolean {
  const raw = getString(params, key);
  if (raw === undefined) {
    return fallback;
  }
  const normalised = raw.toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalised)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalised)) {
    return false;
  }
  throw badRequest(`Parameter "${key}" must be a boolean.`, { parameter: key, received: raw });
}

/** Read an optional boolean parameter. */
export function getOptionalBoolean(params: QueryParams, key: string): boolean | undefined {
  const raw = getString(params, key);
  if (raw === undefined) {
    return undefined;
  }
  const normalised = raw.toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalised)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalised)) {
    return false;
  }
  throw badRequest(`Parameter "${key}" must be a boolean.`, { parameter: key, received: raw });
}

/** Validate and normalise an ISO-8601 date (`YYYY-MM-DD`). */
export function getIsoDate(params: QueryParams, key: string, fallback: string): string {
  const raw = getString(params, key) ?? fallback;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw badRequest(`Parameter "${key}" must be an ISO date (YYYY-MM-DD).`, {
      parameter: key,
      received: raw,
    });
  }
  const date = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== raw) {
    throw badRequest(`Parameter "${key}" is not a valid calendar date.`, {
      parameter: key,
      received: raw,
    });
  }
  return raw;
}

/**
 * Convert a URL's search parameters into the {@link QueryParams} record used by
 * the helpers above.
 *
 * @param url - Request URL.
 */
export function toParams(url: URL): QueryParams {
  const params: QueryParams = {};
  for (const key of new Set(url.searchParams.keys())) {
    const values = url.searchParams.getAll(key);
    params[key] = values.length > 1 ? values : (values[0] as string);
  }
  return params;
}
