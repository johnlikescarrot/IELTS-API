/**
 * Raw-score to band-score conversion for the two objectively marked papers.
 *
 * Listening and Reading are marked out of 40: one raw mark per question, no
 * partial credit and no negative marking. The raw total is then mapped onto the
 * nine-band scale with a conversion table.
 *
 * **These tables are indicative, not official.** The IELTS partners do not
 * publish a definitive, versioned raw-to-band table, and the boundaries are
 * re-equated for every test version so that a band means the same thing across
 * sittings. What circulates publicly is a consensus reconstruction. This module
 * therefore does three things that a bare lookup table cannot:
 *
 * 1. every row records whether its boundary is `published` (reproduced from
 *    widely agreeing public sources) or `extrapolated` (inferred by this
 *    project to make the table total, because public tables stop at band 4);
 * 2. rows where the public sources materially disagree carry the competing
 *    boundary in {@link RawBandRow.disagreement}, so a study can report the
 *    sensitivity of its results to the choice of table;
 * 3. the tables are exhaustive over 0-40, so a lookup can never fail.
 *
 * Consumers doing measurement work should treat a converted band as an
 * estimate with roughly +/- half a band of table uncertainty, and should cite
 * the table version they used.
 */

import type { RawBandRow, RawScoreComponent, RawScoreTable } from '../types.js';

/** Number of scored questions on both objectively marked papers. */
export const RAW_SCORE_MAX = 40;

/** The objectively marked components that have a raw-to-band table. */
export const RAW_SCORE_COMPONENTS: readonly RawScoreComponent[] = [
  'listening',
  'reading-academic',
  'reading-general-training',
];

/**
 * Build rows from compact tuples.
 *
 * @param rows - `[band, min, max, basis, disagreement?]` tuples, band-descending.
 */
function rows(
  rows: readonly (readonly [number, number, number, 'published' | 'extrapolated', string?])[],
): readonly RawBandRow[] {
  return rows.map(([band, min, max, basis, disagreement]) => ({
    band,
    min,
    max,
    basis,
    disagreement: disagreement ?? null,
  }));
}

/**
 * Listening, shared by Academic and General Training.
 *
 * The recording, the questions and the conversion are identical for both
 * modules; only Reading and Writing differ. Bands 4.0-9.0 are reproduced from
 * the tables published by IELTS preparation providers, which agree on every
 * boundary. Bands below 4.0 are extrapolated: public tables stop at 4.0.
 *
 * An older table (still widely reprinted) places the 7.0 boundary at 30-32 and
 * the 6.5 boundary at 27-29. Those rows carry the alternative reading.
 */
const LISTENING = rows([
  [9.0, 39, 40, 'published'],
  [8.5, 37, 38, 'published'],
  [8.0, 35, 36, 'published'],
  [7.5, 32, 34, 'published', 'An older, widely reprinted table gives 33-34 for band 7.5.'],
  [7.0, 30, 31, 'published', 'An older, widely reprinted table gives 30-32 for band 7.0.'],
  [6.5, 26, 29, 'published', 'An older, widely reprinted table gives 27-29 for band 6.5.'],
  [6.0, 23, 25, 'published', 'An older, widely reprinted table gives 23-26 for band 6.0.'],
  [5.5, 18, 22, 'published', 'An older, widely reprinted table gives 20-22 for band 5.5.'],
  [5.0, 16, 17, 'published', 'An older, widely reprinted table gives 16-19 for band 5.0.'],
  [4.5, 13, 15, 'published'],
  [4.0, 10, 12, 'published'],
  [3.5, 8, 9, 'extrapolated'],
  [3.0, 6, 7, 'extrapolated'],
  [2.5, 4, 5, 'extrapolated'],
  [2.0, 3, 3, 'extrapolated'],
  [1.5, 2, 2, 'extrapolated'],
  [1.0, 1, 1, 'extrapolated'],
  [0.0, 0, 0, 'extrapolated'],
]);

/**
 * Academic Reading.
 *
 * Public tables agree on every boundary from band 1.0 to band 9.0, so no row is
 * extrapolated except the zero row.
 */
const READING_ACADEMIC = rows([
  [9.0, 39, 40, 'published'],
  [8.5, 37, 38, 'published'],
  [8.0, 35, 36, 'published'],
  [7.5, 33, 34, 'published'],
  [7.0, 30, 32, 'published'],
  [6.5, 27, 29, 'published'],
  [6.0, 23, 26, 'published'],
  [5.5, 19, 22, 'published'],
  [5.0, 15, 18, 'published'],
  [4.5, 13, 14, 'published'],
  [4.0, 10, 12, 'published'],
  [3.5, 8, 9, 'published'],
  [3.0, 6, 7, 'published'],
  [2.5, 4, 5, 'published'],
  [2.0, 3, 3, 'published'],
  [1.5, 2, 2, 'published'],
  [1.0, 1, 1, 'published'],
  [0.0, 0, 0, 'extrapolated'],
]);

/**
 * General Training Reading.
 *
 * General Training texts are less academic, so the same band requires more
 * correct answers at every level: band 7.0 needs 34 correct rather than 30.
 * Public tables agree from band 2.0 upwards.
 */
