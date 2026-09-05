/**
 * Raw-score to band conversion tables for the receptive papers.
 *
 * Listening and Reading each carry 40 questions, one mark per question and no
 * negative marking; the raw score is then converted to a band on the 0-9
 * scale. The IELTS partners publish conversion guidance per test version
 * (see {@link RAW_SCORE_SOURCE}), and the thresholds shift by up to one mark
 * when a paper is unusually easy or hard. The tables below are the
 * commonly reproduced indicative compilation; rows below band 3.0 are
 * deliberately omitted because published versions diverge there, and the API
 * reports `null` rather than a number it cannot source consistently.
 *
 * This module publishes derived numbers only; no upstream content is
 * redistributed.
 */

import type { IeltsModule, RawScoreConversion, RawScoreTable, RawScoreTableId } from '../types.js';

/** Published guidance used as the provenance of every table. */
export const RAW_SCORE_SOURCE = {
  title: 'IELTS partners: how the Listening and Reading papers are scored',
  url: 'https://www.ielts.org/for-organisations/ielts-scoring-in-detail',
} as const;

/** Caveat attached to every table and conversion. */
export const RAW_SCORE_NOTE =
  'Indicative conversion compiled from the IELTS partners\u2019 published scoring guidance and cross-checked ' +
  'against five independently published reproductions; exact boundaries vary by test version by up to one mark, ' +
  'and rows below band 3.0 are omitted because published tables diverge there.';

/**
 * Listening conversion: one table serves both modules, because the paper,
 * the audio and the marking are identical for Academic and General Training.
 */
const LISTENING_TABLE: RawScoreTable = {
  id: 'listening',
  skill: 'listening',
  module: null,
  questions: 40,
  name: 'Listening (Academic and General Training)',
  sourceTitle: RAW_SCORE_SOURCE.title,
  sourceUrl: RAW_SCORE_SOURCE.url,
  note: `${RAW_SCORE_NOTE} One table serves both modules; only Reading differs by module.`,
  rows: [
    { min: 6, max: 7, band: 3.0 },
    { min: 8, max: 9, band: 3.5 },
    { min: 10, max: 12, band: 4.0 },
    { min: 13, max: 15, band: 4.5 },
    { min: 16, max: 17, band: 5.0 },
    { min: 18, max: 22, band: 5.5 },
    { min: 23, max: 25, band: 6.0 },
    { min: 26, max: 29, band: 6.5 },
    { min: 30, max: 31, band: 7.0 },
    { min: 32, max: 34, band: 7.5 },
    { min: 35, max: 36, band: 8.0 },
    { min: 37, max: 38, band: 8.5 },
    { min: 39, max: 40, band: 9.0 },
  ],
};

/** Academic Reading conversion: harder passages, so fewer marks per band. */
const READING_ACADEMIC_TABLE: RawScoreTable = {
  id: 'reading-academic',
  skill: 'reading',
  module: 'academic',
  questions: 40,
  name: 'Reading (Academic)',
  sourceTitle: RAW_SCORE_SOURCE.title,
  sourceUrl: RAW_SCORE_SOURCE.url,
  note: `${RAW_SCORE_NOTE} Academic passages are harder, so fewer correct answers are needed for each band than in General Training.`,
  rows: [
    { min: 6, max: 7, band: 3.0 },
    { min: 8, max: 9, band: 3.5 },
    { min: 10, max: 12, band: 4.0 },
    { min: 13, max: 14, band: 4.5 },
    { min: 15, max: 18, band: 5.0 },
    { min: 19, max: 22, band: 5.5 },
    { min: 23, max: 26, band: 6.0 },
    { min: 27, max: 29, band: 6.5 },
    { min: 30, max: 32, band: 7.0 },
    { min: 33, max: 34, band: 7.5 },
    { min: 35, max: 36, band: 8.0 },
    { min: 37, max: 38, band: 8.5 },
    { min: 39, max: 40, band: 9.0 },
  ],
};

/** General Training Reading conversion: easier texts, so stricter thresholds. */
const READING_GENERAL_TRAINING_TABLE: RawScoreTable = {
  id: 'reading-general-training',
  skill: 'reading',
  module: 'general-training',
  questions: 40,
  name: 'Reading (General Training)',
  sourceTitle: RAW_SCORE_SOURCE.title,
  sourceUrl: RAW_SCORE_SOURCE.url,
  note: `${RAW_SCORE_NOTE} General Training texts are easier, so the same band needs more correct answers than in Academic.`,
  rows: [
    { min: 9, max: 11, band: 3.0 },
    { min: 12, max: 14, band: 3.5 },
    { min: 15, max: 18, band: 4.0 },
    { min: 19, max: 22, band: 4.5 },
    { min: 23, max: 26, band: 5.0 },
    { min: 27, max: 29, band: 5.5 },
    { min: 30, max: 31, band: 6.0 },
    { min: 32, max: 33, band: 6.5 },
    { min: 34, max: 35, band: 7.0 },
    { min: 36, max: 36, band: 7.5 },
    { min: 37, max: 38, band: 8.0 },
    { min: 39, max: 39, band: 8.5 },
    { min: 40, max: 40, band: 9.0 },
  ],
};

/** Every conversion table, in report order. */
export const RAW_SCORE_TABLES: readonly RawScoreTable[] = [
  LISTENING_TABLE,
  READING_ACADEMIC_TABLE,
  READING_GENERAL_TRAINING_TABLE,
];

/** Table identifiers, in report order. */
export const RAW_SCORE_TABLE_IDS: readonly RawScoreTableId[] = [
  'listening',
  'reading-academic',
  'reading-general-training',
];

/** Lookup table for {@link convertRawScore}. */
const BY_ID: Record<RawScoreTableId, RawScoreTable> = {
  listening: LISTENING_TABLE,
  'reading-academic': READING_ACADEMIC_TABLE,
  'reading-general-training': READING_GENERAL_TRAINING_TABLE,
};

/**
 * Return the table identifier for a paper and module.
 *
 * @param skill - Receptive paper.
 * @param module - Module for Reading; ignored for Listening, which shares one table.
 */
export function rawTableIdFor(skill: 'listening' | 'reading', module: IeltsModule): RawScoreTableId {
  if (skill === 'listening') {
    return 'listening';
  }
  return module === 'general-training' ? 'reading-general-training' : 'reading-academic';
}

/**
 * Look up one conversion table.
 *
 * @param id - Table identifier.
 */
export function rawScoreTable(id: RawScoreTableId): RawScoreTable {
  return BY_ID[id];
}

/**
 * Convert a raw score (correct answers out of 40) to a band score.
 *
 * @param id - Table to use.
 * @param correct - Correct answers, already validated to 0-40.
 */
export function convertRawScore(id: RawScoreTableId, correct: number): RawScoreConversion {
  const table = BY_ID[id];
  const row = table.rows.find((candidate) => correct >= candidate.min && correct <= candidate.max);
  const ahead = table.rows.find((candidate) => candidate.min > correct);
  const behindRows = [...table.rows].reverse();
  const behind = behindRows.find((candidate) => candidate.max < correct);
  return {
    table: id,
    skill: table.skill,
    module: table.module,
    correct,
    questions: table.questions,
    band: row?.band ?? null,
    matched: row !== undefined,
    row: row ?? null,
    oneBandAhead: ahead === undefined ? null : { band: ahead.band, correct: ahead.min },
    oneBandBehind: behind === undefined ? null : { band: behind.band, correct: behind.max },
  };
}
