/**
 * Spaced-repetition engine (SM-2, Leitner, Ebbinghaus).
 *
 * The scheduling core is Piotr Wozniak's SM-2 (1987, 1990) as described in
 * Wozniak & Gorzelanczyk (1994) and re-used by Anki, Mnemosyne and
 * Iamdacai/ielts-vocab-system.  The implementation is deliberately stateless:
 * it maps one review (quality + card state) to the next state, so a client
 * can reproduce the schedule without a server-side user store - the property
 * that makes the endpoint archivable and citable.
 *
 * Formulas:
 *   ease' = ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))   clamped to [1.3, 3.0]
 *   if q < 3: repetitions' = 0, interval' = 1
 *   else: repetitions' = repetitions + 1,
 *         interval' = 1  (repetitions' == 1)
 *                  = 6  (repetitions' == 2)
 *                  = round(interval * ease') otherwise
 *   Leitner box: 1 -> 2 on success else 1, decremented on failure, max 5
 *   Ebbinghaus retention: R(t) = e^{-t / S} with S proxied by interval
 *   Wozniak P.  (1990). Optimization of learning. Unpublished master's thesis,
 *   Wroclaw University of Technology.
 */

import { badRequest } from './errors.js';

import type { RetentionPoint, SrsCardState, SrsQuality, SrsResult, SrsSchedule } from '../types.js';

/** Map simplified result labels to SM-2 quality scores. */
const RESULT_TO_QUALITY: Record<SrsResult, SrsQuality> = {
  again: 0,
  hard: 3,
  good: 4,
  easy: 5,
};

/** Clamp ease factor to the SM-2 range. */
function clampEase(value: number): number {
  if (value < 1.3) return 1.3;
  if (value > 3.0) return 3.0;
  return Math.round(value * 100) / 100;
}

/**
 * Parse `quality` or `result` into a 0-5 quality score.
 *
 * @param quality - Integer 0-5 when supplied.
 * @param result - Shorthand label when supplied.
 */
export function parseQuality(quality: number | undefined, result: string | undefined): SrsQuality {
  if (quality !== undefined && result !== undefined) {
    throw badRequest('Provide either "quality" or "result", not both.', {
      parameter: 'quality/result',
    });
  }
  if (result !== undefined) {
    const normalised = result.trim().toLowerCase() as SrsResult;
    const mapped = RESULT_TO_QUALITY[normalised];
    if (mapped === undefined) {
      throw badRequest('Parameter "result" must be one of: again, hard, good, easy.', {
        parameter: 'result',
        received: result,
      });
    }
    return mapped;
  }
  if (quality === undefined) {
    throw badRequest('Parameter "quality" (0-5) or "result" (again|hard|good|easy) is required.', {
      parameter: 'quality',
    });
  }
  if (!Number.isInteger(quality) || quality < 0 || quality > 5) {
    throw badRequest('Parameter "quality" must be an integer between 0 and 5.', {
      parameter: 'quality',
      received: String(quality),
    });
  }
  return quality as SrsQuality;
}

/** Assert a card state is within bounds. */
function assertState(state: SrsCardState): void {
  if (typeof state.easeFactor !== 'number' || !Number.isFinite(state.easeFactor)) {
    throw badRequest('Parameter "ease" must be a number between 1.3 and 3.0.', {
      parameter: 'ease',
      received: String(state.easeFactor),
    });
  }
  if (state.easeFactor < 1.3 || state.easeFactor > 3.0) {
    throw badRequest('Parameter "ease" must be between 1.3 and 3.0.', {
      parameter: 'ease',
      received: String(state.easeFactor),
    });
  }
  if (!Number.isInteger(state.intervalDays) || state.intervalDays < 0 || state.intervalDays > 36500) {
    throw badRequest('Parameter "interval" must be an integer between 0 and 36500.', {
      parameter: 'interval',
      received: String(state.intervalDays),
    });
  }
  if (!Number.isInteger(state.repetitions) || state.repetitions < 0 || state.repetitions > 1000) {
    throw badRequest('Parameter "repetitions" must be an integer between 0 and 1000.', {
      parameter: 'repetitions',
      received: String(state.repetitions),
    });
  }
  if (!Number.isInteger(state.lapses) || state.lapses < 0 || state.lapses > 1000) {
    throw badRequest('Parameter "lapses" must be an integer between 0 and 1000.', {
      parameter: 'lapses',
      received: String(state.lapses),
    });
  }
}

