import { describe, expect, it } from "vitest";
import { paginate } from "../src/lib/paginate.js";

describe("paginate", () => {
  const items = [1, 2, 3, 4, 5];

  it("returns the first page by default", () => {
    const page = paginate(items, { offset: 0, limit: 2 });
    expect(page.data).toEqual([1, 2]);
    expect(page.meta).toMatchObject({ total: 5, offset: 0, limit: 2, count: 2 });
  });
  it("slices from an offset", () => {
    const page = paginate(items, { offset: 3, limit: 10 });
    expect(page.data).toEqual([4, 5]);
    expect(page.meta).toMatchObject({ offset: 3, count: 2, total: 5 });
  });
  it("handles an offset beyond the list length", () => {
    const page = paginate(items, { offset: 99, limit: 10 });
    expect(page.data).toEqual([]);
    expect(page.meta).toMatchObject({ offset: 5, count: 0, total: 5 });
  });
  it("handles an empty source list", () => {
    const page = paginate([], { offset: 0, limit: 10 });
    expect(page.data).toEqual([]);
    expect(page.meta).toEqual({ total: 0, offset: 0, limit: 10, count: 0 });
  });
});
