/** Pagination metadata attached to every list response. */
export interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  links: {
    self: string;
    first: string;
    next: string | null;
    prev: string | null;
    last: string;
  };
}

/**
 * Slice `items` into a page and build metadata with HATEOAS-style links.
 * `filters` carries the non-pagination query parameters so links preserve
 * the current view. Requesting a page past the end yields an empty array.
 */
export function paginate<T>(
  items: readonly T[],
  page: number,
  perPage: number,
  path: string,
  filters: Record<string, string> = {},
): { data: T[]; meta: PaginationMeta } {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = (page - 1) * perPage;
  const data = items.slice(start, start + perPage);

  const buildLink = (targetPage: number): string => {
    const params = new URLSearchParams({
      ...filters,
      per_page: String(perPage),
      page: String(targetPage),
    });
    return `${path}?${params.toString()}`;
  };

  return {
    data,
    meta: {
      page,
      perPage,
      total,
      totalPages,
      links: {
        self: buildLink(page),
        first: buildLink(1),
        prev: page > 1 ? buildLink(page - 1) : null,
        next: page < totalPages ? buildLink(page + 1) : null,
        last: buildLink(totalPages),
      },
    },
  };
}

/** Sort direction accepted by list endpoints. */
export type SortOrder = "asc" | "desc";

/**
 * Sort a copy of `items` with the comparator registered for `sort`,
 * optionally reversed. `comparators` is keyed by the validated sort enum,
 * so lookups are total and cannot fail at runtime.
 */
export function sortItems<T, K extends string>(
  items: readonly T[],
  sort: K,
  order: SortOrder,
  comparators: Record<K, (a: T, b: T) => number>,
): T[] {
  const comparator = comparators[sort];
  const sorted = [...items].sort(comparator);
  return order === "asc" ? sorted : sorted.reverse();
}
