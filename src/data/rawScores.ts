/**
 * Raw-score to band conversion tables for the two objective papers.
 *
 * Listening and Reading answers are machine-marked: the candidate's band is a
 * deterministic function of the number of correct answers out of 40. The IELTS
 * partners do not fix one table per paper — conversion can shift slightly
 * between test forms — but they publish representative tables, and every mock
 * or practice test applies one. The tables below reproduce the widely
 * published reference conversion, covering bands 9.0 down to the published
 * floor of 2.5; scores below the floor of a table fall outside the published
 * guidance and therefore report `band: null` rather than an invented value.
 */

import type { RawScoreTable, RawScoreTest } from '../types.js';

/** Shared caveat for every raw-score conversion. */
const NOTE =
  'Representative published conversion; individual test forms may shift a threshold by a mark or two. ' +
  'Scores below the table floor are outside the published guidance.';

/** Build a table from `[minCorrect, maxCorrect, band]` triples. */
function table(
  test: RawScoreTest,
  name: string,
  appliesTo: RawScoreTable['appliesTo'],
  sourceUrl: string,
  triples: readonly (readonly [number, number, number])[],
): RawScoreTable {
  return {
    test,
    name,
    appliesTo,
    questions: 40,
    provider: 'IELTS partners (British Council, IDP, Cambridge Assessment English)',
    sourceUrl,
    provenance: 'published-table',
    note: NOTE,
    rows: triples.map(([min, max, band]) => ({ correct: [min, max], band })),
  };
}

/** Listening: one conversion table shared by both modules. */
const LISTENING = table(
  'listening',
  'IELTS Listening (Academic and General Training)',
  ['academic', 'general-training'],
  'https://ielts.org/take-a-test/receiving-your-scores/how-ielts-is-scored',
  [
    [39, 40, 9.0],
    [37, 38, 8.5],
    [35, 36, 8.0],
    [32, 34, 7.5],
    [30, 31, 7.0],
    [26, 29, 6.5],
    [23, 25, 6.0],
    [18, 22, 5.5],
    [16, 17, 5.0],
    [13, 15, 4.5],
    [11, 12, 4.0],
    [8, 10, 3.5],
    [6, 7, 3.0],
    [4, 5, 2.5],
  ],
);

/** Academic Reading: three long texts, one conversion table. */
const ACADEMIC_READING = table(
  'academic-reading',
  'IELTS Reading (Academic)',
  ['academic'],
  'https://ielts.org/take-a-test/receiving-your-scores/how-ielts-is-scored',
  [
    [39, 40, 9.0],
    [37, 38, 8.5],
    [35, 36, 8.0],
    [33, 34, 7.5],
    [30, 32, 7.0],
    [27, 29, 6.5],
    [23, 26, 6.0],
    [19, 22, 5.5],
    [15, 18, 5.0],
    [13, 14, 4.5],
    [10, 12, 4.0],
    [8, 9, 3.5],
    [6, 7, 3.0],
    [4, 5, 2.5],
  ],
);

/** General Training Reading: easier texts, so bands demand more correct answers. */
const GENERAL_TRAINING_READING = table(
  'general-training-reading',
  'IELTS Reading (General Training)',
  ['general-training'],
  'https://ielts.org/take-a-test/receiving-your-scores/how-ielts-is-scored',
  [
    [40, 40, 9.0],
    [39, 39, 8.5],
    [37, 38, 8.0],
    [36, 36, 7.5],
    [34, 35, 7.0],
    [32, 33, 6.5],
    [30, 31, 6.0],
    [27, 29, 5.5],
    [23, 26, 5.0],
    [19, 22, 4.5],
    [15, 18, 4.0],
    [12, 14, 3.5],
    [9, 11, 3.0],
    [6, 8, 2.5],
  ],
);

/** The three raw-score conversion tables, Listening first. */
export const RAW_SCORE_TABLES: readonly RawScoreTable[] = [
  LISTENING,
  ACADEMIC_READING,
  GENERAL_TRAINING_READING,
];

/** Paper identifiers accepted by the conversion endpoints. */
export const RAW_SCORE_TESTS: readonly RawScoreTest[] = RAW_SCORE_TABLES.map((row) => row.test);

/**
 * Look up the conversion table for one objective paper.
 *
 * @param test - Paper identifier.
 */
export function rawScoreTable(test: RawScoreTest): RawScoreTable {
  return RAW_SCORE_TABLES.find((row) => row.test === test) as RawScoreTable;
}

/** Result of {@link convertRawScore}. */
export type RawScoreConversion = {
  /** Band in the published table, or `null` below the table floor. */
  band: number | null;
  /** Inclusive raw-score range the score falls into, or `null` below the floor. */
  range: [number, number] | null;
  /** `true` when the score is below the lowest published row. */
  belowFloor: boolean;
};

/**
 * Convert a raw score (correct answers out of 40) to a band via the published
 * conversion table. Scores below the table floor return `band: null`: IELTS
 * does not publish bands below 2.5 for the objective papers, and inventing
 * one would mislabel the data.
 *
 * @param test - Paper identifier.
 * @param correct - Correct answers (0-40).
 */
export function convertRawScore(test: RawScoreTest, correct: number): RawScoreConversion {
  const row = rawScoreTable(test).rows.find(({ correct: [min, max] }) => correct >= min && correct <= max);
  if (row === undefined) {
    return { band: null, range: null, belowFloor: true };
  }
  return { band: row.band, range: [row.correct[0], row.correct[1]], belowFloor: false };
}
