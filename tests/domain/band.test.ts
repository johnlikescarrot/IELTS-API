import { describe, expect, it } from "vitest";
import {
  BAND_SCALE,
  BAND_SCALE_DESCRIPTIONS,
  BAND_STEP,
  MAX_BAND,
  MIN_BAND,
  averageCriteriaToBand,
  isReportableBand,
  overallBandScore,
  roundToReportedBand,
} from "../../src/domain/band.ts";

describe("band scale", () => {
  it("enumerates every half band from 0 to 9", () => {
    expect(BAND_SCALE).toHaveLength(19);
    expect(BAND_SCALE[0]).toBe(MIN_BAND);
    expect(BAND_SCALE.at(-1)).toBe(MAX_BAND);
    expect(BAND_STEP).toBe(0.5);
    for (const band of BAND_SCALE) {
      expect(Number.isInteger(band * 2)).toBe(true);
    }
  });

  it("describes all ten whole bands", () => {
    for (let band = 0; band <= 9; band += 1) {
      expect(BAND_SCALE_DESCRIPTIONS[band]).toBeTypeOf("string");
    }
  });
});

describe("isReportableBand", () => {
  it.each([0, 0.5, 6.5, 9])("accepts %s", (value) => {
    expect(isReportableBand(value)).toBe(true);
  });

  it.each([-0.5, 9.5, 6.25, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects %s",
    (value) => {
      expect(isReportableBand(value)).toBe(false);
    },
  );
});

describe("roundToReportedBand", () => {
  it.each([
    [6, 6],
    [6.1, 6],
    [6.125, 6],
    [6.249, 6],
    [6.25, 6.5],
    [6.375, 6.5],
    [6.5, 6.5],
    [6.625, 6.5],
    [6.749, 6.5],
    [6.75, 7],
    [6.875, 7],
    [6.99, 7],
  ])("rounds %s to %s", (mean, expected) => {
    expect(roundToReportedBand(mean)).toBe(expected);
  });

  it("clamps out-of-range means onto the scale", () => {
    expect(roundToReportedBand(-3)).toBe(0);
    expect(roundToReportedBand(12)).toBe(9);
  });

  it("always produces a reportable band across a dense sweep", () => {
    for (let mean = 0; mean <= 9.0001; mean += 0.005) {
      const band = roundToReportedBand(mean);
      expect(isReportableBand(band)).toBe(true);
      expect(Math.abs(band - mean)).toBeLessThanOrEqual(0.2500001);
    }
  });
});

describe("overallBandScore", () => {
  it("applies the .25 rule", () => {
    const result = overallBandScore({
      listening: 6.5,
      reading: 6.5,
      writing: 6,
      speaking: 6,
    });
    expect(result.mean).toBe(6.25);
    expect(result.overall).toBe(6.5);
    expect(result.rounding).toBe("to-half");
  });

  it("applies the .75 rule", () => {
    const result = overallBandScore({
      listening: 6.5,
      reading: 6.5,
      writing: 7,
      speaking: 7,
    });
    expect(result.mean).toBe(6.75);
    expect(result.overall).toBe(7);
    expect(result.rounding).toBe("up-to-whole");
  });

  it("rounds small fractions down to the whole band", () => {
    const result = overallBandScore({
      listening: 6.5,
      reading: 6,
      writing: 6,
      speaking: 6,
    });
    expect(result.mean).toBe(6.125);
    expect(result.overall).toBe(6);
    expect(result.rounding).toBe("down-to-whole");
  });

  it("is exhaustively consistent over every combination of component scores", () => {
    let combinations = 0;
    for (const listening of BAND_SCALE) {
      for (const reading of BAND_SCALE) {
        for (const writing of BAND_SCALE) {
          for (const speaking of BAND_SCALE) {
            const result = overallBandScore({
              listening,
              reading,
              writing,
              speaking,
            });
            combinations += 1;
            expect(isReportableBand(result.overall)).toBe(true);
            expect(result.overall).toBe(roundToReportedBand(result.mean));
          }
        }
      }
    }
    expect(combinations).toBe(19 ** 4);
  });
});

describe("averageCriteriaToBand", () => {
  it("averages and rounds", () => {
    expect(averageCriteriaToBand([7, 6, 6, 6])).toEqual({
      mean: 6.25,
      band: 6.5,
    });
  });

  it("rejects an empty list", () => {
    expect(() => averageCriteriaToBand([])).toThrow(RangeError);
  });
});
