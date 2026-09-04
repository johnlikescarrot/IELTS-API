/**
 * The IELTS nine-band scale and the official arithmetic used to report it.
 *
 * Two rules matter and are implemented here exactly:
 *
 * 1. Component (skill) band scores are reported in whole and half bands.
 * 2. The Overall Band Score is the mean of the four component scores rounded so
 *    that a fractional part of exactly `.25` is rounded **up** to the next half
 *    band and a fractional part of exactly `.75` is rounded **up** to the next
 *    whole band; any other mean is rounded to the nearest whole or half band.
 *
 * The second rule is *not* ordinary "round half to even" or "round half up"
 * arithmetic, and reimplementations frequently get it wrong; see
 * `docs/reproducibility.md` for the exhaustive verification strategy.
 *
 * @packageDocumentation
 */

import type { Band } from "../core/types.ts";

export type { Band };

/** The smallest reportable increment of the IELTS band scale. */
export const BAND_STEP = 0.5;

/** The lowest reportable band score. */
export const MIN_BAND = 0;

/** The highest reportable band score. */
export const MAX_BAND = 9;

/**
 * Every reportable band score in ascending order: `0, 0.5, 1, ..., 9`.
 */
export const BAND_SCALE: readonly Band[] = Object.freeze(
  Array.from(
    { length: (MAX_BAND - MIN_BAND) / BAND_STEP + 1 },
    (_unused, index) => MIN_BAND + index * BAND_STEP,
  ),
);

/**
 * Short public descriptions of the nine whole bands, paraphrased from the
 * publicly published IELTS band scale.
 */
export const BAND_SCALE_DESCRIPTIONS: Readonly<Record<number, string>> =
  Object.freeze({
    9: "Expert user: has fully operational command of the language, with accurate, appropriate and fluent use and complete understanding.",
    8: "Very good user: has fully operational command with only occasional unsystematic inaccuracies and inappropriate usage; may misunderstand some things in unfamiliar situations.",
    7: "Good user: has operational command of the language, though with occasional inaccuracies, inappropriate usage and misunderstandings in some situations.",
    6: "Competent user: has generally effective command of the language despite some inaccuracies, inappropriate usage and misunderstandings.",
    5: "Modest user: has partial command of the language, coping with overall meaning in most situations, though is likely to make many mistakes.",
    4: "Limited user: basic competence is limited to familiar situations; has frequent problems in understanding and expression.",
    3: "Extremely limited user: conveys and understands only general meaning in very familiar situations.",
    2: "Intermittent user: has great difficulty understanding spoken and written English.",
    1: "Non-user: has essentially no ability to use the language beyond possibly a few isolated words.",
    0: "Did not attempt the test: no assessable information was provided.",
  });

/**
 * Returns `true` when `value` is a finite multiple of 0.5 within `[0, 9]`.
 *
 * @param value - Candidate band score.
 */
export function isReportableBand(value: number): boolean {
  if (!Number.isFinite(value)) {
    return false;
  }
  if (value < MIN_BAND || value > MAX_BAND) {
    return false;
  }
  return Number.isInteger(value * 2);
}

/**
 * Rounds an arbitrary mean onto the IELTS reporting scale.
 *
 * The rule is applied on the fractional part of the mean:
 *
 * | Fractional part | Result                       |
 * | --------------- | ---------------------------- |
 * | `[0, .25)`      | round down to the whole band |
 * | `[.25, .75)`    | round to the half band       |
 * | `[.75, 1)`      | round up to the whole band   |
 *
 * Boundaries `.25` and `.75` therefore round upwards, which reproduces the
 * documented IELTS behaviour (for example `6.25 -> 6.5` and `6.75 -> 7.0`).
 *
 * @param mean - An arithmetic mean of band scores.
 * @returns The reportable band score.
 */
export function roundToReportedBand(mean: number): Band {
  const clamped = Math.min(Math.max(mean, MIN_BAND), MAX_BAND);
  const whole = Math.floor(clamped);
  const fraction = clamped - whole;

  if (fraction < 0.25) {
    return whole;
  }
  if (fraction < 0.75) {
    return whole + 0.5;
  }
  return whole + 1;
}

/** The four component band scores that make up an overall band score. */
export interface ComponentBands {
  /** Listening band score. */
  readonly listening: Band;
  /** Reading band score. */
  readonly reading: Band;
  /** Writing band score. */
  readonly writing: Band;
  /** Speaking band score. */
  readonly speaking: Band;
}

/** The result of an overall band score computation. */
export interface OverallBandResult {
  /** The component scores that were supplied. */
  readonly components: ComponentBands;
  /** The unrounded arithmetic mean of the four components. */
  readonly mean: number;
  /** The reported Overall Band Score. */
  readonly overall: Band;
  /** The rounding rule that produced {@link OverallBandResult.overall}. */
  readonly rounding: "down-to-whole" | "to-half" | "up-to-whole";
}

/**
 * Computes the IELTS Overall Band Score from four component band scores.
 *
 * @param components - The four component band scores.
 * @returns The mean, the reported overall band and the rounding branch taken.
 */
export function overallBandScore(
  components: ComponentBands,
): OverallBandResult {
  const mean =
    (components.listening +
      components.reading +
      components.writing +
      components.speaking) /
    4;
  const overall = roundToReportedBand(mean);
  const fraction = mean - Math.floor(mean);
  const rounding =
    fraction < 0.25
      ? "down-to-whole"
      : fraction < 0.75
        ? "to-half"
        : "up-to-whole";

  return { components, mean, overall, rounding };
}

/**
 * Averages an arbitrary set of analytic criterion scores and rounds the mean
 * onto the reporting scale. This is how the Writing and Speaking papers combine
 * their four equally weighted criteria.
 *
 * @param criterionScores - One score per criterion; must not be empty.
 * @returns The mean and the reported band.
 * @throws {RangeError} If `criterionScores` is empty.
 */
export function averageCriteriaToBand(criterionScores: readonly number[]): {
  mean: number;
  band: Band;
} {
  if (criterionScores.length === 0) {
    throw new RangeError("at least one criterion score is required");
  }
  const total = criterionScores.reduce((sum, score) => sum + score, 0);
  const mean = total / criterionScores.length;
  return { mean, band: roundToReportedBand(mean) };
}
