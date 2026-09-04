/**
 * IELTS band-score calculation.
 *
 * The Listening and Reading papers are marked on a raw 0–40 scale and then
 * converted to a band. Exact conversion thresholds vary very slightly from
 * one sitting to another, so the tables here are standard practice figures
 * used by most preparation materials. Writing and Speaking are assessed by
 * trained examiners directly on the nine-band scale.
 */
import { badRequest } from "./errors.js";
import type { BandRow, ComponentScores, TestModule } from "./types.js";
import { VALID_BANDS } from "./types.js";

/** Highest raw score possible on the Reading and Listening papers. */
export const MAX_RAW = 40;

/** Lowest raw score possible on the Reading and Listening papers. */
export const MIN_RAW = 0;

/** Highest overall band that the IELTS result form reports. */
export const MAX_OVERALL_BAND = 9;

/** Lowest overall band that the IELTS result form reports. */
export const MIN_OVERALL_BAND = 1;

const LISTENING_TABLE: readonly BandRow[] = [
  { rawFrom: 39, band: 9 },
  { rawFrom: 37, band: 8.5 },
  { rawFrom: 35, band: 8 },
  { rawFrom: 32, band: 7.5 },
  { rawFrom: 30, band: 7 },
  { rawFrom: 26, band: 6.5 },
  { rawFrom: 23, band: 6 },
  { rawFrom: 20, band: 5.5 },
  { rawFrom: 16, band: 5 },
  { rawFrom: 13, band: 4.5 },
  { rawFrom: 10, band: 4 },
  { rawFrom: 7, band: 3.5 },
  { rawFrom: 5, band: 3 },
  { rawFrom: 3, band: 2.5 },
  { rawFrom: 0, band: 1 },
];

const READING_ACADEMIC_TABLE: readonly BandRow[] = [
  { rawFrom: 39, band: 9 },
  { rawFrom: 37, band: 8.5 },
  { rawFrom: 35, band: 8 },
  { rawFrom: 33, band: 7.5 },
  { rawFrom: 30, band: 7 },
  { rawFrom: 27, band: 6.5 },
  { rawFrom: 23, band: 6 },
  { rawFrom: 19, band: 5.5 },
  { rawFrom: 15, band: 5 },
  { rawFrom: 13, band: 4.5 },
  { rawFrom: 10, band: 4 },
  { rawFrom: 8, band: 3.5 },
  { rawFrom: 6, band: 3 },
  { rawFrom: 4, band: 2.5 },
  { rawFrom: 0, band: 1 },
];

const READING_GENERAL_TABLE: readonly BandRow[] = [
  { rawFrom: 40, band: 9 },
  { rawFrom: 39, band: 8.5 },
  { rawFrom: 38, band: 8 },
  { rawFrom: 36, band: 7.5 },
  { rawFrom: 34, band: 7 },
  { rawFrom: 32, band: 6.5 },
  { rawFrom: 30, band: 6 },
  { rawFrom: 27, band: 5.5 },
  { rawFrom: 23, band: 5 },
  { rawFrom: 19, band: 4.5 },
  { rawFrom: 15, band: 4 },
  { rawFrom: 12, band: 3.5 },
  { rawFrom: 9, band: 3 },
  { rawFrom: 6, band: 2.5 },
  { rawFrom: 0, band: 1 },
];

const READING_TABLES: Record<TestModule, readonly BandRow[]> = {
  academic: READING_ACADEMIC_TABLE,
  general: READING_GENERAL_TABLE,
};

/** Pick the conversion table for a paper and (for Reading) a test module. */
export function tableFor(
  paper: "listening" | "reading",
  module: TestModule = "academic",
): readonly BandRow[] {
  if (paper === "listening") {
    return LISTENING_TABLE;
  }
  return READING_TABLES[module];
}

/** Is {@link value} an integer raw score within the paper's range? */
export function isRawScore(value: unknown): value is number {
  return (
    typeof value === "number" && Number.isInteger(value) && value >= MIN_RAW && value <= MAX_RAW
  );
}

/** Convert an integer raw score (0–40) to a band using the supplied table. */
export function rawToBand(table: readonly BandRow[], raw: number): number {
  for (const row of table) {
    if (raw >= row.rawFrom) {
      return row.band;
    }
  }
  throw badRequest(`raw score ${raw} is out of range; expected ${MIN_RAW}-${MAX_RAW}.`);
}

/** Validate a component band value and return it as-is when valid. */
export function isComponentBand(value: unknown): value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return false;
  }
  return VALID_BANDS.some((candidate) => candidate === value);
}

/**
 * Round an arithmetic mean to the nearest half band using the standard IELTS
 * convention: a mean that ends in exactly .25 rounds down to the lower half
 * band and a mean that ends in exactly .75 rounds up.
 */
export function roundToHalf(value: number): number {
  if (!Number.isFinite(value)) {
    throw badRequest(`cannot round the non-finite value ${value}.`);
  }
  const rounded = Math.round(value * 2) / 2;
  const clamped = Math.min(MAX_OVERALL_BAND, Math.max(MIN_OVERALL_BAND, rounded));
  return clamped;
}

/** Compute the overall band from the four component scores. */
export function overallBand(scores: ComponentScores): number {
  const values = [scores.listening, scores.reading, scores.writing, scores.speaking];
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return roundToHalf(mean);
}

/** Validate a set of component scores, throwing an {@link ApiError} on failure. */
export function assertValidScores(
  scores: Partial<ComponentScores>,
): asserts scores is ComponentScores {
  const keys = ["listening", "reading", "writing", "speaking"] as const;
  const missing = keys.filter((key) => scores[key] === undefined);
  if (missing.length > 0) {
    throw badRequest(`missing required component score(s): ${missing.join(", ")}.`, { missing });
  }
  for (const key of keys) {
    const value = scores[key];
    if (value !== undefined && !isComponentBand(value)) {
      throw badRequest(
        `"${key}" must be a valid band between 1 and 9 in half-band steps; ` +
          `received ${JSON.stringify(value)}.`,
        { received: value, allowed: VALID_BANDS },
      );
    }
  }
}
