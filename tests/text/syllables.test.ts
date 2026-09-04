import { describe, expect, it } from "vitest";
import {
  countPolysyllabic,
  countSyllables,
  totalSyllables,
} from "../../src/text/syllables.ts";

describe("countSyllables", () => {
  it.each([
    ["cat", 1],
    ["water", 2],
    ["making", 2],
    ["little", 2],
    ["the", 1],
    ["people", 2],
    ["business", 2],
    ["queue", 1],
    ["idea", 3],
    ["analysis", 4],
    ["criticism", 4],
  ])("counts %s as %i syllables", (word, expected) => {
    expect(countSyllables(word)).toBe(expected);
  });

  it("ignores non-letters and empty input", () => {
    expect(countSyllables("123")).toBe(0);
    expect(countSyllables("")).toBe(0);
    expect(countSyllables("Cat!")).toBe(1);
  });

  it("never returns less than one for a word with letters", () => {
    for (const word of ["rhythm", "hmm", "b", "xyz"]) {
      expect(countSyllables(word)).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("totalSyllables and countPolysyllabic", () => {
  it("aggregates over tokens", () => {
    expect(totalSyllables(["cat", "water"])).toBe(3);
    expect(countPolysyllabic(["cat", "water", "important"])).toBe(1);
    expect(countPolysyllabic([])).toBe(0);
  });
});