const READING_GENERAL_TRAINING = rows([
  [9.0, 40, 40, 'published'],
  [8.5, 39, 39, 'published'],
  [8.0, 37, 38, 'published'],
  [7.5, 36, 36, 'published'],
  [7.0, 34, 35, 'published'],
  [6.5, 32, 33, 'published'],
  [6.0, 30, 31, 'published'],
  [5.5, 27, 29, 'published'],
  [5.0, 23, 26, 'published'],
  [4.5, 19, 22, 'published'],
  [4.0, 15, 18, 'published'],
  [3.5, 12, 14, 'published'],
  [3.0, 9, 11, 'published'],
  [2.5, 6, 8, 'published'],
  [2.0, 4, 5, 'published'],
  [1.5, 2, 3, 'extrapolated'],
  [1.0, 1, 1, 'extrapolated'],
  [0.0, 0, 0, 'extrapolated'],
]);

/** Caveat repeated on every raw-score response. */
const CAVEAT =
  'Indicative only. The IELTS partners re-equate boundaries for every test version and do not publish a definitive table; treat a converted band as an estimate carrying about half a band of table uncertainty.';

/** The raw-to-band conversion tables, keyed by component. */
export const RAW_SCORE_TABLES: Readonly<Record<RawScoreComponent, RawScoreTable>> = {
  listening: {
    component: 'listening',
    name: 'Listening (Academic and General Training)',
    skill: 'listening',
    module: 'both',
    questions: RAW_SCORE_MAX,
    provenance: 'indicative',
    note: `One conversion table serves both modules. ${CAVEAT}`,
    rows: LISTENING,
  },
  'reading-academic': {
    component: 'reading-academic',
    name: 'Academic Reading',
    skill: 'reading',
    module: 'academic',
    questions: RAW_SCORE_MAX,
    provenance: 'indicative',
    note: `Academic texts are harder, so fewer correct answers are needed than in General Training. ${CAVEAT}`,
    rows: READING_ACADEMIC,
  },
  'reading-general-training': {
    component: 'reading-general-training',
    name: 'General Training Reading',
    skill: 'reading',
    module: 'general-training',
    questions: RAW_SCORE_MAX,
    provenance: 'indicative',
    note: `General Training texts are less academic, so the same band requires more correct answers. ${CAVEAT}`,
    rows: READING_GENERAL_TRAINING,
  },
};

/**
 * Find the table row covering a raw score.
 *
 * The tables are exhaustive over 0-{@link RAW_SCORE_MAX}, so a raw score inside
 * that range always matches exactly one row.
 *
 * @param component - Component whose table to use.
 * @param raw - Raw score (0-40).
 * @returns The matching row, or `undefined` when `raw` is out of range.
 */
export function rowForRawScore(component: RawScoreComponent, raw: number): RawBandRow | undefined {
  return RAW_SCORE_TABLES[component].rows.find((row) => raw >= row.min && raw <= row.max);
}

/** The outcome of converting one raw score. */
export interface RawScoreResult {
  /** Component the score was converted with. */
  component: RawScoreComponent;
  /** Raw score supplied by the caller. */
  raw: number;
  /** Questions on the paper. */
  outOf: number;
  /** Proportion of questions answered correctly, 0-1, rounded to 4 decimals. */
  accuracy: number;
  /** Converted band score. */
  band: number;
  /** Raw-score range that maps onto {@link RawScoreResult.band}. */
  range: { min: number; max: number };
  /** Whether the boundary is reproduced from public tables or extrapolated. */
  basis: 'published' | 'extrapolated';
  /** Competing boundary reported by other public tables, when one exists. */
  disagreement: string | null;
  /**
   * The next half band up and what it costs, or `null` at band 9.
   *
   * `additionalCorrect` is the marginal number of further correct answers
   * needed — the single most actionable number a practice test can report.
   */
  nextBand: { band: number; raw: number; additionalCorrect: number } | null;
  /** Marks that can still be dropped without losing the band, `null` at band 0. */
  marginToLoseBand: number | null;
}

/**
 * Convert a raw score into a band score with its supporting evidence.
 *
 * @param component - Component whose table to use.
 * @param raw - Raw score (0-40).
 * @returns The conversion, or `undefined` when `raw` is out of range.
 */
export function convertRawScore(component: RawScoreComponent, raw: number): RawScoreResult | undefined {
  const table = RAW_SCORE_TABLES[component];
  const row = rowForRawScore(component, raw);
  if (row === undefined) {
    return undefined;
  }
  const higher = table.rows.filter((candidate) => candidate.band > row.band);
  const next = higher[higher.length - 1];
  return {
    component,
    raw,
    outOf: table.questions,
    accuracy: Math.round((raw / table.questions) * 10000) / 10000,
    band: row.band,
    range: { min: row.min, max: row.max },
    basis: row.basis,
    disagreement: row.disagreement,
    nextBand:
      next === undefined ? null : { band: next.band, raw: next.min, additionalCorrect: next.min - raw },
    marginToLoseBand: row.band === 0 ? null : raw - row.min,
  };
}
