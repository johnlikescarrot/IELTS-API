/**
 * Spaced-repetition scheduling with the SM-2 algorithm.
 *
 * The vocabulary centre in <https://github.com/wanli4473/yysd-testcenter>
 * keeps a per-word draw pool scored by days since review, failure count and a
 * stubbornness multiplier (`server/vocab-challenge.js`): words resurface
 * exactly when they are about to be forgotten. This module offers the same
 * capability as a stateless calculator built on the classic SuperMemo SM-2
 * algorithm (Woźniak & Gorzelańczyk, 1994): {@link sm2Step} advances one
 * review, and {@link sm2Chain} previews a whole trajectory of grades. The
 * caller stores the three-number memory state; the API only computes.
 *
 * Recall quality follows the SM-2 0–5 scale: 5 is perfect recall, 3 is
 * correct recall with serious difficulty, and anything below 3 is a lapse
 * that restarts the repetition count.
 */

import { round2 } from './textstats.js';

/** Lowest easiness factor SM-2 permits. */
export const SM2_MIN_EASINESS = 1.3;

/** Highest easiness factor the API accepts as input. */
export const SM2_MAX_EASINESS = 5;

/** Easiness factor of a card that has never been reviewed. */
export const SM2_DEFAULT_EASINESS = 2.5;

/** Lowest recall quality that still counts as a pass. */
export const SM2_PASS_QUALITY = 3;

/** Highest recall quality. */
export const SM2_MAX_QUALITY = 5;

/** Most repetitions the API accepts as input. */
export const SM2_MAX_REPETITIONS = 1000;

/** Most interval days the API accepts as input. */
export const SM2_MAX_INTERVAL = 36500;

/** The SM-2 memory state of one card. */
export type SpacedRepetitionState = {
  /** Consecutive successful recalls (0 for a new or lapsed card). */
  repetitions: number;
  /** Easiness factor, at least 1.3. */
  easiness: number;
  /** Current interval in days. */
  intervalDays: number;
};

/** One SM-2 review outcome. */
export type SpacedRepetitionStep = {
  /** Recall quality the step was graded with. */
  quality: number;
  /** Whether the recall lapsed (quality below 3). */
  lapse: boolean;
  /** Repetition count after the review. */
  repetitions: number;
  /** Easiness factor after the review. */
  easiness: number;
  /** Next interval in days. */
  intervalDays: number;
  /** Approximate Leitner box (1–5) after the review. */
  leitnerBox: number;
  /** Human-readable next-review hint. */
  nextReview: string;
  /** Teaching advice for the grade. */
  advice: string;
};

/** Teaching advice per recall quality, indexed 0–5. */
const QUALITY_ADVICE = [
  'Complete blackout: relearn the item from scratch and review it tomorrow.',
  'Wrong answer, though familiar: restudy the item and review it tomorrow.',
  'Wrong answer, but the correct one felt close: restudy and review tomorrow.',
  'Correct with serious difficulty: the interval grows slowly from here.',
  'Correct after a hesitation: the interval grows normally from here.',
  'Perfect recall: push the interval out with confidence.',
] as const;

/**
 * Update the easiness factor for a recall quality.
 *
 * @param easiness - Current easiness factor.
 * @param quality - Recall quality (0–5).
 * @returns The next easiness factor, floored at 1.3.
 */
function nextEasiness(easiness: number, quality: number): number {
  const raw = easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  return Math.max(SM2_MIN_EASINESS, round2(raw));
}

/**
 * Advance one review with the SM-2 algorithm.
 *
 * @param state - Memory state before the review.
 * @param quality - Recall quality (0–5).
 * @returns The review outcome.
 */
export function sm2Step(state: SpacedRepetitionState, quality: number): SpacedRepetitionStep {
  const easiness = nextEasiness(state.easiness, quality);
  if (quality < SM2_PASS_QUALITY) {
    return {
      quality,
      lapse: true,
      repetitions: 0,
      easiness,
      intervalDays: 1,
      leitnerBox: 1,
      nextReview: 'Review tomorrow.',
      advice: QUALITY_ADVICE[quality] as string,
    };
  }
  const repetitions = state.repetitions + 1;
  let intervalDays = Math.round(state.intervalDays * easiness);
  if (repetitions === 1) {
    intervalDays = 1;
  } else if (repetitions === 2) {
    intervalDays = 6;
  }
  return {
    quality,
    lapse: false,
    repetitions,
    easiness,
    intervalDays,
    leitnerBox: Math.min(5, repetitions + 1),
    nextReview: intervalDays <= 1 ? 'Review tomorrow.' : `Review in ${intervalDays} days.`,
    advice: QUALITY_ADVICE[quality] as string,
  };
}

/**
 * Preview a trajectory of graded reviews.
 *
 * @param state - Memory state before the first review.
 * @param qualities - Recall qualities (0–5) in review order.
 * @returns One outcome per grade.
 */
export function sm2Chain(state: SpacedRepetitionState, qualities: readonly number[]): SpacedRepetitionStep[] {
  const steps: SpacedRepetitionStep[] = [];
  let current = state;
  for (const quality of qualities) {
    const step = sm2Step(current, quality);
    steps.push(step);
    current = step;
  }
  return steps;
}
