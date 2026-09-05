/**
 * Small, dependency-free search and pagination helpers.
 */

import { badRequest } from './errors.js';

/** Result envelope returned by every collection endpoint. */
export interface Page<T> {
  /** Items on the current page. */
  items: T[];
  /** Total number of items matching the filter (ignoring pagination). */
  total: number;
  /** Page size used. */
  limit: number;
  /** Offset used. */
  offset: number;
  /** Whether more items are available. */
  hasMore: boolean;
}

/**
 * Case-insensitive substring match across several fields.
 *
 * @param fields - Haystack strings (non-strings are ignored).
 * @param query - Needle, already trimmed.
 * @returns `true` when any field contains the needle.
 */
export function matchesQuery(
  fields: readonly (string | number | null | undefined)[],
  query: string,
): boolean {
  const needle = query.toLowerCase();
  return fields.some((field) => {
    if (field === null || field === undefined) {
      return false;
    }
    return String(field).toLowerCase().includes(needle);
  });
}

/**
 * Return `true` when the value is contained in the (possibly empty) filter set.
 *
 * @param value - Candidate value.
 * @param filter - Allowed values; `undefined` disables the filter.
 */
export function matchesFilter<T>(value: T, filter: readonly T[] | undefined): boolean {
  return filter === undefined || filter.length === 0 || filter.includes(value);
}

/**
 * Return `true` when at least one value of the candidate list is allowed.
 *
 * @param values - Candidate values.
 * @param filter - Allowed values; `undefined` disables the filter.
 */
export function matchesAny<T>(values: readonly T[], filter: readonly T[] | undefined): boolean {
  if (filter === undefined || filter.length === 0) {
    return true;
  }
  return values.some((value) => filter.includes(value));
}

/**
 * Split a comma-separated parameter into a list of lower-case tokens.
 *
 * Comparison against an allow-list is case-insensitive: the canonical spelling
 * from the allow-list is returned, so mixed-case facets such as the CEFR level
 * `B1-B2` survive a client's lowercase input. When no allow-list is provided the
 * tokens are lower-cased only.
 *
 * @param raw - Raw parameter value (`education,technology`).
 * @param key - Parameter name used in error messages.
 * @param allowed - Permitted tokens; when provided, unknown tokens are rejected.
 */
export function parseList(
  raw: string | undefined,
  key: string,
  allowed?: readonly string[],
): string[] | undefined {
  if (raw === undefined) {
    return undefined;
  }
  const tokens = raw
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.length > 0);
  if (tokens.length === 0) {
    return undefined;
  }
  if (allowed !== undefined) {
    const allowedLower = allowed.map((value) => value.toLowerCase());
    const result = tokens.map((token) => {
      const index = allowedLower.indexOf(token);
      if (index === -1) {
        return token;
      }
      return allowed[index] as string;
    });
    const unknown = tokens.filter((token) => !allowedLower.includes(token));
    if (unknown.length > 0) {
      throw badRequest(`Unknown value(s) for "${key}": ${unknown.join(', ')}.`, {
        parameter: key,
        received: raw,
        allowed: allowed.join(','),
      });
    }
    return result;
  }
  return tokens;
}

/**
 * Apply pagination to a list.
 *
 * @param items - Full, already filtered and sorted list.
 * @param limit - Page size.
 * @param offset - Zero-based offset.
 */
export function paginate<T>(items: readonly T[], limit: number, offset: number): Page<T> {
  const slice = items.slice(offset, offset + limit);
  return {
    items: slice,
    total: items.length,
    limit,
    offset,
    hasMore: offset + slice.length < items.length,
  };
}

/**
 * Stable sort by a comparable key.
 *
 * @param items - Items to sort.
 * @param key - Sort-key extractor.
 * @param direction - `asc` or `desc`.
 */
export function sortBy<T>(
  items: readonly T[],
  key: (item: T) => string | number,
  direction: 'asc' | 'desc',
): T[] {
  const factor = direction === 'asc' ? 1 : -1;
  return [...items].sort((left, right) => {
    const a = key(left);
    const b = key(right);
    if (a < b) {
      return -1 * factor;
    }
    if (a > b) {
      return 1 * factor;
    }
    return 0;
  });
}
