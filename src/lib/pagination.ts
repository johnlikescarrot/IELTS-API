/**
 * Pagination, ordering, and shared query-string parsing helpers.
 *
 * Every list endpoint uses the same `?page=&limit=` envelope and the same
 * validation rules, so clients can paginate any collection identically.
 */

import { badRequest } from "../http.js";
import type { ListMeta, PaginatedList } from "../types.js";

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;
export const MAX_PAGE = 1_000_000_000;

/**
 * Parse an optional positive integer parameter. `null` (parameter absent)
 * falls back to `fallback`; anything non-numeric or out of range is a 400.
 */
export function parsePositiveInt(
  value: string | null,
  name: string,
  fallback: number,
  min: number,
  max: number,
): number {
  if (value === null) {
    return fallback;
  }
  const trimmed = value.trim();
  if (!/^-?\d+$/.test(trimmed)) {
    throw badRequest(
      `Parameter '${name}' must be an integer between ${min} and ${max}`,
      { parameter: name, value },
    );
  }
  const parsed = Number.parseInt(trimmed, 10);
  if (parsed < min || parsed > max) {
    throw badRequest(
      `Parameter '${name}' must be an integer between ${min} and ${max}`,
      { parameter: name, value },
    );
  }
  return parsed;
}

export interface Pagination {
  readonly page: number;
  readonly limit: number;
}

export function parsePagination(query: URLSearchParams): Pagination {
  return {
    page: parsePositiveInt(
      query.get("page"),
      "page",
      DEFAULT_PAGE,
      1,
      MAX_PAGE,
    ),
    limit: parsePositiveInt(
      query.get("limit"),
      "limit",
      DEFAULT_LIMIT,
      1,
      MAX_LIMIT,
    ),
  };
}

/**
 * Parse an optional integer parameter: `null` (absent) becomes `null`,
 * anything invalid or out of range is a 400.
 */
export function parseOptionalInt(
  value: string | null,
  name: string,
  min: number,
  max: number,
): number | null {
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  if (!/^-?\d+$/.test(trimmed)) {
    throw badRequest(
      `Parameter '${name}' must be an integer between ${min} and ${max}`,
      { parameter: name, value },
    );
  }
  const parsed = Number.parseInt(trimmed, 10);
  if (parsed < min || parsed > max) {
    throw badRequest(
      `Parameter '${name}' must be an integer between ${min} and ${max}`,
      { parameter: name, value },
    );
  }
  return parsed;
}

/** Build the standard list envelope for one page of a collection. */
export function paginate<T>(
  items: readonly T[],
  page: number,
  limit: number,
): PaginatedList<T> {
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const meta: ListMeta = { total, page, limit, pages };
  return { meta, data: items.slice(start, start + limit) };
}

export type Order = "asc" | "desc";

/** Parse `?order=`, defaulting to `asc`; anything else is a 400. */
export function parseOrder(value: string | null): Order {
  const order = value ?? "asc";
  if (order !== "asc" && order !== "desc") {
    throw badRequest("Parameter 'order' must be 'asc' or 'desc'", {
      parameter: "order",
      value,
    });
  }
  return order;
}
