import { describe, expect, it } from "vitest";
import { SCORED_PAPERS } from "../../src/core/types.ts";
import {
  CONVERSION_TABLES,
  ITEM_COUNT,
  minimumRawForBand,
  paperFor,
  rawScoreToBand,
} from "../../src/domain/conversion.ts";
import { isReportableBand } from "../../src/domain/band.ts";

describe("conversion tables", () => {
  it.each(SCORED_PAPERS)("covers every raw score for %s", (paper) => {
    for (let raw = 0; raw <= ITEM_COUNT; raw += 1) {
      const result = rawScoreToBand(paper, raw);
      expect(isReportableBand(result.band)).toBe(true);
      expect(result.paper).toBe(paper);
      expect(raw).toBeGreaterThanOrEqual(result.row.minRaw);
      expect(raw).toBeLessThanOrEqual(result.row.maxRaw);
    }
  });

  it.each(SCORED_PAPERS)("is monotonic for %s", (paper) => {
    let previous = -1;
    for (let raw = 0; raw <= ITEM_COUNT; raw += 1) {
      const band = rawScoreToBand(paper, raw).band;
      expect(band).toBeGreaterThanOrEqual(previous);
      previous = band;
    }
  });

  it.each(SCORED_PAPERS)("has non-overlapping rows for %s", (paper) => {
    const seen = new Set<number>();
    for (const row of CONVERSION_TABLES[paper].rows) {
      expect(row.minRaw).toBeLessThanOrEqual(row.maxRaw);
      for (let raw = row.minRaw; raw <= row.maxRaw; raw += 1) {
        expect(seen.has(raw)).toBe(false);
        seen.add(raw);
      }
    }
    expect(seen.size).toBe(ITEM_COUNT + 1);
  });

  it("reproduces published anchor points", () => {
    expect(rawScoreToBand("listening", 30).band).toBe(7);
    expect(rawScoreToBand("listening", 35).band).toBe(8);
    expect(rawScoreToBand("listening", 39).band).toBe(9);
    expect(rawScoreToBand("reading-academic", 30).band).toBe(7);
    expect(rawScoreToBand("reading-academic", 27).band).toBe(6.5);
    expect(rawScoreToBand("reading-general-training", 30).band).toBe(6);
    expect(rawScoreToBand("reading-general-training", 34).band).toBe(7);
    expect(rawScoreToBand("reading-general-training", 40).band).toBe(9);
  });

  it("reports the marks needed for the next band", () => {
    expect(rawScoreToBand("reading-academic", 28).marksToNextBand).toBe(2);
    expect(rawScoreToBand("reading-academic", 40).marksToNextBand).toBeNull();
    expect(rawScoreToBand("reading-academic", 39).marksToNextBand).toBeNull();
  });

  it("rejects invalid raw scores", () => {
    expect(() => rawScoreToBand("listening", -1)).toThrow(RangeError);
    expect(() => rawScoreToBand("listening", 41)).toThrow(RangeError);
    expect(() => rawScoreToBand("listening", 3.5)).toThrow(RangeError);
  });
});

describe("paperFor", () => {
  it("ignores the module for Listening", () => {
    expect(paperFor("listening", "academic")).toBe("listening");
    expect(paperFor("listening", "general-training")).toBe("listening");
  });

  it("selects the module-specific Reading table", () => {
    expect(paperFor("reading", "academic")).toBe("reading-academic");
    expect(paperFor("reading", "general-training")).toBe(
      "reading-general-training",
    );
  });
});

describe("minimumRawForBand", () => {
  it("returns the published thresholds", () => {
    expect(minimumRawForBand("reading-academic", 7)).toBe(30);
    expect(minimumRawForBand("reading-general-training", 7)).toBe(34);
    expect(minimumRawForBand("listening", 9)).toBe(39);
    expect(minimumRawForBand("listening", 0)).toBe(0);
  });

  it("returns null for unattainable bands", () => {
    expect(minimumRawForBand("listening", 9.5)).toBeNull();
  });
});
