/**
 * Raw-score to band conversion tables for the objectively-marked papers.
 *
 * ## Why this dataset exists
 *
 * Listening and Reading are marked out of 40 and converted to the 9-band scale
 * by a lookup table. IELTS does **not** publish that table. What the test
 * partners publish is four *average* marks per paper — the mean raw score seen
 * at whole bands 5 to 8 — together with the explicit warning that "the precise
 * number of marks needed to achieve these band scores will vary slightly from
 * test version to test version", because every version is equated separately.
 *
 * Preparation providers nevertheless need a table, so a *de facto* table
 * circulates: it is reproduced by test-centre software, coaching sites and
 * mock-exam platforms, usually inline and usually without provenance. This
 * module publishes that table once, as a citable artefact, with three
 * properties the circulating copies lack:
 *
 * 1. **Validation.** Every table is checked against the official average marks:
 *    each published anchor must fall inside the row this table assigns to it.
 *    The check is executed by the test suite, not merely asserted in prose.
 * 2. **Honest provenance.** The tables are labelled `indicative-consensus`, not
 *    "official". They reconstruct community consensus; they are not an
 *    equating table and cannot be one.
 * 3. **Measured disagreement.** Where widely-cited sources publish a different
 *    table, the variant is recorded in full and the API computes the exact raw
 *    scores at which it disagrees — see {@link RAW_SCORE_VARIANTS}.
 *
 * ## Why three tables
 *
 * Listening uses a single table for Academic and General Training candidates:
 * they sit the same paper. Reading uses two, because the General Training texts
 * are less demanding and a candidate must therefore answer more questions
 * correctly to reach the same band. Conflating them is a real scoring error —
 * at 32 correct the two Reading tables differ by a full band (7.0 against 6.5).
 *
 * @see https://ielts.org/take-a-test/your-results/ielts-scoring-in-detail
 */

import { badRequest } from '../lib/errors.js';

import type {
  RawBandRow,
  RawScoreDisagreement,
  RawScoreModule,
  RawScoreTable,
  RawScoreVariant,
} from '../types.js';

/** Every paper that converts a raw score to a band. */
export const RAW_SCORE_MODULES: readonly RawScoreModule[] = [
  'listening',
  'reading-academic',
  'reading-general',
];

/** Number of questions on every objectively-marked IELTS paper. */
export const RAW_SCORE_TOTAL = 40;

/**
 * Expand `[minCorrect, band]` thresholds into contiguous rows.
 *
 * The thresholds are written the way every published table is written — the
 * lowest raw score that earns each band, highest band first — and the upper
 * bound of each row is derived from the row above it. Deriving rather than
 * transcribing the upper bounds makes gaps and overlaps impossible.
 *
 * @param thresholds - `[minCorrect, band]` pairs, ordered from the highest band down.
 * @returns Rows covering 0 to 40 without gaps.
 */
export function expandRows(thresholds: readonly (readonly [number, number])[]): RawBandRow[] {
  let ceiling = RAW_SCORE_TOTAL;
  const rows: RawBandRow[] = [];
  for (const [minCorrect, band] of thresholds) {
    rows.push({ band, minCorrect, maxCorrect: ceiling });
    ceiling = minCorrect - 1;
  }
  return rows;
}

/**
 * Listening thresholds, identical for Academic and General Training.
 *
 * Official average marks: band 5 = 16, band 6 = 23, band 7 = 30, band 8 = 35.
 */
const LISTENING_THRESHOLDS: readonly (readonly [number, number])[] = [
  [39, 9],
  [37, 8.5],
  [35, 8],
  [32, 7.5],
  [30, 7],
  [26, 6.5],
  [23, 6],
  [18, 5.5],
  [16, 5],
  [13, 4.5],
  [10, 4],
  [6, 3.5],
  [4, 3],
  [0, 2.5],
];

/**
 * Academic Reading thresholds.
 *
 * Official average marks: band 5 = 15, band 6 = 23, band 7 = 30, band 8 = 35.
 */
