/**
 * Band-score arithmetic.
 *
 * IELTS reports four component scores and an overall score on a 0-9 scale in
 * half-band steps. The overall score is the mean of the four components
 * rounded to the nearest whole or half band; means ending in exactly .25 or
 * .75 are rounded **up** (6.25 -> 6.5, 6.75 -> 7.0).
 */

import { badRequest } from './errors.js';

import type { BandScore, RawToBandResult, Skill } from '../types.js';

/** The four IELTS components, in the order used by test reports. */
export const SKILLS: readonly Skill[] = ['listening', 'reading', 'writing', 'speaking'];

/** Lowest reportable band. */
export const MIN_BAND = 0;

/** Highest reportable band. */
export const MAX_BAND = 9;

/** Smallest reportable step. */
export const BAND_STEP = 0.5;

/**
 * Return `true` when `value` is a reportable band score.
 *
 * @param value - Candidate value.
 */
export function isValidBand(value: unknown): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return false;
  }
  if (value < MIN_BAND || value > MAX_BAND) {
    return false;
  }
  const steps = value / BAND_STEP;
  return Math.abs(steps - Math.round(steps)) < 1e-9;
}

/**
 * Validate a band value supplied by a client.
 *
 * @param value - Raw value.
 * @param label - Field name used in the error message.
 * @returns The validated band.
 * @throws {HttpError} `400` when the value is not a reportable band.
 */
export function assertBand(value: unknown, label: string): number {
  if (!isValidBand(value)) {
    throw badRequest(`"${label}" must be a band score between ${MIN_BAND} and ${MAX_BAND} in 0.5 steps.`, {
      parameter: label,
      received: String(value),
    });
  }
  return value;
}

/**
 * Round a mean component score to the nearest reportable band.
 *
 * @param value - Unrounded mean.
 * @returns The nearest half band, with ties rounded up.
 */
export function roundBand(value: number): number {
  const doubled = Math.round(value * 2 * 1e6) / 1e6;
  const rounded = Math.round(doubled) / 2;
  return Math.min(MAX_BAND, Math.max(MIN_BAND, rounded));
}

/**
 * Compute the arithmetic mean of the four component scores.
 *
 * @param components - Object keyed by skill.
 * @returns The unrounded mean.
 */
export function meanOf(components: Record<Skill, number>): number {
  const total = SKILLS.reduce((sum, skill) => sum + components[skill], 0);
  return total / SKILLS.length;
}

/** Result of {@link calculateOverall}. */
export type OverallResult = {
  /** Component scores echoed back. */
  components: Record<Skill, number>;
  /** Unrounded mean of the components. */
  mean: number;
  /** Overall band score after IELTS rounding. */
  overall: number;
  /** Indicative CEFR level of the overall band. */
  cefr: string;
  /** Distance in half-bands between the weakest and strongest component. */
  spread: number;
  /** Human-readable explanation of the rounding decision. */
  explanation: string;
};

/**
 * Calculate an overall IELTS band score from the four component scores.
 *
 * @param components - Component scores.
 * @param cefrFor - Resolver mapping a band to its indicative CEFR level.
 * @returns The overall result including a worked explanation.
 */
export function calculateOverall(
  components: Record<Skill, number>,
  cefrFor: (band: number) => string,
): OverallResult {
  const mean = meanOf(components);
  const overall = roundBand(mean);
  const values = SKILLS.map((skill) => components[skill]);
  const spread = Math.max(...values) - Math.min(...values);
  const tie = Math.abs(Math.abs((mean * 2) % 1) - 0.5) < 1e-9;
  const explanation = tie
    ? `The mean of the four components is ${mean.toFixed(2)}, which falls exactly between two bands; IELTS rounds a .25/.75 mean up, giving ${overall.toFixed(1)}.`
    : `The mean of the four components is ${mean.toFixed(2)}, which rounds to the nearest half band: ${overall.toFixed(1)}.`;
  return { components, mean, overall, cefr: cefrFor(overall), spread, explanation };
}

/** Raw-to-band conversion tables. */
type RawConversionRow = { min: number; max: number; band: BandScore };

