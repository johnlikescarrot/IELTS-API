/**
 * Small collection utilities shared by the resource handlers.
 */

import { badRequest } from "../http.js";

/** Find an item by exact `id`, or `undefined`. */
export function findById<T extends { readonly id: string }>(
  items: readonly T[],
  id: string,
): T | undefined {
  return items.find((item) => item.id === id);
}

/**
 * Validate an optional enum-valued query parameter. Returns `null` when the
 * parameter is absent, the canonical value when valid, and throws a 400
 * listing the allowed values otherwise.
 */
export function parseEnumOption<T extends string>(
  value: string | null,
  allowed: readonly T[],
  name: string,
): T | null {
  if (value === null) {
    return null;
  }
  const match = allowed.find((candidate) => candidate === value);
  if (match === undefined) {
    throw badRequest(
      `Parameter '${name}' must be one of: ${allowed.join(", ")}`,
      { parameter: name, value, allowed },
    );
  }
  return match;
}

/**
 * Validate a required enum value from a query string or JSON body: missing
 * values, non-strings, and unknown members all produce a 400 listing the
 * allowed values.
 */
export function requiredEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  name: string,
): T {
  if (value === undefined || value === null) {
    throw badRequest(`'${name}' is required`, { field: name });
  }
  if (
    typeof value !== "string" ||
    !(allowed as readonly string[]).includes(value)
  ) {
    throw badRequest(`'${name}' must be one of: ${allowed.join(", ")}`, {
      field: name,
      value,
      allowed,
    });
  }
  return value as T;
}

/** Case-insensitive substring match across one or more text fields. */
export function textMatches(fields: readonly string[], q: string): boolean {
  const needle = q.toLowerCase();
  return fields.some((field) => field.toLowerCase().includes(needle));
}

/** All distinct, sorted topic labels of a dataset. */
export function distinctTopics(
  items: readonly { readonly topic: string }[],
): readonly string[] {
  return [...new Set(items.map((item) => item.topic))].sort((a, b) =>
    a.localeCompare(b),
  );
}
