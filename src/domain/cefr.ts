/**
 * Indicative alignment between IELTS band scores and the Common European
 * Framework of Reference for Languages (CEFR).
 *
 * The alignment published by the test partners maps whole and half bands onto
 * CEFR levels C2, C1, B2 and B1. Scores below band 4 are not aligned to a CEFR
 * level by the test owners, and this module reports them as `below-B1` with an
 * explicit `aligned: false` flag rather than inventing a mapping.
 *
 * @packageDocumentation
 */

import type { Band } from "../core/types.ts";

/** CEFR levels used by the published IELTS alignment. */
export const CEFR_LEVELS = ["below-B1", "B1", "B2", "C1", "C2"] as const;

/** A CEFR level, or the sentinel used for unaligned scores. */
export type CefrLevel = (typeof CEFR_LEVELS)[number];

/** One row of the IELTS-to-CEFR alignment. */
export interface CefrBandRange {
  /** The CEFR level. */
  readonly level: CefrLevel;
  /** Lowest IELTS band in the range, inclusive. */
  readonly minBand: Band;
  /** Highest IELTS band in the range, inclusive. */
  readonly maxBand: Band;
  /** Whether the test owners publish this alignment. */
  readonly aligned: boolean;
  /** Short description of what a learner at this level can do. */
  readonly summary: string;
}

/** The complete alignment table, ordered from the highest level down. */
export const CEFR_ALIGNMENT: readonly CefrBandRange[] = Object.freeze([
  {
    level: "C2",
    minBand: 8.5,
    maxBand: 9,
    aligned: true,
    summary:
      "Can understand with ease virtually everything heard or read and express themselves spontaneously, very fluently and precisely.",
  },
  {
    level: "C1",
    minBand: 7,
    maxBand: 8,
    aligned: true,
    summary:
      "Can understand demanding, longer texts, express ideas fluently without obvious searching, and use language flexibly for academic and professional purposes.",
  },
  {
    level: "B2",
    minBand: 5.5,
    maxBand: 6.5,
    aligned: true,
    summary:
      "Can understand the main ideas of complex text, interact with a degree of fluency and spontaneity, and produce clear, detailed text on a wide range of subjects.",
  },
  {
    level: "B1",
    minBand: 4,
    maxBand: 5,
    aligned: true,
    summary:
      "Can understand the main points of familiar matters, deal with most situations while travelling, and produce simple connected text on familiar topics.",
  },
  {
    level: "below-B1",
    minBand: 0,
    maxBand: 3.5,
    aligned: false,
    summary:
      "Below the range aligned to the CEFR by the IELTS partners; performance is not mapped to a CEFR level.",
  },
]);

/**
 * Maps a band score onto its indicative CEFR level.
 *
 * @param band - Any band score in `[0, 9]`.
 * @returns The alignment row covering `band`.
 * @throws {RangeError} If `band` lies outside `[0, 9]`.
 */
export function cefrForBand(band: Band): CefrBandRange {
  if (!Number.isFinite(band) || band < 0 || band > 9) {
    throw new RangeError("band must be a number between 0 and 9");
  }
  const matched = CEFR_ALIGNMENT.find(
    (range) => band >= range.minBand && band <= range.maxBand,
  );
  /* c8 ignore next 3 -- the alignment covers [0, 9] exhaustively. */
  if (matched === undefined) {
    throw new RangeError(`no CEFR alignment for band ${String(band)}`);
  }
  return matched;
}