const LISTENING_RAW_TABLE: readonly RawConversionRow[] = [
  { min: 39, max: 40, band: 9.0 },
  { min: 37, max: 38, band: 8.5 },
  { min: 35, max: 36, band: 8.0 },
  { min: 32, max: 34, band: 7.5 },
  { min: 30, max: 31, band: 7.0 },
  { min: 26, max: 29, band: 6.5 },
  { min: 23, max: 25, band: 6.0 },
  { min: 18, max: 22, band: 5.5 },
  { min: 16, max: 17, band: 5.0 },
  { min: 13, max: 15, band: 4.5 },
  { min: 10, max: 12, band: 4.0 },
  { min: 8, max: 9, band: 3.5 },
  { min: 6, max: 7, band: 3.0 },
  { min: 4, max: 5, band: 2.5 },
  { min: 2, max: 3, band: 2.0 },
  { min: 1, max: 1, band: 1.0 },
  { min: 0, max: 0, band: 0.0 },
];

const ACADEMIC_READING_RAW_TABLE: readonly RawConversionRow[] = [
  { min: 39, max: 40, band: 9.0 },
  { min: 37, max: 38, band: 8.5 },
  { min: 35, max: 36, band: 8.0 },
  { min: 33, max: 34, band: 7.5 },
  { min: 30, max: 32, band: 7.0 },
  { min: 27, max: 29, band: 6.5 },
  { min: 23, max: 26, band: 6.0 },
  { min: 19, max: 22, band: 5.5 },
  { min: 15, max: 18, band: 5.0 },
  { min: 13, max: 14, band: 4.5 },
  { min: 10, max: 12, band: 4.0 },
  { min: 8, max: 9, band: 3.5 },
  { min: 6, max: 7, band: 3.0 },
  { min: 4, max: 5, band: 2.5 },
  { min: 2, max: 3, band: 2.0 },
  { min: 1, max: 1, band: 1.0 },
  { min: 0, max: 0, band: 0.0 },
];

const GENERAL_READING_RAW_TABLE: readonly RawConversionRow[] = [
  { min: 40, max: 40, band: 9.0 },
  { min: 39, max: 39, band: 8.5 },
  { min: 37, max: 38, band: 8.0 },
  { min: 36, max: 36, band: 7.5 },
  { min: 34, max: 35, band: 7.0 },
  { min: 32, max: 33, band: 6.5 },
  { min: 30, max: 31, band: 6.0 },
  { min: 27, max: 29, band: 5.5 },
  { min: 23, max: 26, band: 5.0 },
  { min: 19, max: 22, band: 4.5 },
  { min: 15, max: 18, band: 4.0 },
  { min: 12, max: 14, band: 3.5 },
  { min: 8, max: 11, band: 3.0 },
  { min: 5, max: 7, band: 2.5 },
  { min: 3, max: 4, band: 2.0 },
  { min: 1, max: 2, band: 1.0 },
  { min: 0, max: 0, band: 0.0 },
];

/**
 * Convert a raw score (0-40) to an indicative IELTS band score.
 *
 * @param rawScore - Number of correct questions out of 40.
 * @param skill - 'listening' | 'reading'.
 * @param module - 'academic' | 'general-training' (ignored for listening).
 */
export function rawScoreToBand(
  rawScore: number,
  skill: 'listening' | 'reading',
  module: 'academic' | 'general-training' = 'academic',
): RawToBandResult {
  if (!Number.isInteger(rawScore) || rawScore < 0 || rawScore > 40) {
    throw badRequest('Raw score must be an integer between 0 and 40.', {
      parameter: 'raw',
      received: String(rawScore),
    });
  }

  let table: readonly RawConversionRow[];
  if (skill === 'listening') {
    table = LISTENING_RAW_TABLE;
  } else if (module === 'general-training') {
    table = GENERAL_READING_RAW_TABLE;
  } else {
    table = ACADEMIC_READING_RAW_TABLE;
  }

  const row = table.find((r) => rawScore >= r.min && rawScore <= r.max) as RawConversionRow;
  return {
    rawScore,
    skill,
    module: skill === 'listening' ? 'academic' : module,
    band: row.band,
    range: [row.min, row.max],
  };
}
