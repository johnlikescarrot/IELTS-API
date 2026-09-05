/**
 * Raw-score to band conversion tables for the receptive papers.
 *
 * Listening, Academic Reading and General Training Reading are each marked
 * out of 40, and the IELTS partners publish the raw-score intervals that map
 * to each half band. The thresholds below are compiled from those published
 * scoring guides; the Listening and Academic Reading rows are cross-checked
 * against the open mock-exam implementation
 * <https://github.com/wanli4473/yysd-testcenter> (`scripts/cambridge_scoring.py`),
 * which ships the same threshold lists.
 *
 * The published guides stop above zero, so every table ends in an explicit
 * floor row: raw scores below the lowest published row still convert (to the
 * floor band) but are flagged with `belowPublishedRows`, so researchers can
 * exclude extrapolated conversions from archived results.
 */

import { bandScaleEntry } from './bands.js';

/** Highest achievable raw score on a 40-item receptive paper. */
export const MAX_RAW_SCORE = 40;

/** Scales with a published 40-item raw-score table. */
export const RAW_BAND_SCALES = ['listening', 'academic-reading', 'general-reading'] as const;

/** One of the raw-score scales. */
export type RawBandScale = (typeof RAW_BAND_SCALES)[number];

/**
 * One threshold row: raw scores from `minRaw` up to (but excluding) the next
 * higher row map to `band`. Rows are stored highest-first.
 */
export type RawBandThreshold = {
  /** Lowest raw score that earns this band. */
  minRaw: number;
  /** Band score awarded from `minRaw` upwards. */
  band: number;
};

/** A complete raw-score conversion table. */
export type RawBandTable = {
  /** Scale identifier. */
  scale: RawBandScale;
  /** Human-readable paper name. */
  name: string;
  /** IELTS module the paper belongs to. */
  module: 'Academic and General Training' | 'Academic' | 'General Training';
  /** Public scoring guide the rows are compiled from. */
  sourceUrl: string;
  /** How the mapping should be interpreted. */
  provenance: 'indicative' | 'published-concordance';
  /** Caveat surfaced in every response that uses this table. */
  note: string;
  /** Lowest raw score still covered by a published row; below this is the floor. */
  publishedMinimum: number;
  /** Threshold rows, highest-first, ending in the floor row. */
  thresholds: readonly RawBandThreshold[];
};

/** Listening thresholds: 40 items, bands 9.0 down to a 2.5 floor. */
const LISTENING: readonly RawBandThreshold[] = [
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
  { minRaw: 6, band: 3.5 },
  { minRaw: 4, band: 3 },
  { minRaw: 0, band: 2.5 },
];

/** Academic Reading thresholds: 40 items, bands 9.0 down to a 2.0 floor. */
const ACADEMIC_READING: readonly RawBandThreshold[] = [
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
  { minRaw: 0, band: 2 },
];

/** General Training Reading thresholds: 40 items, bands 9.0 down to a 2.0 floor. */
const GENERAL_READING: readonly RawBandThreshold[] = [
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
  { minRaw: 0, band: 2 },
];

/** Scoring-guide reference shared by the receptive tables. */
const SCORING_GUIDE = 'https://www.ielts.org/for-organisations/ielts-scoring-in-detail';

/** Caveat shared by the receptive tables. */
const TABLE_NOTE =
  'Indicative conversion compiled from the IELTS partners’ published scoring guides. ' +
  'Operational grading may vary slightly between test versions; do not use as an admissions decision rule.';

/** Every raw-score conversion table, keyed by scale. */
export const RAW_BAND_TABLES: Record<RawBandScale, RawBandTable> = {
  listening: {
    scale: 'listening',
    name: 'Listening',
    module: 'Academic and General Training',
    sourceUrl: SCORING_GUIDE,
    provenance: 'published-concordance',
    note: TABLE_NOTE,
    publishedMinimum: 4,
    thresholds: LISTENING,
  },
  'academic-reading': {
    scale: 'academic-reading',
    name: 'Academic Reading',
    module: 'Academic',
    sourceUrl: SCORING_GUIDE,
    provenance: 'published-concordance',
    note: TABLE_NOTE,
    publishedMinimum: 4,
    thresholds: ACADEMIC_READING,
  },
  'general-reading': {
    scale: 'general-reading',
    name: 'General Training Reading',
    module: 'General Training',
    sourceUrl: SCORING_GUIDE,
    provenance: 'published-concordance',
    note: TABLE_NOTE,
    publishedMinimum: 6,
    thresholds: GENERAL_READING,
  },
};

/** Result of {@link rawToBand}. */
export type RawBandResult = {
  /** Scale the conversion was read from. */
  scale: RawBandScale;
  /** Raw score supplied by the caller. */
  raw: number;
  /** Converted band score. */
  band: number;
  /** Official user label of the band (e.g. “Good user”). */
  label: string;
  /** Indicative CEFR level of the band. */
  cefr: string;
  /** `true` when the raw score falls below the lowest published row. */
  belowPublishedRows: boolean;
};

/**
 * Look up the user label and CEFR level of a band score.
 *
 * @param band - Band score.
 * @returns The scale profile, or a placeholder for non-reportable bands.
 */
export function rawBandProfile(band: number): { label: string; cefr: string } {
  const entry = bandScaleEntry(band);
  if (entry === undefined) {
    return { label: 'Unreported band', cefr: '-' };
  }
  return { label: entry.label, cefr: entry.cefr };
}

/**
 * Convert a raw score out of 40 to a band score.
 *
 * The lookup saturates: raw scores above the top row earn the top band and
 * raw scores below zero earn the floor band, so the function is total.
 * Routes validate the 0–40 range before calling it.
 *
 * @param scale - Raw-score scale.
 * @param raw - Raw score out of 40.
 * @returns The conversion result.
 */
export function rawToBand(scale: RawBandScale, raw: number): RawBandResult {
  const table = RAW_BAND_TABLES[scale];
  let band = (table.thresholds[table.thresholds.length - 1] as RawBandThreshold).band;
  for (const row of table.thresholds) {
    if (raw >= row.minRaw) {
      band = row.band;
      break;
    }
  }
  const profile = rawBandProfile(band);
  return {
    scale,
    raw,
    band,
    label: profile.label,
    cefr: profile.cefr,
    belowPublishedRows: raw < table.publishedMinimum,
  };
}

/** One expanded raw-score row. */
export type RawBandRow = {
  /** Raw score out of 40. */
  raw: number;
  /** Converted band score. */
  band: number;
};

/**
 * Expand a table to one row per raw score, for archiving the exact mapping.
 *
 * @param scale - Raw-score scale.
 * @returns Rows for raw scores 0–40 in ascending order.
 */
export function rawBandRows(scale: RawBandScale): RawBandRow[] {
  return Array.from({ length: MAX_RAW_SCORE + 1 }, (_unused, raw) => ({
    raw,
    band: rawToBand(scale, raw).band,
  }));
}
