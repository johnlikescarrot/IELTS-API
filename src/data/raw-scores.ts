/**
 * Raw-mark to band-score conversion tables for Listening and Reading.
 *
 * IELTS reports Listening and Reading as 40 objective items; every correct
 * answer earns one raw mark, and the raw mark maps onto a 0-9 band. The
 * published conversion varies slightly between test forms — the tables below
 * are the indicative conversions widely reproduced from IELTS partners
 * materials, suitable for practice scoring and research aggregation, not for
 * reproducing an official result.
 *
 * These tables make the API directly usable with the 40-question full tests
 * indexed in `/v1/catalog`: score a practice test, then ask
 * `/v1/scores/raw` for the band estimate.
 */

import { badRequest } from '../lib/errors.js';

import type { RawBandRow, RawScoreTableId } from '../types.js';

/** Human note attached to every conversion result. */
export const RAW_SCORE_NOTE =
  'Indicative conversion from a practice answer sheet. Official conversion tables vary by test form and are not published per form.';

/** Identifiers of the available tables, in menu order. */
export const RAW_SCORE_TABLE_IDS: readonly RawScoreTableId[] = [
  'listening',
  'reading-academic',
  'reading-general-training',
];

/** One table row range or lookup failure is a client error. */
const MAX_RAW = 40;

export interface RawScoreTable {
  id: RawScoreTableId;
  name: string;
  scope: string;
  rows: RawBandRow[];
}

/** Rows written as [min, max, band]. */
function rows(spec: readonly (readonly [number, number, number])[]): RawBandRow[] {
  return spec.map(([min, max, band]) => ({ min, max, band }));
}

/** All raw-mark tables. */
export const RAW_SCORE_TABLES: readonly RawScoreTable[] = [
  {
    id: 'listening',
    name: 'IELTS Listening (Academic and General Training)',
    scope: 'Same conversion for both modules; 40 items, one mark each.',
    rows: rows([
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
      [2, 3, 2],
      [1, 1, 1.5],
      [0, 0, 1],
    ]),
  },
  {
    id: 'reading-academic',
    name: 'IELTS Academic Reading',
    scope: '40 items across three academic passages, one mark each.',
    rows: rows([
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
      [4, 5, 2.5],
      [2, 3, 2],
      [1, 1, 1.5],
      [0, 0, 1],
    ]),
  },
  {
    id: 'reading-general-training',
    name: 'IELTS General Training Reading',
    scope:
      '40 items across three workplace and survival sections; a raw mark is worth more than in Academic.',
    rows: rows([
      [38, 40, 9],
      [36, 37, 8.5],
      [34, 35, 8],
      [32, 33, 7.5],
      [30, 31, 7],
      [27, 29, 6.5],
      [23, 26, 6],
      [19, 22, 5.5],
      [15, 18, 5],
      [12, 14, 4.5],
      [8, 11, 4],
      [6, 7, 3.5],
      [4, 5, 3],
      [3, 3, 2.5],
      [2, 2, 2],
      [1, 1, 1.5],
      [0, 0, 1],
    ]),
  },
];

/**
 * Look up one table definition.
 *
 * @param id - Table identifier.
 */
export function findRawScoreTable(id: string): RawScoreTable | undefined {
  return RAW_SCORE_TABLES.find((table) => table.id === id);
}

/**
 * Look up one table definition, raising `400` when it does not exist.
 *
 * @param id - Table identifier.
 */
export function listRawScoreTable(id: string): RawScoreTable {
  const table = findRawScoreTable(id);
  if (table === undefined) {
    throw badRequest(`Unknown conversion table "${id}".`, {
      parameter: 'table',
      allowed: RAW_SCORE_TABLE_IDS.join(','),
    });
  }
  return table;
}

/**
 * Convert a raw mark to an indicative band using one table.
 *
 * @param id - Table identifier.
 * @param raw - Raw marks out of 40.
 * @returns The table and the matching row.
 */
export function rawMarkToBand(id: string, raw: number): { table: RawScoreTable; row: RawBandRow } {
  const table = listRawScoreTable(id);
  const row = Number.isInteger(raw)
    ? table.rows.find((candidate) => raw >= candidate.min && raw <= candidate.max)
    : undefined;
  if (row === undefined) {
    throw badRequest(`Raw score must be an integer between 0 and ${MAX_RAW}.`, {
      parameter: 'raw',
      received: String(raw),
    });
  }
  return { table, row };
}
