import { ApiError } from "./errors.ts";

const SKILL_FIELDS = ["listening", "reading", "writing", "speaking"] as const;
export type SkillField = (typeof SKILL_FIELDS)[number];

/**
 * Validate one skill score from a request body. Scores must be numbers
 * between 0 and 9 in half-band steps (e.g. 6 or 6.5), mirroring how IELTS
 * reports section scores.
 */
export function validateSkillScore(field: SkillField, value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ApiError(400, "invalid_parameter", `Field '${field}' must be a number.`, [
      {
        param: field,
        message: `Received ${JSON.stringify(value) ?? "undefined"}; expected a number.`,
      },
    ]);
  }
  if (value < 0 || value > 9) {
    throw new ApiError(400, "invalid_parameter", `Field '${field}' must be between 0 and 9.`, [
      { param: field, message: `Received ${value}; scores run from 0 to 9.` },
    ]);
  }
  if (!Number.isInteger(value * 2)) {
    throw new ApiError(
      400,
      "invalid_parameter",
      `Field '${field}' must be a whole or half band (e.g. 6 or 6.5).`,
      [{ param: field, message: `Received ${value}; only .0 and .5 steps are valid.` }],
    );
  }
  return value;
}

/**
 * Compute the overall band score the way IELTS does: average the four skill
 * scores, then round to the nearest half band with quarter bands rounding up
 * (6.25 becomes 6.5, 6.75 becomes 7.0). `Math.round` implements exactly this
 * round-half-up behaviour once the average is doubled.
 */
export function computeOverallBand(scores: Record<SkillField, number>): number {
  const sum = SKILL_FIELDS.reduce((total, field) => total + scores[field], 0);
  return Math.round((sum / SKILL_FIELDS.length) * 2) / 2;
}
