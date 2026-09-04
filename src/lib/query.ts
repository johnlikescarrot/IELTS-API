import type { Paginated } from "../types.js";

/** Options that control the default and maximum page size. */
export interface PaginationOptions {
  defaultLimit: number;
  maxLimit: number;
}

/** A parsed, validated pagination object. */
export interface Pagination {
  limit: number;
  offset: number;
}

/**
 * Parse a raw query value into a non-negative integer. Non-integer, negative
 * or missing values fall back to the supplied default.
 */
export function parseNonNegativeInt(value: unknown, fallback: number): number {
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed >= 0) {
      return parsed;
    }
    return fallback;
  }
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }
  return fallback;
}

/**
 * Build a validated pagination object from a query object. `limit` is clamped
 * to the configured maximum; `offset` defaults to zero.
 */
export function parsePagination(
  query: Record<string, unknown>,
  options: PaginationOptions,
): Pagination {
  const rawLimit = parseNonNegativeInt(query.limit, options.defaultLimit);
  const limit = Math.min(rawLimit, options.maxLimit);
  const offset = parseNonNegativeInt(query.offset, 0);
  return { limit, offset };
}

/** Slice a collection into a paginated envelope. */
export function paginate<T>(items: T[], limit: number, offset: number): Paginated<T> {
  return {
    total: items.length,
    limit,
    offset,
    items: items.slice(offset, offset + limit),
  };
}
