/**
 * Raw-score arithmetic.
 *
 * Turning "29 out of 40" into "band 6.5" is the single most common calculation
 * in IELTS preparation, and the one most often implemented badly: the tables
 * are copied inline, the Academic table is applied to General Training papers,
 * and short practice sections are rescaled to 40 as though rescaling were
 * equating. This module does the conversion once, and reports the things a
 * bare lookup hides — how close the score is to the next band, how fragile the
 * band is to a single mark, and how far away a target band still is.
 */

import { bandScaleEntry, cefrForBand } from '../data/bands.js';
import { RAW_SCORE_TOTAL, rowForRawScore } from '../data/rawScores.js';
import { badRequest } from './errors.js';

import type { RawScoreConversion, RawScoreSensitivity, RawScoreTable, RawScoreTarget } from '../types.js';

/**
 * Rescale a raw score from a shorter practice section to the 40-question scale.
 *
 * Mock-exam platforms routinely do this so that a single 10-question drill can
 * be shown as a band. It is a proportional rescaling and **not** an equating:
 * a 10-question section has roughly a quarter of the measurement precision of a
 * full paper, and one mark moves the scaled score by four. The API performs the
 * rescaling because clients need it, and flags it in the response so that the
 * loss of precision is visible rather than implied.
 *
 * @param correct - Raw score achieved.
 * @param outOf - Number of questions on the section.
 * @returns The score rescaled to 40 questions, rounded to the nearest mark.
 */
export function rescaleToForty(correct: number, outOf: number): number {
  if (outOf === RAW_SCORE_TOTAL) {
    return correct;
  }
  return Math.round((correct / outOf) * RAW_SCORE_TOTAL);
}

/**
 * Describe how the band would move if the raw score were one mark different.
 *
 * A score sitting on a threshold is materially riskier than one sitting in the
 * middle of a band, and the official caveat that thresholds "vary slightly from
 * test version to test version" makes that risk real rather than theoretical.
 *
 * @param table - Conversion table.
 * @param scaledCorrect - Raw score on the 40-question scale.
 * @param band - Band awarded at `scaledCorrect`.
 */
export function sensitivityAt(
  table: RawScoreTable,
  scaledCorrect: number,
  band: number,
): RawScoreSensitivity {
  const minusOne = scaledCorrect > 0 ? rowForRawScore(table, scaledCorrect - 1).band : null;
  const plusOne = scaledCorrect < RAW_SCORE_TOTAL ? rowForRawScore(table, scaledCorrect + 1).band : null;
  const stable = (minusOne === null || minusOne === band) && (plusOne === null || plusOne === band);
  return { minusOne, plusOne, stable };
}

/**
 * Compute progress towards a band the candidate is aiming for.
 *
 * @param table - Conversion table.
 * @param scaledCorrect - Raw score on the 40-question scale.
 * @param target - Band the candidate is aiming for.
 */
export function targetProgress(table: RawScoreTable, scaledCorrect: number, target: number): RawScoreTarget {
  const rows = table.rows.filter((row) => row.band >= target);
  const reachable = rows.at(-1);
  if (reachable === undefined) {
    return { band: target, minCorrect: null, marksNeeded: null, achieved: false };
  }
  const marksNeeded = Math.max(0, reachable.minCorrect - scaledCorrect);
  return {
    band: target,
    minCorrect: reachable.minCorrect,
    marksNeeded,
    achieved: marksNeeded === 0,
  };
}

/**
 * Convert a raw score to a band, with the context a bare lookup omits.
 *
 * @param table - Conversion table for the paper that was sat.
 * @param correct - Number of questions answered correctly.
 * @param outOf - Number of questions on the section (40 for a full paper).
 * @param target - Optional band the candidate is aiming for.
 * @returns The full conversion report.
 * @throws {HttpError} `400` when `correct` exceeds `outOf`.
 */
export function convertRawScore(
  table: RawScoreTable,
  correct: number,
  outOf: number,
  target?: number,
): RawScoreConversion {
  if (correct > outOf) {
    throw badRequest(`"correct" (${correct}) cannot exceed "outOf" (${outOf}).`, {
      parameter: 'correct',
      received: String(correct),
      max: String(outOf),
    });
  }
  const scaledCorrect = rescaleToForty(correct, outOf);
  const row = rowForRawScore(table, scaledCorrect);
  const higher = table.rows.filter((candidate) => candidate.band > row.band).at(-1);
  return {
    module: table.module,
    moduleName: table.name,
    correct,
    outOf,
    scaledCorrect,
    percentage: Math.round((correct / outOf) * 1000) / 10,
    band: row.band,
    cefr: cefrForBand(row.band),
    label: bandScaleEntry(row.band)?.label ?? 'Unknown',
    bandRange: { minCorrect: row.minCorrect, maxCorrect: row.maxCorrect },
    nextBand:
      higher === undefined
        ? null
        : {
            band: higher.band,
            minCorrect: higher.minCorrect,
            marksNeeded: higher.minCorrect - scaledCorrect,
          },
    sensitivity: sensitivityAt(table, scaledCorrect, row.band),
    target: target === undefined ? null : targetProgress(table, scaledCorrect, target),
  };
}
