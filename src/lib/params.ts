import type { IeltsSkill } from "../types.js";

const SKILLS = ["listening", "reading", "writing", "speaking"] as const;

/**
 * Small, easily-tested helpers for reading optional query parameters.
 */

/** Parse an optional non-negative integer query parameter. */
export function optionalInt(value: unknown): number | undefined {
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return Number(value.trim());
  }
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }
  return undefined;
}

/** Parse a trimmed, non-empty optional string query parameter. */
export function optionalString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim() !== "") {
    return value.trim();
  }
  return undefined;
}

/** Interpret a value as `1` or `2` for IELTS writing task selection. */
export function optionalTask(value: unknown): 1 | 2 | undefined {
  const parsed = optionalInt(value);
  if (parsed === 1 || parsed === 2) {
    return parsed;
  }
  return undefined;
}

/** Interpret a value as a valid IELTS skill name. */
export function optionalSkill(value: unknown): IeltsSkill | undefined {
  if (typeof value === "string") {
    const candidate = value.trim().toLowerCase();
    if ((SKILLS as readonly string[]).includes(candidate)) {
      return candidate as IeltsSkill;
    }
  }
  return undefined;
}
