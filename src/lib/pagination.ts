/**
 * Page/limit pagination with metadata, applied over in-memory arrays.
 */

export interface PageMeta {
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
}

export interface Paginated<T> {
  readonly items: readonly T[];
  readonly meta: PageMeta;
}

export function paginate<T>(items: readonly T[], page: number, limit: number): Paginated<T> {
  const total = items.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  const start = (page - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1 && total > 0
    }
  };
}
