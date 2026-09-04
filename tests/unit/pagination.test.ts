import { paginateArray } from '../../src/utils/pagination';

describe('Pagination Utility', () => {
  const sampleItems = Array.from({ length: 55 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));

  it('paginates correctly with default values', () => {
    const result = paginateArray(sampleItems);
    expect(result.data.length).toBe(20);
    expect(result.meta.page).toBe(1);
    expect(result.meta.limit).toBe(20);
    expect(result.meta.totalItems).toBe(55);
    expect(result.meta.totalPages).toBe(3);
    expect(result.meta.hasNextPage).toBe(true);
    expect(result.meta.hasPrevPage).toBe(false);
  });

  it('handles custom page and limit as numbers', () => {
    const result = paginateArray(sampleItems, 2, 15);
    expect(result.data.length).toBe(15);
    expect(result.data[0].id).toBe(16);
    expect(result.meta.page).toBe(2);
    expect(result.meta.limit).toBe(15);
    expect(result.meta.totalPages).toBe(4);
    expect(result.meta.hasNextPage).toBe(true);
    expect(result.meta.hasPrevPage).toBe(true);
  });

  it('handles string page and limit parameters', () => {
    const result = paginateArray(sampleItems, '3', '10');
    expect(result.data.length).toBe(10);
    expect(result.data[0].id).toBe(21);
    expect(result.meta.page).toBe(3);
  });

  it('falls back to default when page or limit are invalid or negative', () => {
    const result = paginateArray(sampleItems, 'invalid', -5, 25);
    expect(result.meta.page).toBe(1);
    expect(result.meta.limit).toBe(25);
  });

  it('caps limit to maxLimit', () => {
    const result = paginateArray(sampleItems, 1, 500, 20, 50);
    expect(result.meta.limit).toBe(50);
  });

  it('clamps page to totalPages if requested page exceeds totalPages', () => {
    const result = paginateArray(sampleItems, 99, 20);
    expect(result.meta.page).toBe(3);
    expect(result.data.length).toBe(15);
    expect(result.meta.hasNextPage).toBe(false);
    expect(result.meta.hasPrevPage).toBe(true);
  });

  it('handles empty items array', () => {
    const result = paginateArray([], 1, 10);
    expect(result.data).toEqual([]);
    expect(result.meta.totalItems).toBe(0);
    expect(result.meta.totalPages).toBe(1);
    expect(result.meta.hasNextPage).toBe(false);
    expect(result.meta.hasPrevPage).toBe(false);
  });
});
