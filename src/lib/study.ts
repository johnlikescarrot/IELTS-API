/**
 * Raw-score arithmetic.
 *
 * Listening and the two Reading papers are machine-marked out of 40, and the
 * IELTS partners publish indicative band mappings for them. Every mapping is
 * exposed with its provenance and caveat (see `RAW_SCORE_TABLES`), and marks
 * below the lowest published interval report `null` rather than a guess.
 */

import { findRawScoreTable } from '../data/skills.js';
import { badRequest } from './errors.js';

import type { RawScoreTable } from '../types.js';

/** Lowest raw mark accepted by the raw-score endpoint. */
export const MIN_RAW_SCORE = 0;

/** Highest raw mark on a 40-question paper. */
export const MAX_RAW_SCORE = 40;

/**
 * Map a raw mark to its indicative band score.
 *
 * @param table - Raw-score table identifier.
 * @param raw - Raw mark between 0 and 40 inclusive.
 * @returns The matching row's band, or `null` when no published interval covers the mark.
 * @throws {HttpError} `400` when the table is unknown or the mark is out of range.
 */
export function rawToBand(table: string, raw: number): number | null {
  const scoreTable = findRawScoreTable(table);
  if (scoreTable === undefined) {
    throw badRequest(`Unknown raw-score table "${table}".`, { parameter: 'scale', received: table });
  }
  if (!Number.isInteger(raw) || raw < MIN_RAW_SCORE || raw > MAX_RAW_SCORE) {
    throw badRequest(`"raw" must be an integer between ${MIN_RAW_SCORE} and ${MAX_RAW_SCORE}.`, {
      parameter: 'raw',
      received: String(raw),
    });
  }
  const row = scoreTable.rows.find((candidate) => raw >= candidate.min && raw <= candidate.max);
  return row === undefined ? null : row.band;
}

/** Result of {@link convertRawMark}. */
export type RawMarkResult = {
  /** The table used for the mapping. */
  table: RawScoreTable;
  /** Indicative band, or `null` when no published interval covers the mark. */
  band: number | null;
};

/**
 * Map a raw mark to its indicative band together with the table used.
 *
 * @param table - Raw-score table identifier.
 * @param raw - Raw mark between 0 and 40 inclusive.
 * @throws {HttpError} `400` when the table is unknown or the mark is out of range.
 */
export function convertRawMark(table: string, raw: number): RawMarkResult {
  const scoreTable = findRawScoreTable(table);
  if (scoreTable === undefined) {
    throw badRequest(`Unknown raw-score table "${table}".`, { parameter: 'scale', received: table });
  }
  return { table: scoreTable, band: rawToBand(table, raw) };
}