/**
 * Apply the SM-2 update for one review.
 *
 * @param quality - SM-2 quality 0-5.
 * @param state - Card state before the review.
 */
export function scheduleSrs(quality: SrsQuality, state: SrsCardState): SrsSchedule {
  assertState(state);
  const success = quality >= 3;
  const delta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  const nextEaseFactor = clampEase(state.easeFactor + delta);
  let nextIntervalDays: number;
  let nextRepetitions: number;

  if (!success) {
    nextRepetitions = 0;
    nextIntervalDays = 1;
  } else {
    nextRepetitions = state.repetitions + 1;
    if (nextRepetitions === 1) nextIntervalDays = 1;
    else if (nextRepetitions === 2) nextIntervalDays = 6;
    else nextIntervalDays = Math.round(state.intervalDays * nextEaseFactor);
    if (nextIntervalDays < 1) nextIntervalDays = 1;
    if (nextIntervalDays > 36500) nextIntervalDays = 36500;
  }

  // Leitner: 1->2->3->4->5 on success, back to 1 on failure.
  // Estimate box from repetitions, then apply transition.
  const currentBox = Math.min(5, Math.max(1, state.repetitions + 1));
  const leitnerBox = success ? Math.min(5, currentBox + 1) : 1;

  // Ebbinghaus retention at due date: R = exp(-t / S), S ~ nextInterval
  const stability = Math.max(1, nextIntervalDays);
  const estimatedRetention = Math.round(Math.exp(-nextIntervalDays / stability) * 100) / 100;

  let recommendation: string;
  if (!success) recommendation = 'Quality < 3: card returned to learning - review tomorrow.';
  else if (quality === 3) recommendation = 'Hard recall: interval grew modestly; consider more exposures.';
  else if (quality === 4) recommendation = 'Good recall: interval advanced on the SM-2 curve.';
  else recommendation = 'Easy recall: interval advanced with ease bonus.';

  return {
    easeFactor: state.easeFactor,
    intervalDays: state.intervalDays,
    repetitions: state.repetitions,
    lapses: state.lapses,
    quality,
    success,
    nextIntervalDays,
    nextEaseFactor,
    nextRepetitions,
    dueInDays: nextIntervalDays,
    estimatedRetention,
    leitnerBox,
    recommendation,
  };
}

/**
 * Build an Ebbinghaus retention curve.
 *
 * @param strength - Memory stability S in days (1-365).
 * @param days - How many days to sample (1-365).
 */
export function retentionCurve(strength: number, days: number): RetentionPoint[] {
  if (!Number.isFinite(strength) || strength < 1 || strength > 365) {
    throw badRequest('Parameter "strength" must be between 1 and 365.', {
      parameter: 'strength',
      received: String(strength),
    });
  }
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    throw badRequest('Parameter "days" must be an integer between 1 and 365.', {
      parameter: 'days',
      received: String(days),
    });
  }
  const points: RetentionPoint[] = [];
  for (let day = 1; day <= days; day += 1) {
    const retention = Math.round(Math.exp(-day / strength) * 10000) / 10000;
    points.push({
      days: day,
      retention,
      forgettingPercent: Math.round((1 - retention) * 10000) / 100,
    });
  }
  return points;
}

/**
 * Rank a review queue (due-date ascending, then ease descending).
 *
 * This mirrors the ordering used by ielts-vocab-system's daily review fetch:
 * overdue first, hardest among equals due at the same time.
 *
 * @param cards - Cards with `nextReviewInDays` and `easeFactor`.
 */
export function rankQueue<T extends { nextReviewInDays: number; easeFactor: number }>(
  cards: readonly T[],
): T[] {
  return [...cards].sort((left, right) => {
    if (left.nextReviewInDays !== right.nextReviewInDays) {
      return left.nextReviewInDays - right.nextReviewInDays;
    }
    return right.easeFactor - left.easeFactor;
  });
}
