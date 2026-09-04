import { describe, expect, it } from "vitest";
import { mulberry32, pickDistinct, pickOne, seedToUint32 } from "../src/lib/random.js";

describe("seedToUint32", () => {
  it("is deterministic and returns an unsigned 32-bit value", () => {
    expect(seedToUint32("hello")).toBe(seedToUint32("hello"));
    expect(seedToUint32(12345)).toBeGreaterThanOrEqual(0);
    expect(seedToUint32(12345)).toBeLessThanOrEqual(0xffffffff);
    expect(seedToUint32("a")).not.toBe(seedToUint32("b"));
  });
});

describe("mulberry32", () => {
  it("produces deterministic values in [0, 1)", () => {
    const first = mulberry32(42);
    const again = mulberry32(42);
    const a = [first(), first(), first()];
    const b = [again(), again(), again()];
    expect(a).toEqual(b);
    for (const value of a) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
  it("produces different sequences for different seeds", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });
});

describe("pickDistinct", () => {
  it("returns an empty array from an empty source", () => {
    expect(pickDistinct([], 3, mulberry32(1))).toEqual([]);
  });
  it("returns the requested number of distinct items", () => {
    const items = pickDistinct(["a", "b", "c", "d"], 2, mulberry32(1));
    expect(items).toHaveLength(2);
    expect(new Set(items).size).toBe(2);
    expect(items.every((item) => ["a", "b", "c", "d"].includes(item))).toBe(true);
  });
  it("clamps when more items are requested than exist", () => {
    const items = pickDistinct(["a", "b"], 5, mulberry32(1));
    expect(items).toHaveLength(2);
  });
  it("is deterministic for a fixed seed", () => {
    expect(pickDistinct(["a", "b", "c"], 2, mulberry32(9))).toEqual(
      pickDistinct(["a", "b", "c"], 2, mulberry32(9)),
    );
  });
});

describe("pickOne", () => {
  it("returns an element from the array", () => {
    const item = pickOne(["x", "y"], mulberry32(1));
    expect(["x", "y"]).toContain(item);
  });
  it("throws a RangeError for an empty array", () => {
    expect(() => pickOne([], mulberry32(1))).toThrowError(RangeError);
  });
});
