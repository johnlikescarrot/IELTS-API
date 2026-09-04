/**
 * Band-score arithmetic.
 *
 * IELTS reports four component scores and an overall score on a 0-9 scale in
 * half-band steps.  The overall score is the mean of the four components
 * rounded to the nearest whole or half band; means ending in exactly .25 or
 * .75 are rounded **up** (6.25 -> 6.5, 6.75 -> 7.0).
 */

import { badRequest } from './errors.js';

import type { Skill } from '../types.js';

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
