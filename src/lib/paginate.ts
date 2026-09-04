import type { Page } from "./types.js";
import type { PageOptions } from "./params.js";

/**
 * Slice a full list into a single page and wrap it in the standard pagination
 * envelope. Handlers pass the *already filtered* full list so `total` is
 * accurate regardless of the requested page.
 */
export function paginate<T>(items: readonly T[], options: PageOptions): Page<T> {
  const start = Math.min(options.offset, items.length);
  const end = Math.min(start + options.limit, items.length);
  const slice = items.slice(start, end);
  return {
    data: slice,
    meta: {
      total: items.length,
      offset: start,
      limit: options.limit,
      count: slice.length,
    },
  };
}
