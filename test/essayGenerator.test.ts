import { describe, expect, it } from "vitest";
import { MAX_GENERATED, MIN_GENERATED, generateEssays } from "../src/lib/essayGenerator.js";
import { ApiError } from "../src/lib/errors.js";

describe("generateEssays", () => {
  it("generates the requested number of essay prompts", () => {
    const prompts = generateEssays({ seed: "study", count: 3 });
    expect(prompts).toHaveLength(3);
    for (const prompt of prompts) {
      expect(prompt.task).toBe(2);
      expect(prompt.kind).toBe("essay");
      expect(prompt.prompt.length).toBeGreaterThan(40);
      expect(prompt.title.length).toBeGreaterThan(0);
      expect(prompt.id).toMatch(/^gen-/);
      expect(prompt.category).toBe("Practice");
    }
  });
  it("is deterministic for a given seed", () => {
    const a = generateEssays({ seed: 7, count: 4 });
    const b = generateEssays({ seed: 7, count: 4 });
    expect(a).toEqual(b);
  });
  it("clamps a count larger than the topic pool", () => {
    const prompts = generateEssays({ seed: "big", count: MAX_GENERATED + 10 });
    expect(prompts).toHaveLength(MAX_GENERATED);
  });
  it("clamps a tiny count up to the minimum", () => {
    const prompts = generateEssays({ seed: "small", count: 0 });
    expect(prompts).toHaveLength(MIN_GENERATED);
  });
  it("throws for a non-integer count", () => {
    expect(() => generateEssays({ seed: "x", count: 2.5 })).toThrowError(ApiError);
    expect(() => generateEssays({ seed: "x", count: Number.NaN })).toThrow(/integer/);
  });
  it("produces ids that are unique within a batch", () => {
    const prompts = generateEssays({ seed: "unique", count: 5 });
    const ids = new Set(prompts.map((prompt) => prompt.id));
    expect(ids.size).toBe(prompts.length);
  });
});
