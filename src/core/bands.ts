import { requireEnum, requireNumber } from './validate.ts';

/** The four assessed IELTS skills. */
export const SKILLS = ['listening', 'reading', 'writing', 'speaking'] as const;
/** Union of the four assessed IELTS skills. */
export type Skill = (typeof SKILLS)[number];

/** IELTS test variants that change raw-score conversion. */
export const MODULES = ['academic', 'general'] as const;
/** Union of supported test modules. */
export type Module = (typeof MODULES)[number];

/**
 * Round a score to the nearest IELTS reportable band.
 *
 * IELTS reports whole and half bands. The published rule is: an average ending
 * in `.25` rounds up to the next half band, and one ending in `.75` rounds up to
 * the next whole band; anything else rounds to the nearest half band.
 */
export function roundToBand(value: number): number {
  const clamped = Math.min(9, Math.max(0, value));
  const whole = Math.floor(clamped);
  const fraction = Number((clamped - whole).toFixed(10));
  if (fraction < 0.25) return whole;
  if (fraction < 0.75) return whole + 0.5;
  return whole + 1;
}

/**
 * Compute the IELTS overall band from the four skill bands.
 *
 * @param scores - Band score (0-9) for each skill.
 * @returns The rounded overall band and the unrounded arithmetic mean.
 */
export function overallBand(scores: Record<Skill, number>): {
  overall: number;
  mean: number;
  components: Record<Skill, number>;
} {
  const components = {} as Record<Skill, number>;
  for (const skill of SKILLS) {
    components[skill] = requireNumber(scores[skill], skill, 0, 9);
  }
  const mean = SKILLS.reduce((sum, skill) => sum + components[skill], 0) / SKILLS.length;
  return { overall: roundToBand(mean), mean: Number(mean.toFixed(4)), components };
}

/**
 * Raw-score (out of 40) to band conversion tables.
 *
 * Each entry is `[minimumRawScore, band]`, sorted descending. Values follow the
 * conversion charts published in the official Cambridge IELTS practice test
 * series; they are indicative rather than contractual, as real tests are
 * equated individually.
 */
const CONVERSION: Record<
  'listening' | 'reading_academic' | 'reading_general',
  readonly (readonly [number, number])[]
> = {
  listening: [
    [39, 9],
    [37, 8.5],
    [35, 8],
    [32, 7.5],
    [30, 7],
    [26, 6.5],
    [23, 6],
    [18, 5.5],
    [16, 5],
    [13, 4.5],
    [11, 4],
    [8, 3.5],
    [6, 3],
    [4, 2.5],
    [3, 2],
    [2, 1.5],
    [1, 1],
    [0, 0],
  ],
  reading_academic: [
    [39, 9],
    [37, 8.5],
    [35, 8],
    [33, 7.5],
    [30, 7],
    [27, 6.5],
    [23, 6],
    [19, 5.5],
    [15, 5],
    [13, 4.5],
    [10, 4],
    [8, 3.5],
    [6, 3],
    [4, 2.5],
    [3, 2],
    [2, 1.5],
    [1, 1],
    [0, 0],
  ],
  reading_general: [
    [40, 9],
    [39, 8.5],
    [37, 8],
    [36, 7.5],
    [34, 7],
    [32, 6.5],
    [30, 6],
    [27, 5.5],
    [23, 5],
    [19, 4.5],
    [15, 4],
    [12, 3.5],
    [9, 3],
    [6, 2.5],
    [4, 2],
    [2, 1.5],
    [1, 1],
    [0, 0],
  ],
};

/**
 * Convert a raw score out of 40 into an indicative band score.
 *
 * @param rawScore - Number of correct answers, 0-40.
 * @param skill - Either `listening` or `reading`.
 * @param module - Test module; only affects `reading`.
 */
export function rawToBand(
  rawScore: number,
  skill: 'listening' | 'reading',
  module: Module = 'academic',
): { rawScore: number; band: number; skill: string; module: Module; nextBandAt: number | null } {
  const raw = requireNumber(rawScore, 'rawScore', 0, 40);
  const validSkill = requireEnum(skill, 'skill', ['listening', 'reading'] as const);
  const validModule = requireEnum(module, 'module', MODULES);
  const key =
    validSkill === 'listening'
      ? 'listening'
      : validModule === 'academic'
        ? 'reading_academic'
        : 'reading_general';
  const table = CONVERSION[key];
  const floored = Math.floor(raw);
  let band = 0;
  let nextBandAt: number | null = null;
  for (let index = 0; index < table.length; index += 1) {
    const row = table[index]!;
    if (floored >= row[0]) {
      band = row[1];
      const better = table[index - 1];
      nextBandAt = better ? better[0] : null;
      break;
    }
  }
  return { rawScore: floored, band, skill: validSkill, module: validModule, nextBandAt };
}

/**
 * Work out how many extra raw marks are needed to reach a target band.
 *
 * Because band 9 is always attainable with 40 correct answers, every target in
 * the valid range 0-9 is reachable and the result is never negative.
 *
 * @returns The number of additional raw marks required, zero if already met.
 */
export function marksToTarget(
  rawScore: number,
  targetBand: number,
  skill: 'listening' | 'reading',
  module: Module = 'academic',
): number {
  const target = requireNumber(targetBand, 'targetBand', 0, 9);
  const current = Math.floor(requireNumber(rawScore, 'rawScore', 0, 40));
  let required = 40;
  for (let candidate = 40; candidate >= current; candidate -= 1) {
    if (rawToBand(candidate, skill, module).band >= target) {
      required = candidate;
    }
  }
  return Math.max(0, required - current);
}
