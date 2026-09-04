import { describe, expect, it } from "vitest";
import {
  MAX_OVERALL_BAND,
  MAX_RAW,
  MIN_OVERALL_BAND,
  MIN_RAW,
  assertValidScores,
  isComponentBand,
  isRawScore,
  overallBand,
  rawToBand,
  roundToHalf,
  tableFor,
} from "../src/lib/bands.js";
import { ApiError } from "../src/lib/errors.js";

describe("band conversion tables", () => {
  it("exposes listening and reading (academic/general) tables", () => {
    expect(tableFor("listening").length).toBeGreaterThan(0);
    const academic = tableFor("reading", "academic");
    const general = tableFor("reading", "general");
    expect(academic).not.toEqual(general);
    expect(tableFor("reading", "academic")).toBe(academic);
  });
});

describe("raw score validation", () => {
  it("accepts integer raw scores inside range", () => {
    expect(isRawScore(0)).toBe(true);
    expect(isRawScore(40)).toBe(true);
    expect(isRawScore(MIN_RAW)).toBe(true);
    expect(isRawScore(MAX_RAW)).toBe(true);
  });
  it("rejects out-of-range, non-integer and non-number raw scores", () => {
    expect(isRawScore(-1)).toBe(false);
    expect(isRawScore(41)).toBe(false);
    expect(isRawScore(7.5)).toBe(false);
    expect(isRawScore("7")).toBe(false);
    expect(isRawScore(undefined)).toBe(false);
  });
});

describe("rawToBand", () => {
  it("converts a top raw score to band 9", () => {
    expect(rawToBand(tableFor("listening"), 39)).toBe(9);
    expect(rawToBand(tableFor("reading", "academic"), 39)).toBe(9);
    expect(rawToBand(tableFor("reading", "general"), 40)).toBe(9);
  });
  it("converts a mid raw score using the module table", () => {
    expect(rawToBand(tableFor("listening"), 35)).toBe(8);
    // The same raw mark earns different bands on the two reading modules.
    expect(rawToBand(tableFor("reading", "academic"), 30)).toBe(7);
    expect(rawToBand(tableFor("reading", "general"), 30)).toBe(6);
  });
  it("throws for raw scores with no matching row", () => {
    expect(() => rawToBand(tableFor("listening"), -1)).toThrowError(ApiError);
    expect(() => rawToBand(tableFor("reading", "academic"), -3)).toThrow(/out of range/);
  });
});

describe("component band validation", () => {
  it("accepts full and half bands from 1 to 9", () => {
    expect(isComponentBand(6.5)).toBe(true);
    expect(isComponentBand(9)).toBe(true);
    expect(isComponentBand(1)).toBe(true);
  });
  it("rejects values outside the valid set", () => {
    expect(isComponentBand(6.3)).toBe(false);
    expect(isComponentBand(0)).toBe(false);
    expect(isComponentBand(10)).toBe(false);
    expect(isComponentBand(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isComponentBand("7")).toBe(false);
  });
});

describe("roundToHalf", () => {
  it("rounds to the nearest half band", () => {
    expect(roundToHalf(6.75)).toBe(7);
    expect(roundToHalf(6.25)).toBe(6.5);
    expect(roundToHalf(6.0)).toBe(6);
    expect(roundToHalf(5.5)).toBe(5.5);
  });
  it("clamps the result into the reported band range", () => {
    expect(roundToHalf(9.75)).toBe(MAX_OVERALL_BAND);
    expect(roundToHalf(0.2)).toBe(MIN_OVERALL_BAND);
  });
  it("throws for non-finite input", () => {
    expect(() => roundToHalf(Number.NaN)).toThrowError(ApiError);
    expect(() => roundToHalf(Number.POSITIVE_INFINITY)).toThrow(/non-finite/);
  });
});

describe("overallBand", () => {
  it("averages components and rounds to the nearest half band", () => {
    // (6.5 + 7.0 + 6.5 + 7.0) / 4 = 6.75 -> 7.0
    expect(overallBand({ listening: 6.5, reading: 7, writing: 6.5, speaking: 7 })).toBe(7);
    // (6.5 + 6.0 + 6.5 + 6.0) / 4 = 6.25 -> 6.5
    expect(overallBand({ listening: 6.5, reading: 6, writing: 6.5, speaking: 6 })).toBe(6.5);
  });
});

describe("assertValidScores", () => {
  it("accepts a complete valid scorecard", () => {
    const scores = {
      listening: 6.5,
      reading: 7,
      writing: 6.5,
      speaking: 7,
    };
    expect(() => assertValidScores(scores)).not.toThrow();
  });
  it("rejects a scorecard with missing components", () => {
    expect(() => assertValidScores({ listening: 6.5 })).toThrowError(ApiError);
    expect(() => assertValidScores({})).toThrow(/missing required/);
  });
  it("rejects a component that is not a valid band", () => {
    expect(() =>
      assertValidScores({
        listening: 6.3,
        reading: 7,
        writing: 6.5,
        speaking: 7,
      }),
    ).toThrowError(ApiError);
  });
});
