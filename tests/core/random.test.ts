import { describe, expect, it } from "vitest";
import { mulberry32, sample } from "../../src/core/random.ts";

describe("mulberry32", () => {
  it("is deterministic for a given seed", () => {
    const first = Array.from({ length: 5 }, mulberry32(42));
    const second = Array.from({ length: 5 }, mulberry32(42));
    expect(first).toEqual(second);
  });

  it("differs between seeds", () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });

  it("stays inside the unit interval", () => {
    const random = mulberry32(7);
    for (let index = 0; index < 1000; index += 1) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("sample", () => {
  const population = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  it("draws without replacement", () => {
    const drawn = sample(population, 5, 3);
    expect(drawn).toHaveLength(5);
    expect(new Set(drawn).size).toBe(5);
  });

  it("is reproducible", () => {
    expect(sample(population, 4, 11)).toEqual(sample(population, 4, 11));
  });

  it("clamps the count to the population size", () => {
    expect(sample(population, 99, 1)).toHaveLength(population.length);
    expect(sample(population, -5, 1)).toHaveLength(0);
    expect(sample([], 3, 1)).toEqual([]);
  });

  it("eventually returns every element across seeds", () => {
    const seen = new Set<number>();
    for (let seed = 0; seed < 50; seed += 1) {
      for (const value of sample(population, 1, seed)) {
        seen.add(value);
      }
    }
    expect(seen.size).toBe(population.length);
  });
});
