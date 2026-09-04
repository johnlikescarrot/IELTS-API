import { PaginationMeta } from '../types';

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export function paginateArray<T>(
  items: T[],
  pageInput?: number | string,
  limitInput?: number | string,
  defaultLimit = 20,
  maxLimit = 100
): PaginatedResult<T> {
  let page = typeof pageInput === 'string' ? parseInt(pageInput, 10) : (pageInput ?? 1);
  let limit =
    typeof limitInput === 'string' ? parseInt(limitInput, 10) : (limitInput ?? defaultLimit);

  if (isNaN(page) || page < 1) {
    page = 1;
  }
  if (isNaN(limit) || limit < 1) {
    limit = defaultLimit;
  }
  if (limit > maxLimit) {
    limit = maxLimit;
  }

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  if (page > totalPages && totalItems > 0) {
    page = totalPages;
  }

  const startIndex = (page - 1) * limit;
  const paginatedData = items.slice(startIndex, startIndex + limit);

  return {
    data: paginatedData,
    meta: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
}
