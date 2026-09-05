/**
 * Raw-score to band conversion tables.
 *
 * Listening and Reading are marked objectively: one mark per correct answer,
 * no negative marking, 40 questions. The IELTS partners publish the average
 * number of marks required for each band, and mock-exam platforms convert
 * every auto-marked submission with these tables. The three tables below are
 * transcribed from the partners' published conversion charts (see
 * `sourceUrl`); each response carries the caveat that the published numbers
 * are averages and that real conversions vary slightly between test versions.
 *
 * The tables stop where the published charts stop: raw marks below the lowest
 * published row have no official mapping and are reported as unmatched
 * (`matched: false`), never guessed.
 */

import type { RawScoreRow, RawScoreTable, RawScoreTableId } from '../types.js';

/** Build table rows from `[band, min, max]` triples. */
function rows(triples: readonly (readonly [number, number, number])[]): RawScoreRow[] {
  return triples.map(([band, min, max]) => ({ band, min, max }));
}

const CAVEAT =
  'Average marks required per the published conversion chart; actual conversions vary slightly between test versions. Raw marks below the lowest published row have no official mapping.';

/**
 * Listening conversion published by IDP: the same paper, audio, marking and
 * table apply to the Academic and General Training modules.
 */
const LISTENING = rows([
  [4.0, 11, 12],
  [4.5, 13, 15],
  [5.0, 16, 17],
  [5.5, 18, 22],
  [6.0, 23, 25],
  [6.5, 26, 29],
  [7.0, 30, 31],
  [7.5, 32, 34],
  [8.0, 35, 36],
  [8.5, 37, 38],
  [9.0, 39, 40],
]);

/** Academic Reading conversion published by IDP. */
const ACADEMIC_READING = rows([
  [2.5, 4, 5],
  [3.0, 6, 7],
  [3.5, 8, 9],
  [4.0, 10, 12],
  [4.5, 13, 14],
  [5.0, 15, 18],
  [5.5, 19, 22],
  [6.0, 23, 26],
  [6.5, 27, 29],
  [7.0, 30, 32],
  [7.5, 33, 34],
  [8.0, 35, 36],
  [8.5, 37, 38],
  [9.0, 39, 40],
]);

/** General Training Reading conversion published by IDP. */
const GENERAL_READING = rows([
  [3.0, 9, 11],
  [3.5, 12, 14],
  [4.0, 15, 18],
  [4.5, 19, 22],
  [5.0, 23, 26],
  [5.5, 27, 29],
  [6.0, 30, 31],
  [6.5, 32, 33],
  [7.0, 34, 35],
  [7.5, 36, 36],
  [8.0, 37, 38],
  [8.5, 39, 39],
  [9.0, 40, 40],
]);

/** All raw-score conversion tables keyed by paper. */
export const RAW_SCORE_TABLES: Record<RawScoreTableId, RawScoreTable> = {
  listening: {
    id: 'listening',
    paper: 'listening',
    module: 'both',
    rawMax: 40,
    provider: 'IDP: IELTS Australia (for the IELTS partners)',
    sourceUrl: 'https://ielts.idp.com/egypt/results/scores/listening',
    note: CAVEAT,
    entries: LISTENING,
  },
  'academic-reading': {
    id: 'academic-reading',
    paper: 'reading',
    module: 'academic',
    rawMax: 40,
    provider: 'IDP: IELTS Australia (for the IELTS partners)',
    sourceUrl: 'https://ielts.idp.com/egypt/results/scores/reading',
    note: CAVEAT,
    entries: ACADEMIC_READING,
  },
  'general-reading': {
    id: 'general-reading',
    paper: 'reading',
    module: 'general-training',
    rawMax: 40,
    provider: 'IDP: IELTS Australia (for the IELTS partners)',
    sourceUrl: 'https://ielts.idp.com/egypt/results/scores/reading',
    note: CAVEAT,
    entries: GENERAL_READING,
  },
};

/** Identifiers of every raw-score table. */
export const RAW_SCORE_TABLE_IDS: readonly RawScoreTableId[] = Object.keys(
  RAW_SCORE_TABLES,
) as RawScoreTableId[];

/** Result of {@link convertRawScore}. */
export type RawScoreResult = {
  /** Band the raw mark maps onto. */
  band: number;
  /** Lowest raw mark in the matched row (inclusive). */
  min: number;
  /** Highest raw mark in the row (inclusive). */
  max: number;
  /** Human-readable rendering of the range (`32–34`, or `40` for single-mark rows). */
  display: string;
  /** Next higher band, or `null` at the ceiling of the table. */
  nextBand: number | null;
  /** Additional correct answers needed for the next band, or `null` at the ceiling. */
  marksToNextBand: number | null;
};

/**
 * Map a raw mark (correct answers out of 40) onto a band score.
 *
 * @param table - Table identifier.
 * @param raw - Raw mark, an integer between 0 and 40.
 * @returns The conversion, or `undefined` when the mark falls below the lowest published row.
 */
export function convertRawScore(table: RawScoreTableId, raw: number): RawScoreResult | undefined {
  const entries = RAW_SCORE_TABLES[table].entries;
  const index = entries.findIndex((entry) => raw >= entry.min && raw <= entry.max);
  if (index < 0) {
    return undefined;
  }
  const entry = entries[index] as RawScoreRow;
  const next = index + 1 < entries.length ? (entries[index + 1] as RawScoreRow) : undefined;
  return {
    band: entry.band,
    min: entry.min,
    max: entry.max,
    display: entry.min === entry.max ? `${entry.min}` : `${entry.min}–${entry.max}`,
    nextBand: next?.band ?? null,
    marksToNextBand: next === undefined ? null : next.min - raw,
  };
}
