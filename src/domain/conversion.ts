/**
 * Raw-score to band-score conversion for the objectively marked IELTS papers.
 *
 * Listening and Reading each contain 40 items worth one mark each, with no
 * negative marking. The raw score is mapped onto the nine-band scale with a
 * fixed conversion table. Listening uses a single table for both modules;
 * Reading uses a distinct, harder table for General Training because the texts
 * are less demanding.
 *
 * The tables encoded here are the widely published indicative tables that
 * accompany official practice material. They are exposed as data so that
 * downstream researchers can inspect, cite and, if required, substitute them.
 *
 * @packageDocumentation
 */

import type { Band, Module, ScoredPaper } from "../core/types.ts";

/** The number of items on the Listening and Reading papers. */
export const ITEM_COUNT = 40;

/** A contiguous run of raw scores that maps onto a single band. */
export interface ConversionRow {
  /** Lowest raw score in the run, inclusive. */
  readonly minRaw: number;
  /** Highest raw score in the run, inclusive. */
  readonly maxRaw: number;
  /** Band score awarded for any raw score in the run. */
  readonly band: Band;
}

/** A complete conversion table for one paper. */
export interface ConversionTable {
  /** Identifier of the paper the table applies to. */
  readonly paper: ScoredPaper;
  /** Human-readable label. */
  readonly label: string;
  /** Rows ordered from the highest band to the lowest. */
  readonly rows: readonly ConversionRow[];
}

function row(minRaw: number, maxRaw: number, band: Band): ConversionRow {
  return { minRaw, maxRaw, band };
}

const LISTENING: ConversionTable = {
  paper: "listening",
  label: "Listening (Academic and General Training)",
  rows: [
    row(39, 40, 9),
    row(37, 38, 8.5),
    row(35, 36, 8),
    row(32, 34, 7.5),
    row(30, 31, 7),
    row(26, 29, 6.5),
    row(23, 25, 6),
    row(18, 22, 5.5),
    row(16, 17, 5),
    row(13, 15, 4.5),
    row(11, 12, 4),
    row(8, 10, 3.5),
    row(6, 7, 3),
    row(4, 5, 2.5),
    row(2, 3, 2),
    row(1, 1, 1),
    row(0, 0, 0),
  ],
};

const READING_ACADEMIC: ConversionTable = {
  paper: "reading-academic",
  label: "Academic Reading",
  rows: [
    row(39, 40, 9),
    row(37, 38, 8.5),
    row(35, 36, 8),
    row(33, 34, 7.5),
    row(30, 32, 7),
    row(27, 29, 6.5),
    row(23, 26, 6),
    row(19, 22, 5.5),
    row(15, 18, 5),
    row(13, 14, 4.5),
    row(10, 12, 4),
    row(8, 9, 3.5),
    row(6, 7, 3),
    row(4, 5, 2.5),
    row(3, 3, 2),
    row(2, 2, 1.5),
    row(1, 1, 1),
    row(0, 0, 0),
  ],
};

const READING_GENERAL_TRAINING: ConversionTable = {
  paper: "reading-general-training",
  label: "General Training Reading",
  rows: [
    row(40, 40, 9),
    row(39, 39, 8.5),
    row(37, 38, 8),
    row(36, 36, 7.5),
    row(34, 35, 7),
    row(32, 33, 6.5),
    row(30, 31, 6),
    row(27, 29, 5.5),
    row(23, 26, 5),
    row(19, 22, 4.5),
    row(15, 18, 4),
    row(12, 14, 3.5),
    row(9, 11, 3),
    row(6, 8, 2.5),
    row(4, 5, 2),
    row(2, 3, 1.5),
    row(1, 1, 1),
    row(0, 0, 0),
  ],
};

/** All conversion tables, keyed by paper. */
export const CONVERSION_TABLES: Readonly<Record<ScoredPaper, ConversionTable>> =
  Object.freeze({
    listening: LISTENING,
    "reading-academic": READING_ACADEMIC,
    "reading-general-training": READING_GENERAL_TRAINING,
  });

/**
 * Resolves the paper identifier for a skill and module combination.
 *
 * @param skill - Either `listening` or `reading`.
 * @param module - The test module; ignored for Listening.
 */
export function paperFor(
  skill: "listening" | "reading",
  module: Module,
): ScoredPaper {
  if (skill === "listening") {
    return "listening";
  }
  return module === "academic"
    ? "reading-academic"
    : "reading-general-training";
}

/** The outcome of converting a raw score to a band score. */
export interface ConversionResult {
  /** The paper whose table was used. */
  readonly paper: ScoredPaper;
  /** The raw score that was converted. */
  readonly raw: number;
  /** The resulting band score. */
  readonly band: Band;
  /** The matching table row. */
  readonly row: ConversionRow;
  /**
   * The smallest number of additional correct answers required to reach the
   * next band, or `null` when already at band 9.
   */
  readonly marksToNextBand: number | null;
}

/**
 * Converts a raw score into a band score using the table for `paper`.
 *
 * @param paper - The paper identifier.
 * @param raw - Number of correct answers, an integer in `[0, 40]`.
 * @returns The conversion result.
 * @throws {RangeError} If `raw` is not an integer in `[0, 40]`.
 */
export function rawScoreToBand(
  paper: ScoredPaper,
  raw: number,
): ConversionResult {
  if (!Number.isInteger(raw) || raw < 0 || raw > ITEM_COUNT) {
    throw new RangeError(
      `raw score must be an integer between 0 and ${String(ITEM_COUNT)}`,
    );
  }

  const table = CONVERSION_TABLES[paper];
  const matched = table.rows.find(
    (candidate) => raw >= candidate.minRaw && raw <= candidate.maxRaw,
  );
  /* c8 ignore next 3 -- the tables cover every raw score in [0, 40] exhaustively. */
  if (matched === undefined) {
    throw new RangeError(`no conversion row for raw score ${String(raw)}`);
  }

  const higher = table.rows.filter(
    (candidate) => candidate.band > matched.band,
  );
  const nextThreshold =
    higher.length === 0
      ? null
      : Math.min(...higher.map((candidate) => candidate.minRaw));

  return {
    paper,
    raw,
    band: matched.band,
    row: matched,
    marksToNextBand: nextThreshold === null ? null : nextThreshold - raw,
  };
}

/**
 * Returns the minimum raw score that attains `band` on `paper`, or `null` when
 * the band is unattainable on that paper.
 *
 * @param paper - The paper identifier.
 * @param band - The target band score.
 */
export function minimumRawForBand(
  paper: ScoredPaper,
  band: Band,
): number | null {
  const candidates = CONVERSION_TABLES[paper].rows.filter(
    (candidate) => candidate.band >= band,
  );
  if (candidates.length === 0) {
    return null;
  }
  return candidates.reduce(
    (best, candidate) => Math.min(best, candidate.minRaw),
    ITEM_COUNT,
  );
}
