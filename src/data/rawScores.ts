/**
 * Raw-score to band conversion tables for the objective papers.
 *
 * Listening and Reading responses are marked objectively: one mark per correct
 * answer, 40 marks per paper, no negative marking. The IELTS partners publish
 * the standard conversion tables that map a raw mark to a band; they are
 * reproduced here with the same caveat the partners give — the exact cut
 * points are reviewed for every test administration, so the tables are the
 * published standard, not a guarantee for any single sitting. Writing and
 * Speaking have no raw table: they are rated against the band descriptors
 * published at `/v1/bands/descriptors`.
 */

import type { BandScore, RawScoreBand, RawScoreModuleId } from '../types.js';

/** A raw-score conversion table for one objective module. */
export interface RawScoreTable {
  /** Module identifier. */
  id: RawScoreModuleId;
  /** Human-readable module name. */
  name: string;
  /** Skill assessed. */
  skill: 'listening' | 'reading';
  /** Total marks on the paper (one per question). */
  questions: number;
  /** Organisation whose published table this reproduces. */
  source: string;
  /** Public URL documenting the conversion. */
  sourceUrl: string;
  /** Caveat surfaced in every response that uses this table. */
  note: string;
  /** Lowest band the table reports; lower raw scores are unmatched. */
  floor: BandScore;
  /** Rows, ordered from the highest band down; ranges never overlap. */
  entries: readonly RawScoreBand[];
}

/** Build table rows from `[min, max, band]` triples. */
function rows(triples: readonly (readonly [number, number, number])[]): RawScoreBand[] {
  return triples.map(([min, max, band]) => ({ min, max, band }));
}

const TABLE_NOTE =
  'The IELTS partners review cut points for every administration; this is the standard published table, not a guarantee for a single sitting.';

/** The three published raw-score conversion tables. */
export const RAW_SCORE_TABLES: Record<RawScoreModuleId, RawScoreTable> = {
  listening: {
    id: 'listening',
    name: 'Listening (Academic and General Training)',
    skill: 'listening',
    questions: 40,
    source: 'IELTS partners (British Council, IDP: IELTS Australia, Cambridge English)',
    sourceUrl: 'https://ielts.org/take-a-test/your-results/how-your-test-is-marked',
    note: TABLE_NOTE,
    floor: 4,
    entries: rows([
      [39, 40, 9],
      [37, 38, 8.5],
      [35, 36, 8],
      [32, 34, 7.5],
      [30, 31, 7],
      [26, 29, 6.5],
      [23, 25, 6],
      [18, 22, 5.5],
      [16, 17, 5],
      [13, 15, 4.5],
      [10, 12, 4],
    ]),
  },
  'reading-academic': {
    id: 'reading-academic',
    name: 'Academic Reading',
    skill: 'reading',
    questions: 40,
    source: 'IELTS partners (British Council, IDP: IELTS Australia, Cambridge English)',
    sourceUrl: 'https://ielts.org/take-a-test/your-results/how-your-test-is-marked',
    note: TABLE_NOTE,
    floor: 4,
    entries: rows([
      [39, 40, 9],
      [37, 38, 8.5],
      [35, 36, 8],
      [33, 34, 7.5],
      [30, 32, 7],
      [27, 29, 6.5],
      [23, 26, 6],
      [19, 22, 5.5],
      [15, 18, 5],
      [13, 14, 4.5],
      [10, 12, 4],
    ]),
  },
  'reading-general-training': {
    id: 'reading-general-training',
    name: 'General Training Reading',
    skill: 'reading',
    questions: 40,
    source: 'IELTS partners (British Council, IDP: IELTS Australia, Cambridge English)',
    sourceUrl: 'https://ielts.org/take-a-test/your-results/how-your-test-is-marked',
    note: TABLE_NOTE,
    floor: 4,
    entries: rows([
      [40, 40, 9],
      [39, 39, 8.5],
      [37, 38, 8],
      [36, 36, 7.5],
      [34, 35, 7],
      [32, 33, 6.5],
      [30, 31, 6],
      [27, 29, 5.5],
      [23, 26, 5],
      [19, 22, 4.5],
      [15, 18, 4],
    ]),
  },
};

/** Identifiers of every published raw-score table. */
export const RAW_SCORE_MODULES: readonly RawScoreModuleId[] = Object.keys(
  RAW_SCORE_TABLES,
) as RawScoreModuleId[];

/**
 * Look up the band for a raw mark.
 *
 * @param module - Objective module.
 * @param correct - Number of correct answers (0-40).
 * @returns The matching row, or `undefined` when the mark is below the table floor.
 */
export function bandForRawScore(module: RawScoreModuleId, correct: number): RawScoreBand | undefined {
  return RAW_SCORE_TABLES[module].entries.find((entry) => correct >= entry.min && correct <= entry.max);
}

/**
 * Look up the row for a target band.
 *
 * @param module - Objective module.
 * @param band - Target band.
 * @returns The matching row, or `undefined` when the band is not in the table.
 */
export function rawScoreForBand(module: RawScoreModuleId, band: number): RawScoreBand | undefined {
  return RAW_SCORE_TABLES[module].entries.find((entry) => entry.band === band);
}
