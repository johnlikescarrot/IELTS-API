import { describe, expect, it } from 'vitest';
import { paginate } from '../../src/lib/pagination.js';

describe('paginate', () => {
  const items = Array.from({ length: 25 }, (_, i) => i + 1);

  it('returns the requested page with complete metadata', () => {
    const result = paginate(items, 2, 10);
    expect(result.items).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    expect(result.meta).toEqual({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true
    });
  });

  it('handles the first page', () => {
    const result = paginate(items, 1, 10);
    expect(result.meta.hasPreviousPage).toBe(false);
    expect(result.meta.hasNextPage).toBe(true);
    expect(result.items).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('handles a partial last page', () => {
    const result = paginate(items, 3, 10);
    expect(result.items).toEqual([21, 22, 23, 24, 25]);
    expect(result.meta.hasNextPage).toBe(false);
    expect(result.meta.hasPreviousPage).toBe(true);
  });

  it('returns an empty page with zero totals for empty input', () => {
    const result = paginate([], 1, 10);
    expect(result.items).toEqual([]);
    expect(result.meta).toEqual({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false
    });
  });

  it('returns an empty slice for pages beyond the range', () => {
    const result = paginate(items, 99, 10);
    expect(result.items).toEqual([]);
    expect(result.meta.total).toBe(25);
    expect(result.meta.totalPages).toBe(3);
    expect(result.meta.hasNextPage).toBe(false);
    expect(result.meta.hasPreviousPage).toBe(true);
  });

  it('divides evenly when total is a multiple of limit', () => {
    const result = paginate([1, 2, 3, 4], 2, 2);
    expect(result.meta.totalPages).toBe(2);
    expect(result.meta.hasNextPage).toBe(false);
  });
});
