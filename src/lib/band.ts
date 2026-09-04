/**
 * Band-score arithmetic: raw-score conversion tables and the official-style
 * overall-band averaging rule (mean of four skills, rounded to the nearest
 * half band, with .25 rounding up).
 *
 * The raw-score tables are the indicative, commonly published conversion
 * ranges; exact boundaries vary slightly between test versions. Every table
 * starts at `minRaw: 0`, which `rawToBand` relies on.
 */

import { badRequest } from "../http.js";
import type { BandBracket, RawScoreSkill } from "../types.js";

export const RAW_SCORE_TABLES: Readonly<
  Record<RawScoreSkill, readonly BandBracket[]>
> = {
  listening: [
    { minRaw: 39, band: 9 },
    { minRaw: 37, band: 8.5 },
    { minRaw: 35, band: 8 },
    { minRaw: 32, band: 7.5 },
    { minRaw: 30, band: 7 },
    { minRaw: 26, band: 6.5 },
    { minRaw: 23, band: 6 },
    { minRaw: 18, band: 5.5 },
    { minRaw: 16, band: 5 },
    { minRaw: 13, band: 4.5 },
    { minRaw: 10, band: 4 },
    { minRaw: 8, band: 3.5 },
    { minRaw: 6, band: 3 },
    { minRaw: 4, band: 2.5 },
    { minRaw: 3, band: 2 },
    { minRaw: 0, band: 1 },
  ],
  academic_reading: [
    { minRaw: 39, band: 9 },
    { minRaw: 37, band: 8.5 },
    { minRaw: 35, band: 8 },
    { minRaw: 33, band: 7.5 },
    { minRaw: 30, band: 7 },
    { minRaw: 27, band: 6.5 },
    { minRaw: 23, band: 6 },
    { minRaw: 19, band: 5.5 },
    { minRaw: 15, band: 5 },
    { minRaw: 13, band: 4.5 },
    { minRaw: 10, band: 4 },
    { minRaw: 8, band: 3.5 },
    { minRaw: 6, band: 3 },
    { minRaw: 4, band: 2.5 },
    { minRaw: 2, band: 2 },
    { minRaw: 0, band: 1 },
  ],
  general_training_reading: [
    { minRaw: 40, band: 9 },
    { minRaw: 39, band: 8.5 },
    { minRaw: 37, band: 8 },
    { minRaw: 36, band: 7.5 },
    { minRaw: 34, band: 7 },
    { minRaw: 32, band: 6.5 },
    { minRaw: 30, band: 6 },
    { minRaw: 27, band: 5.5 },
    { minRaw: 23, band: 5 },
    { minRaw: 19, band: 4.5 },
    { minRaw: 15, band: 4 },
    { minRaw: 12, band: 3.5 },
    { minRaw: 9, band: 3 },
    { minRaw: 6, band: 2.5 },
    { minRaw: 4, band: 2 },
    { minRaw: 0, band: 1 },
  ],
};

/** Validate a raw score (0-40, integer) coming from a query string or body. */
export function toRawScore(value: unknown): number {
  let parsed: number;
  if (typeof value === "string") {
    if (!/^-?\d+$/.test(value.trim())) {
      throw badRequest("'raw' must be an integer between 0 and 40", {
        field: "raw",
        value,
      });
    }
    parsed = Number.parseInt(value.trim(), 10);
  } else if (typeof value === "number") {
    parsed = value;
  } else {
    throw badRequest("'raw' must be an integer between 0 and 40", {
      field: "raw",
      value,
    });
  }
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 40) {
    throw badRequest("'raw' must be an integer between 0 and 40", {
      field: "raw",
      value,
    });
  }
  return parsed;
}

/** Convert a validated raw score to an indicative band using the tables. */
export function rawToBand(skill: RawScoreSkill, raw: number): number {
  const table = RAW_SCORE_TABLES[skill];
  // The cast is safe: every table ends with a `minRaw: 0` bracket (asserted
  // by the dataset-integrity tests), so `find` always matches for raw >= 0.
  const bracket = table.find(
    (candidate) => raw >= candidate.minRaw,
  ) as BandBracket;
  return bracket.band;
}

/** Validate one component band (0-9 in half-band steps). */
export function toBandValue(value: unknown, name: string): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 9 ||
    (value * 2) % 1 !== 0
  ) {
    throw badRequest(
      `'${name}' must be a band score between 0 and 9 in half-band steps (e.g. 6.5)`,
      { field: name, value },
    );
  }
  return value;
}

export interface OverallBandInput {
  readonly listening: number;
  readonly reading: number;
  readonly writing: number;
  readonly speaking: number;
}

export interface OverallBandResult extends OverallBandInput {
  readonly overall: number;
  readonly rounding: string;
}

/**
 * Average four component bands and round to the nearest half band, rounding
 * .25 up (the published IELTS overall-band rule).
 */
export function overallBand(input: OverallBandInput): OverallBandResult {
  const mean =
    (input.listening + input.reading + input.writing + input.speaking) / 4;
  const overall = Math.round(mean * 2) / 2;
  return {
    ...input,
    overall,
    rounding:
      "mean of the four skills, rounded to the nearest half band (.25 rounds up)",
  };
}
