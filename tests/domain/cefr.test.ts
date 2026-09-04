import { describe, expect, it } from "vitest";
import { CEFR_ALIGNMENT, cefrForBand } from "../../src/domain/cefr.ts";
import { BAND_SCALE } from "../../src/domain/band.ts";

describe("cefrForBand", () => {
  it.each([
    [9, "C2"],
    [8.5, "C2"],
    [8, "C1"],
    [7, "C1"],
    [6.5, "B2"],
    [5.5, "B2"],
    [5, "B1"],
    [4, "B1"],
    [3.5, "below-B1"],
    [0, "below-B1"],
  ])("maps band %s to %s", (band, level) => {
    expect(cefrForBand(band).level).toBe(level);
  });

  it("marks sub-B1 scores as unaligned", () => {
    expect(cefrForBand(2).aligned).toBe(false);
    expect(cefrForBand(6).aligned).toBe(true);
  });

  it("covers every reportable band", () => {
    for (const band of BAND_SCALE) {
      expect(cefrForBand(band).summary.length).toBeGreaterThan(0);
    }
  });

  it("rejects out-of-range input", () => {
    expect(() => cefrForBand(-1)).toThrow(RangeError);
    expect(() => cefrForBand(9.5)).toThrow(RangeError);
    expect(() => cefrForBand(Number.NaN)).toThrow(RangeError);
  });

  it("has contiguous, non-overlapping ranges", () => {
    const ordered = [...CEFR_ALIGNMENT].sort(
      (left, right) => left.minBand - right.minBand,
    );
    expect(ordered[0]!.minBand).toBe(0);
    expect(ordered.at(-1)!.maxBand).toBe(9);
    for (let index = 1; index < ordered.length; index += 1) {
      expect(ordered[index]!.minBand).toBeCloseTo(
        ordered[index - 1]!.maxBand + 0.5,
        6,
      );
    }
  });
});