const ACADEMIC_THRESHOLDS: readonly (readonly [number, number])[] = [
  [39, 9],
  [37, 8.5],
  [35, 8],
  [33, 7.5],
  [30, 7],
  [27, 6.5],
  [23, 6],
  [19, 5.5],
  [15, 5],
  [13, 4.5],
  [10, 4],
  [8, 3.5],
  [6, 3],
  [4, 2.5],
  [0, 2],
];

/**
 * General Training Reading thresholds, markedly harsher than Academic.
 *
 * Official average marks: band 4 = 15, band 5 = 23, band 6 = 30, band 7 = 35.
 */
const GENERAL_THRESHOLDS: readonly (readonly [number, number])[] = [
  [40, 9],
  [39, 8.5],
  [37, 8],
  [36, 7.5],
  [34, 7],
  [32, 6.5],
  [30, 6],
  [27, 5.5],
  [23, 5],
  [19, 4.5],
  [15, 4],
  [12, 3.5],
  [9, 3],
  [6, 2.5],
  [0, 2],
];

/** The caveat attached to every raw-score response. */
const INDICATIVE_NOTE =
  'Indicative consensus table. IELTS equates every test version separately and publishes only average marks, so a live paper may need one or two marks more or fewer for the same band. Do not use this table to predict or contest an official result.';

/** The three conversion tables, keyed by paper. */
export const RAW_SCORE_TABLES: Record<RawScoreModule, RawScoreTable> = {
  listening: {
    module: 'listening',
    name: 'Listening (Academic and General Training)',
    totalQuestions: RAW_SCORE_TOTAL,
    rows: expandRows(LISTENING_THRESHOLDS),
    anchors: [
      { band: 5, marks: 16 },
      { band: 6, marks: 23 },
      { band: 7, marks: 30 },
      { band: 8, marks: 35 },
    ],
    anchorSourceUrl: 'https://ielts.org/take-a-test/your-results/ielts-scoring-in-detail',
    provenance: 'indicative-consensus',
    note: INDICATIVE_NOTE,
  },
  'reading-academic': {
    module: 'reading-academic',
    name: 'Academic Reading',
    totalQuestions: RAW_SCORE_TOTAL,
    rows: expandRows(ACADEMIC_THRESHOLDS),
    anchors: [
      { band: 5, marks: 15 },
      { band: 6, marks: 23 },
      { band: 7, marks: 30 },
      { band: 8, marks: 35 },
    ],
    anchorSourceUrl: 'https://ielts.org/take-a-test/your-results/ielts-scoring-in-detail',
    provenance: 'indicative-consensus',
    note: INDICATIVE_NOTE,
  },
  'reading-general': {
    module: 'reading-general',
    name: 'General Training Reading',
    totalQuestions: RAW_SCORE_TOTAL,
    rows: expandRows(GENERAL_THRESHOLDS),
    anchors: [
      { band: 4, marks: 15 },
      { band: 5, marks: 23 },
      { band: 6, marks: 30 },
      { band: 7, marks: 35 },
    ],
    anchorSourceUrl: 'https://ielts.org/take-a-test/your-results/ielts-scoring-in-detail',
    provenance: 'indicative-consensus',
    note: INDICATIVE_NOTE,
  },
};

/**
 * Alternative tables published by widely-cited preparation sources.
 *
 * These are recorded, not corrected. The point of the dataset is that no
 * official table exists, so the spread between reputable published tables is
 * itself the finding: it bounds how precisely a raw score can be interpreted.
 */
