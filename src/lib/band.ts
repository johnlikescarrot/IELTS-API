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

/** Result of {@link calculateTarget}. */
export type TargetResult = {
  /** The overall band the candidate wants. */
  target: number;
  /** The component solved for. */
  component: Skill;
  /** Component scores used for the calculation, including the solved one. */
  components: Record<Skill, number>;
  /** Components that were assumed rather than supplied by the caller. */
  assumed: readonly Skill[];
  /** Minimum band in the solved component that reaches the target, or `null` when infeasible. */
  required: number | null;
  /** `false` when the target is unreachable even with a 9 in the component. */
  feasible: boolean;
  /** Unrounded mean of the four components at the required score. */
  mean: number;
  /** Overall band achieved at the required score. */
  overall: number;
  /** Human-readable explanation of the calculation. */
  explanation: string;
};

/**
 * Solve the inverse band problem: the minimum score one component must reach
 * so that the rounded overall band is at least the target.
 *
 * The search walks every reportable band in ascending order, so the first hit
 * is the minimum by construction.
 *
 * @param target - Desired overall band.
 * @param component - Skill to solve for.
 * @param known - Known scores of the other components; missing skills are assumed at the target level.
 * @returns The target result including a worked explanation.
 */
export function calculateTarget(
  target: number,
  component: Skill,
  known: Partial<Record<Skill, number>>,
): TargetResult {
  const assumed = SKILLS.filter((skill) => skill !== component && known[skill] === undefined);
  const components = {} as Record<Skill, number>;
  for (const skill of SKILLS) {
    components[skill] = skill === component ? MAX_BAND : (known[skill] ?? target);
  }
  let required: number | undefined;
  for (let steps = 0; steps <= (MAX_BAND - MIN_BAND) / BAND_STEP; steps += 1) {
    const candidate = MIN_BAND + steps * BAND_STEP;
    components[component] = candidate;
    if (roundBand(meanOf(components)) >= target) {
      required = candidate;
      break;
    }
  }
  components[component] = required ?? MAX_BAND;
  const mean = meanOf(components);
  const overall = roundBand(mean);
  const assumedNote =
    assumed.length === 0
      ? 'All other components were supplied by the caller.'
      : `Missing components (${assumed.join(', ')}) were assumed at the target level of ${target.toFixed(1)}.`;
  const explanation =
    required !== undefined
      ? `Scoring at least ${required.toFixed(1)} in ${component} raises the mean to ${mean.toFixed(2)}, which rounds to overall ${overall.toFixed(1)}, reaching the target of ${target.toFixed(1)}. ${assumedNote}`
      : `Even a band 9.0 in ${component} leaves the mean at ${mean.toFixed(2)}, which rounds to ${overall.toFixed(1)} and misses the target of ${target.toFixed(1)}. ${assumedNote}`;
  return {
    target,
    component,
    components,
    assumed,
    required: required ?? null,
    feasible: required !== undefined,
    mean,
    overall,
    explanation,
  };
}
