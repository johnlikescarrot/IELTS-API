/**
 * Target planning: what has to change for a candidate to reach a band.
 *
 * The overall band is the mean of the four components rounded to the nearest
 * half band with .25 and .75 rounding up, so the question "what do I need?"
 * has an exact arithmetic answer rather than a heuristic one. This module
 * computes it by searching the reportable band grid instead of inverting the
 * rounding rule algebraically — the grid is small (nineteen values per
 * component) and the search is exact, deterministic and easy to audit.
 */

import { BAND_STEP, MAX_BAND, roundBand, SKILLS } from './band.js';

import type { Skill, TargetAnalysis, TargetComponent } from '../types.js';

/** Every reportable band, ascending. */
export const BAND_GRID: readonly number[] = Array.from(
  { length: MAX_BAND / BAND_STEP + 1 },
  (_unused, index) => index * BAND_STEP,
);

/**
 * Smallest component sum whose mean rounds to a target band.
 *
 * @param target - Target overall band.
 * @returns The smallest sum of four components that reports as `target`.
 */
export function requiredSum(target: number): number {
  // Four components on a 0.5 grid: the sum is a multiple of 0.5 in [0, 36].
  for (let sum = 0; sum <= SKILLS.length * MAX_BAND; sum += BAND_STEP) {
    if (roundBand(sum / SKILLS.length) === target) {
      return sum;
    }
  }
  // Unreachable: band 9 is reported by a sum of 36, which the loop always hits.
  /* c8 ignore next */
  return SKILLS.length * MAX_BAND;
}

/**
 * Smallest band for one component that reaches the target, holding the others.
 *
 * @param components - Current component scores.
 * @param skill - Component allowed to move.
 * @param target - Target overall band.
 * @returns The required band, or `undefined` when even band 9 is not enough.
 */
export function requiredFor(
  components: Record<Skill, number>,
  skill: Skill,
  target: number,
): number | undefined {
  const others = SKILLS.filter((candidate) => candidate !== skill).reduce(
    (sum, candidate) => sum + components[candidate],
    0,
  );
  return BAND_GRID.find((band) => roundBand((others + band) / SKILLS.length) >= target);
}

/**
 * Analyse what each component would have to reach for the target to be met.
 *
 * @param components - Current component scores.
 * @param target - Target overall band.
 */
export function analyseTarget(components: Record<Skill, number>, target: number): TargetAnalysis {
  /** Achievable routes sort ahead of unreachable ones. */
  const rank = (route: TargetComponent): number => (route.achievable ? 0 : 1);

  const currentSum = SKILLS.reduce((sum, skill) => sum + components[skill], 0);
  const current = roundBand(currentSum / SKILLS.length);
  const met = current >= target;
  const needed = requiredSum(target);

  const routes: TargetComponent[] = SKILLS.map((skill) => {
    const required = requiredFor(components, skill, target);
    const lift = required === undefined ? null : Math.max(0, required - components[skill]);
    return {
      skill,
      current: components[skill],
      required: required ?? null,
      lift,
      achievable: required !== undefined,
    };
  }).sort(
    (left, right) =>
      rank(left) - rank(right) ||
      (left.lift ?? 0) - (right.lift ?? 0) ||
      SKILLS.indexOf(left.skill) - SKILLS.indexOf(right.skill),
  );

  const cheapest = routes.find((route) => route.achievable) ?? null;
  const shortfall = Math.max(0, needed - currentSum);
  // When the target is not met the current sum is always below the required
  // sum, so `shortfall` is strictly positive on this branch.
  const balanced = met
    ? null
    : (Object.fromEntries(
        SKILLS.map((skill) => [
          skill,
          Math.min(
            MAX_BAND,
            components[skill] + Math.ceil(shortfall / SKILLS.length / BAND_STEP) * BAND_STEP,
          ),
        ]),
      ) as Record<Skill, number>);

  return {
    components,
    current,
    target,
    met,
    pointsNeeded: shortfall / BAND_STEP,
    requiredSum: needed,
    currentSum,
    routes,
    cheapest,
    balanced,
  };
}
