/**
 * Score planning utilities: what a candidate still needs in order to reach a
 * target Overall Band Score.
 *
 * Because the overall rounding rule is non-obvious, candidates and advisers
 * routinely mis-estimate the score required in a remaining skill. The functions
 * here answer the question exactly by searching the discrete reporting scale.
 *
 * @packageDocumentation
 */

import { SKILLS, type Band, type Skill } from "../core/types.ts";
import { BAND_SCALE, overallBandScore, type ComponentBands } from "./band.ts";

/** Known component scores, with exactly one skill omitted. */
export type PartialComponents = Partial<Record<Skill, Band>>;

/** The outcome of a target-score query. */
export interface TargetPlan {
  /** The Overall Band Score the candidate is aiming for. */
  readonly target: Band;
  /** The skill that is still outstanding. */
  readonly missingSkill: Skill;
  /** The known component scores. */
  readonly known: PartialComponents;
  /**
   * The lowest band in the outstanding skill that reaches the target, or `null`
   * when even a band 9 would not be enough.
   */
  readonly requiredBand: Band | null;
  /** The overall score that would result from {@link TargetPlan.requiredBand}. */
  readonly resultingOverall: Band | null;
  /** Whether the target is attainable at all. */
  readonly attainable: boolean;
}

/**
 * Determines the minimum band required in the one outstanding skill to reach a
 * target Overall Band Score.
 *
 * @param known - Component scores for exactly three of the four skills.
 * @param target - The desired Overall Band Score.
 * @returns The plan, including `requiredBand: null` when the target is out of
 * reach.
 * @throws {RangeError} If `known` does not contain exactly three skills.
 */
export function planForTarget(
  known: PartialComponents,
  target: Band,
): TargetPlan {
  const missing = SKILLS.filter((skill) => known[skill] === undefined);
  if (missing.length !== 1) {
    throw new RangeError(
      "exactly three of the four component scores must be supplied",
    );
  }
  const missingSkill = missing[0]!;

  for (const candidate of BAND_SCALE) {
    const components = {
      listening: known.listening ?? 0,
      reading: known.reading ?? 0,
      writing: known.writing ?? 0,
      speaking: known.speaking ?? 0,
      [missingSkill]: candidate,
    } as ComponentBands;

    const result = overallBandScore(components);
    if (result.overall >= target) {
      return {
        target,
        missingSkill,
        known,
        requiredBand: candidate,
        resultingOverall: result.overall,
        attainable: true,
      };
    }
  }

  return {
    target,
    missingSkill,
    known,
    requiredBand: null,
    resultingOverall: null,
    attainable: false,
  };
}
