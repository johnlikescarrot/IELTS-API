/**
 * Raw-score to band-score conversion tables.
 *
 * The Listening and Reading papers are marked out of 40 and converted to the
 * 0-9 band scale with a published, paper-specific conversion table. The three
 * tables below are the indicative conversions published by the IELTS partners
 * in the official practice materials: one for Listening, one for Academic
 * Reading and one for General Training Reading. General Training Reading is
 * the strictest of the three because its texts are less demanding.
 *
 * The tables are **indicative**. Live tests are equated: the exact raw-score
 * boundary for a band varies by a mark or two between versions of the test, so
 * these tables must be used for practice feedback and research, never as an
 * admissions rule. Every response built from them repeats that caveat.
 *
 * Only the ranges published by the partners are reproduced. Raw scores below
 * the lowest published row are reported as unmatched rather than extrapolated,
 * so that no number in a response is invented by this project.
 */

import type { RawScoreBand, RawScorePaper, RawScoreTable } from '../types.js';

/** Number of scored questions in a Listening or Reading paper. */
export const RAW_SCORE_MAXIMUM = 40;

/**
 * Build table rows from `[band, min, max]` triples, highest band first.
 *
 * @param triples - Band with its inclusive raw-score range.
 */
function rows(triples: readonly (readonly [number, number, number])[]): RawScoreBand[] {
  return triples.map(([band, min, max]) => ({
    band,
    min,
    max,
    display: min === max ? String(min) : `${min}–${max}`,
  }));
}

/** Listening conversion, identical for the Academic and General Training tests. */
const LISTENING = rows([
  [9, 39, 40],
  [8.5, 37, 38],
  [8, 35, 36],
  [7.5, 32, 34],
  [7, 30, 31],
  [6.5, 26, 29],
  [6, 23, 25],
  [5.5, 18, 22],
  [5, 16, 17],
  [4.5, 13, 15],
  [4, 10, 12],
  [3.5, 8, 9],
  [3, 6, 7],
  [2.5, 4, 5],
]);

/** Academic Reading conversion. */
const READING_ACADEMIC = rows([
  [9, 39, 40],
  [8.5, 37, 38],
  [8, 35, 36],
  [7.5, 33, 34],
  [7, 30, 32],
  [6.5, 27, 29],
  [6, 23, 26],
  [5.5, 19, 22],
  [5, 15, 18],
  [4.5, 13, 14],
  [4, 10, 12],
  [3.5, 8, 9],
  [3, 6, 7],
  [2.5, 4, 5],
]);

/** General Training Reading conversion: the strictest of the three tables. */
const READING_GENERAL = rows([
  [9, 40, 40],
  [8.5, 39, 39],
  [8, 37, 38],
  [7.5, 36, 36],
  [7, 34, 35],
  [6.5, 32, 33],
  [6, 30, 31],
  [5.5, 27, 29],
  [5, 23, 26],
  [4.5, 19, 22],
  [4, 15, 18],
  [3.5, 12, 14],
  [3, 9, 11],
  [2.5, 6, 8],
]);

/** Shared caveat repeated in every raw-score response. */
const CAVEAT =
  'Indicative conversion from official practice material. Live tests are equated, so the raw-score boundary for a band moves by one or two marks between versions; use for practice feedback and research only.';

/** The three published conversion tables, keyed by paper. */
export const RAW_SCORE_TABLES: Record<RawScorePaper, RawScoreTable> = {
  listening: {
    paper: 'listening',
    name: 'Listening',
    module: 'both',
    maximum: RAW_SCORE_MAXIMUM,
    sourceUrl: 'https://www.ielts.org/for-organisations/ielts-scoring-in-detail',
    note: CAVEAT,
    bands: LISTENING,
  },
  'reading-academic': {
    paper: 'reading-academic',
    name: 'Academic Reading',
    module: 'academic',
    maximum: RAW_SCORE_MAXIMUM,
    sourceUrl: 'https://www.ielts.org/for-organisations/ielts-scoring-in-detail',
    note: CAVEAT,
    bands: READING_ACADEMIC,
  },
  'reading-general': {
    paper: 'reading-general',
    name: 'General Training Reading',
    module: 'general-training',
    maximum: RAW_SCORE_MAXIMUM,
    sourceUrl: 'https://www.ielts.org/for-organisations/ielts-scoring-in-detail',
    note: CAVEAT,
    bands: READING_GENERAL,
  },
};

/** The papers for which a raw-score table is published. */
export const RAW_SCORE_PAPERS: readonly RawScorePaper[] = Object.keys(RAW_SCORE_TABLES) as RawScorePaper[];

/**
 * Convert a raw score to its indicative band.
 *
 * @param paper - Paper whose table applies.
 * @param raw - Raw score out of 40.
 * @returns The matching row, or `undefined` below the published range.
 */
export function bandForRaw(paper: RawScorePaper, raw: number): RawScoreBand | undefined {
  return RAW_SCORE_TABLES[paper].bands.find((row) => raw >= row.min && raw <= row.max);
}

/**
 * Find the lowest raw score that reaches a band.
 *
 * @param paper - Paper whose table applies.
 * @param band - Target band.
 * @returns The matching row, or `undefined` when the band is not tabulated.
 */
export function rawForBand(paper: RawScorePaper, band: number): RawScoreBand | undefined {
  return RAW_SCORE_TABLES[paper].bands.find((row) => row.band === band);
}
