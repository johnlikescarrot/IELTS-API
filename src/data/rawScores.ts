/**
 * Raw-score to band conversion for the two objectively marked papers.
 *
 * Listening and Reading are marked out of 40. Cambridge does not publish a
 * single official conversion — every live version is equated, so the cut
 * scores drift by a mark or two between test days — but the tables printed in
 * the *Cambridge IELTS* practice-test volumes have been stable for a decade and
 * are the tables every preparation centre actually uses. They are reproduced
 * here as **indicative** conversions, with the same caveat the volumes carry.
 *
 * Three tables are published: Listening (shared by both modules), Academic
 * Reading and General Training Reading. The General Training table is
 * deliberately harsher: its texts are easier, so more marks are needed for the
 * same band.
 *
 * Rows below the lowest published cut score are marked `extrapolated`, because
 * the practice volumes simply stop there. They are computed by continuing the
 * final published step and are flagged in every response so that nobody mistakes
 * them for a published cut score.
 */

import type { BandScore, RawScorePaper, RawScoreRow, RawScoreTable } from '../types.js';

/** Highest raw score obtainable on Listening and Reading. */
export const MAX_RAW_SCORE = 40;

/** Caveat surfaced with every raw-score conversion. */
const RAW_NOTE =
  'Indicative conversion reproduced from the Cambridge IELTS practice-test volumes. Live versions are equated individually, so a real test day may set a cut score one or two marks either side of these rows. Never quote a converted practice score as an official band.';

/** Build rows from `[band, min, max]` triples, marking sub-floor rows. */
function rows(triples: readonly (readonly [BandScore, number, number])[], floor: number): RawScoreRow[] {
  return triples.map(([band, min, max]) => ({
    band,
    minCorrect: min,
    maxCorrect: max,
    extrapolated: max < floor,
  }));
}

/** Listening cut scores; published down to 4 correct answers. */
const LISTENING: readonly (readonly [BandScore, number, number])[] = [
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
  [4, 11, 12],
  [3.5, 8, 10],
  [3, 6, 7],
  [2.5, 4, 5],
  [2, 3, 3],
  [1.5, 2, 2],
  [1, 1, 1],
  [0, 0, 0],
];

/** Academic Reading cut scores; published down to 4 correct answers. */
const ACADEMIC_READING: readonly (readonly [BandScore, number, number])[] = [
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
  [2, 3, 3],
  [1.5, 2, 2],
  [1, 1, 1],
  [0, 0, 0],
];

/** General Training Reading cut scores; published down to 6 correct answers. */
const GENERAL_READING: readonly (readonly [BandScore, number, number])[] = [
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
  [2, 4, 5],
  [1.5, 2, 3],
  [1, 1, 1],
  [0, 0, 0],
];

/** Every published raw-score table, keyed by paper. */
export const RAW_SCORE_TABLES: Readonly<Record<RawScorePaper, RawScoreTable>> = {
  listening: {
    paper: 'listening',
    name: 'Listening (Academic and General Training)',
    module: 'both',
    questions: MAX_RAW_SCORE,
    publishedFloor: 4,
    note: RAW_NOTE,
    source: 'Cambridge IELTS 1-19 practice-test volumes, "How to calculate your score".',
    rows: rows(LISTENING, 4),
  },
  'academic-reading': {
    paper: 'academic-reading',
    name: 'Academic Reading',
    module: 'academic',
    questions: MAX_RAW_SCORE,
    publishedFloor: 4,
    note: RAW_NOTE,
    source: 'Cambridge IELTS 1-19 Academic practice-test volumes.',
    rows: rows(ACADEMIC_READING, 4),
  },
  'general-reading': {
    paper: 'general-reading',
    name: 'General Training Reading',
    module: 'general-training',
    questions: MAX_RAW_SCORE,
    publishedFloor: 6,
    note: 'Indicative conversion reproduced from the Cambridge IELTS General Training practice-test volumes. The General Training texts are easier than the Academic ones, so the same band requires more correct answers. Live versions are equated individually.',
    source: 'Cambridge IELTS 1-19 General Training practice-test volumes.',
    rows: rows(GENERAL_READING, 6),
  },
};

/** Identifiers of every objectively marked paper. */
export const RAW_SCORE_PAPERS: readonly RawScorePaper[] = Object.keys(RAW_SCORE_TABLES) as RawScorePaper[];

/**
 * Find the row covering a raw score.
 *
 * @param paper - Paper whose table to read.
 * @param correct - Number of correct answers (0-40).
 * @returns The matching row; the tables cover 0-40 exhaustively.
 */
export function rawScoreRow(paper: RawScorePaper, correct: number): RawScoreRow {
  const table = RAW_SCORE_TABLES[paper];
  const row = table.rows.find((entry) => correct >= entry.minCorrect && correct <= entry.maxCorrect);
  /* c8 ignore next 3 -- the tables are exhaustive over 0-40; this guards a future edit. */
  if (row === undefined) {
    throw new RangeError(`No ${paper} row covers ${correct} correct answers.`);
  }
  return row;
}

/**
 * Lowest raw score that reaches a band on a paper.
 *
 * @param paper - Paper whose table to read.
 * @param band - Target band.
 * @returns The minimum number of correct answers, or `undefined` when the band
 *   is not a cut score on this paper.
 */
export function rawScoreForBand(paper: RawScorePaper, band: BandScore): number | undefined {
  return RAW_SCORE_TABLES[paper].rows.find((entry) => entry.band === band)?.minCorrect;
}

/**
 * Describe how far a raw score sits from the next band up.
 *
 * @param paper - Paper whose table to read.
 * @param correct - Number of correct answers.
 * @returns The next band and the extra marks it costs, or `null` at band 9.
 */
export function nextBandFrom(
  paper: RawScorePaper,
  correct: number,
): { band: BandScore; minCorrect: number; marksNeeded: number } | null {
  const higher = RAW_SCORE_TABLES[paper].rows
    .filter((entry) => entry.minCorrect > correct)
    .sort((left, right) => left.minCorrect - right.minCorrect)[0];
  if (higher === undefined) {
    return null;
  }
  return {
    band: higher.band,
    minCorrect: higher.minCorrect,
    marksNeeded: higher.minCorrect - correct,
  };
}