export const RAW_SCORE_VARIANTS: readonly RawScoreVariant[] = [
  {
    id: 'listening-lower-tail',
    module: 'listening',
    label: 'Alternative Listening tail below band 4.5',
    sourceUrl: 'https://ielts9.io/blog/ielts-listening-raw-score-to-band-conversion',
    note: 'Agrees with the consensus table from band 4.5 upwards and redistributes the marks below it.',
    thresholds: [
      [39, 9],
      [37, 8.5],
      [35, 8],
      [32, 7.5],
      [30, 7],
      [26, 6.5],
      [23, 6],
      [18, 5.5],
      [16, 5],
      [13, 4.5],
      [11, 4],
      [8, 3.5],
      [6, 3],
      [0, 2.5],
    ],
  },
  {
    id: 'listening-2017-coaching-table',
    module: 'listening',
    label: 'Pre-2018 coaching table',
    sourceUrl: 'http://theieltscoach.com/wp-content/uploads/2017/03/IELTS-Band-Score-Conversion-Table.pdf',
    note: 'An older and consistently stricter table that still circulates in printed coaching material; it reserves band 9 for full marks.',
    thresholds: [
      [40, 9],
      [38, 8.5],
      [35, 8],
      [33, 7.5],
      [30, 7],
      [27, 6.5],
      [23, 6],
      [20, 5.5],
      [16, 5],
      [14, 4.5],
      [12, 4],
      [10, 3.5],
      [8, 3],
      [6, 2.5],
      [0, 2],
    ],
  },
  {
    id: 'general-upper-bands',
    module: 'reading-general',
    label: 'Alternative General Training bands 7.5 and 8.0',
    sourceUrl: 'https://ielts9.io/blog/ielts-reading-raw-score-to-band-conversion',
    note: 'Reserves band 8.0 for 38 marks and widens band 7.5 to 36-37; the consensus table splits the same marks the other way.',
    thresholds: [
      [40, 9],
      [39, 8.5],
      [38, 8],
      [36, 7.5],
      [34, 7],
      [32, 6.5],
      [30, 6],
      [27, 5.5],
      [23, 5],
      [19, 4.5],
      [15, 4],
      [12, 3.5],
      [9, 3],
      [6, 2.5],
      [0, 2],
    ],
  },
];

/**
 * Resolve a raw-score table, rejecting unknown papers.
 *
 * @param module - Paper identifier.
 * @returns The conversion table.
 * @throws {HttpError} `400` when the paper is unknown.
 */
export function rawScoreTable(module: string): RawScoreTable {
  const table = RAW_SCORE_TABLES[module as RawScoreModule];
  if (table === undefined) {
    throw badRequest(`Unknown module "${module}".`, {
      parameter: 'module',
      allowed: RAW_SCORE_MODULES.join(','),
    });
  }
  return table;
}

/**
 * Look up the band awarded for a raw score by a list of thresholds.
 *
 * @param thresholds - `[minCorrect, band]` pairs, ordered from the highest band down.
 * @param correct - Raw score out of 40.
 * @returns The band awarded.
 */
export function bandForThresholds(
  thresholds: readonly (readonly [number, number])[],
  correct: number,
): number {
  for (const [minCorrect, band] of thresholds) {
    if (correct >= minCorrect) {
      return band;
    }
  }
  throw new Error(`threshold table does not cover a raw score of ${correct}`);
}

/**
 * Find the row that a raw score falls into.
 *
 * @param table - Conversion table.
 * @param correct - Raw score out of 40.
 * @returns The matching row.
 */
export function rowForRawScore(table: RawScoreTable, correct: number): RawBandRow {
  const row = table.rows.find((candidate) => correct >= candidate.minCorrect);
  if (row === undefined) {
    throw new Error(`no row covers a raw score of ${correct}`);
  }
  return row;
}

/**
 * Compute every raw score at which a variant disagrees with the consensus.
 *
 * The comparison is exhaustive over all 41 possible raw scores, so the result
 * is a complete account of the disagreement rather than a summary of it.
 *
 * @param variant - The alternative table.
 * @returns The disagreeing raw scores, in ascending order.
 */
export function variantDisagreements(variant: RawScoreVariant): RawScoreDisagreement[] {
  const table = RAW_SCORE_TABLES[variant.module];
  const disagreements: RawScoreDisagreement[] = [];
  for (let correct = 0; correct <= RAW_SCORE_TOTAL; correct += 1) {
    const consensusBand = rowForRawScore(table, correct).band;
    const variantBand = bandForThresholds(variant.thresholds, correct);
    if (consensusBand !== variantBand) {
      disagreements.push({ correct, consensusBand, variantBand });
    }
  }
  return disagreements;
}
