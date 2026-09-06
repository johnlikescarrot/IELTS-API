/**
 * Raw-score to band-score conversion tables.
 *
 * Listening and Reading are objectively marked: 40 questions, one mark each,
 * and the marks are converted to a band by a published table. The tables
 * below are compiled from the conversion charts printed in the Cambridge
 * IELTS series answer sections and reproduced by the IELTS partners; a given
 * band can sit one item higher or lower in another volume, so every lookup
 * is labelled **indicative** and the official Test Report Form stays
 * authoritative.
 *
 * A mock exam centre needs exactly this mapping to turn a count of correct
 * answers into a score toast and a printable report — the convention of
 * `wanli4473/yysd-testcenter`, where exam pages capture raw marks and the
 * results page renders them as bands. `/v1/exam/score` and `/v1/exam/report`
 * publish it, and `/v1/exam/tables` serves the tables themselves with
 * provenance, so a client can re-implement the conversion without guessing.
 */

import type { ExamModule, RawScoreResult, RawScoreRow, RawScoreScale } from '../types.js';

/** Scales with a published raw-score conversion table. */
export const RAW_SCORE_SCALES: readonly RawScoreScale[] = [
  'listening',
  'academic-reading',
  'general-training-reading',
];

/** Questions on each 40-mark paper. */
export const RAW_SCORE_MAX = 40;

/** Provenance note attached to every conversion result and table. */
export const RAW_SCORE_PROVENANCE =
  'Compiled from the raw-score conversion tables printed in the Cambridge IELTS series answer sections ' +
  '(volumes 10-18) and reproduced by the IELTS partners; the same band can sit one item higher or lower ' +
  'in other volumes. Indicative only: the official Test Report Form is authoritative.';

/** Row source: [minRaw, maxRaw, band], ordered from the highest band down. */
type TableRow = readonly [number, number, number];

function buildRows(rows: readonly TableRow[]): RawScoreRow[] {
  return rows.map(([minRaw, maxRaw, band]) => ({ band, minRaw, maxRaw })).sort((a, b) => a.minRaw - b.minRaw);
}

const LISTENING_ROWS: readonly TableRow[] = [
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
  [11, 12, 4],
  [8, 10, 3.5],
  [6, 7, 3],
  [4, 5, 2.5],
  [3, 3, 2],
  [2, 2, 1.5],
  [1, 1, 1],
];

const ACADEMIC_READING_ROWS: readonly TableRow[] = [
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
  [8, 9, 3.5],
  [6, 7, 3],
  [5, 5, 2.5],
  [4, 4, 2],
  [3, 3, 1.5],
  [2, 2, 1],
];

const GENERAL_TRAINING_READING_ROWS: readonly TableRow[] = [
  [39, 40, 9],
  [37, 38, 8.5],
  [36, 36, 8],
  [35, 35, 7.5],
  [33, 34, 7],
  [31, 32, 6.5],
  [29, 30, 6],
  [26, 28, 5.5],
  [22, 25, 5],
  [18, 21, 4.5],
  [14, 17, 4],
  [12, 13, 3.5],
  [9, 11, 3],
  [7, 8, 2.5],
  [5, 6, 2],
  [3, 4, 1.5],
  [1, 2, 1],
];

const TABLES: Record<RawScoreScale, readonly RawScoreRow[]> = {
  listening: buildRows(LISTENING_ROWS),
  'academic-reading': buildRows(ACADEMIC_READING_ROWS),
  'general-training-reading': buildRows(GENERAL_TRAINING_READING_ROWS),
};

/**
 * The full conversion table for one scale, rows ascending by mark.
 *
 * @param scale - Scale identifier.
 */
export function rawScoreTable(scale: RawScoreScale): readonly RawScoreRow[] {
  return TABLES[scale];
}

/** Every table, keyed by scale, for `/v1/exam/tables`. */
export function rawScoreTables(): Record<RawScoreScale, readonly RawScoreRow[]> {
  return TABLES;
}

/**
 * The table row a raw mark falls in.
 *
 * @param scale - Scale identifier.
 * @param raw - Correct answers out of 40.
 * @returns The matching row, or `undefined` for a mark below the published table.
 */
export function bandForRaw(scale: RawScoreScale, raw: number): RawScoreRow | undefined {
  return rawScoreTable(scale).find((row) => raw >= row.minRaw && raw <= row.maxRaw);
}

/**
 * The fewest marks that reach a band.
 *
 * @param scale - Scale identifier.
 * @param band - Band score.
 * @returns The minimum raw mark, or `undefined` when the table has no row for the band.
 */
export function minRawForBand(scale: RawScoreScale, band: number): number | undefined {
  return rawScoreTable(scale).find((row) => row.band === band)?.minRaw;
}

/** The first table row above the given band, when one exists. */
function rowAbove(scale: RawScoreScale, band: number): RawScoreRow | undefined {
  return rawScoreTable(scale).find((row) => row.band > band);
}

/**
 * Which raw-score scale a skill of a given paper is marked on.
 *
 * @param module - Examination paper.
 * @param skill - Receptive skill with an objectively marked paper.
 */
export function scaleForSkill(module: ExamModule, skill: 'listening' | 'reading'): RawScoreScale {
  if (skill === 'listening') {
    return 'listening';
  }
  return module === 'academic' ? 'academic-reading' : 'general-training-reading';
}

/**
 * Convert a raw mark to an indicative band with the distance to the next band.
 *
 * @param scale - Scale identifier.
 * @param raw - Correct answers out of 40.
 */
export function rawScoreResult(scale: RawScoreScale, raw: number): RawScoreResult {
  const row = bandForRaw(scale, raw);
  const nextRow = row === undefined ? rawScoreTable(scale)[0] : rowAbove(scale, row.band);
  return {
    scale,
    raw,
    band: row?.band ?? null,
    range: row === undefined ? null : { minRaw: row.minRaw, maxRaw: row.maxRaw },
    next:
      nextRow === undefined
        ? null
        : { band: nextRow.band, minRaw: nextRow.minRaw, itemsNeeded: Math.max(0, nextRow.minRaw - raw) },
    note:
      row === undefined
        ? 'The mark is below the lowest published conversion row; official reports for such marks are ' +
          'not reproducible from public tables.'
        : nextRow === undefined
          ? 'Top of the published table: no band is reportable above 9.'
          : 'Indicative conversion from the compiled table; the official Test Report Form is authoritative.',
  };
}
