import { ApiError, type ErrorDetail } from "./errors.ts";

function invalidParameter(name: string, message: string, allowed?: readonly string[]): ApiError {
  const details: ErrorDetail[] = [
    allowed === undefined
      ? { param: name, message }
      : { param: name, message: `${message} Allowed values: ${allowed.join(", ")}.` },
  ];
  return new ApiError(
    400,
    "invalid_parameter",
    `Parameter '${name}' is invalid: ${message}`,
    details,
  );
}

function parseStrictInt(raw: string, name: string): number {
  if (!/^-?\d+$/u.test(raw)) {
    throw invalidParameter(name, `'${raw}' is not an integer.`);
  }
  return Number.parseInt(raw, 10);
}

/** Read an integer query parameter, falling back when absent or empty. */
export function getIntParam(query: URLSearchParams, name: string, fallback: number): number {
  const raw = query.get(name);
  if (raw === null || raw === "") {
    return fallback;
  }
  return parseStrictInt(raw, name);
}

/** Read an integer query parameter constrained to an inclusive range. */
export function getRangeParam(
  query: URLSearchParams,
  name: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const value = getIntParam(query, name, fallback);
  if (value < min || value > max) {
    throw invalidParameter(name, `${value} is outside the range ${min} to ${max}.`);
  }
  return value;
}

/** Read an optional integer query parameter constrained to an inclusive range. */
export function getOptionalRangeParam(
  query: URLSearchParams,
  name: string,
  min: number,
  max: number,
): number | undefined {
  const raw = query.get(name);
  if (raw === null || raw === "") {
    return undefined;
  }
  const value = parseStrictInt(raw, name);
  if (value < min || value > max) {
    throw invalidParameter(name, `${value} is outside the range ${min} to ${max}.`);
  }
  return value;
}

/**
 * Read a query parameter restricted to a set of allowed values.
 * The generic keeps the returned literal-union type.
 */
export function getEnumParam<K extends string>(
  query: URLSearchParams,
  name: string,
  allowed: readonly K[],
  fallback: K,
): K {
  const value = getOptionalEnumParam(query, name, allowed);
  return value ?? fallback;
}

/** Read an optional query parameter restricted to a set of allowed values. */
export function getOptionalEnumParam<K extends string>(
  query: URLSearchParams,
  name: string,
  allowed: readonly K[],
): K | undefined {
  const raw = query.get(name);
  if (raw === null || raw === "") {
    return undefined;
  }
  const match = allowed.find((option) => option === raw);
  if (match === undefined) {
    throw invalidParameter(name, `'${raw}' is not one of the allowed values.`, allowed);
  }
  return match;
}

/** Read a free-text query parameter; absent or blank becomes `undefined`. */
export function getStringParam(query: URLSearchParams, name: string): string | undefined {
  const raw = query.get(name);
  if (raw === null || raw.trim() === "") {
    return undefined;
  }
  return raw.trim();
}

/** Collect the non-empty values of the given parameter names for link building. */
export function activeFilters(
  query: URLSearchParams,
  names: readonly string[],
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const name of names) {
    const value = query.get(name);
    if (value !== null && value !== "") {
      result[name] = value;
    }
  }
  return result;
}
