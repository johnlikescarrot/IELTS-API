/**
 * Spaced-repetition, streak and review-queue planning.
 *
 * Three rehearsal models are compared side-by-side:
 *
 * - **Ebbinghaus** — fixed expanding intervals measured in minutes, as
 *   implemented in the reference vocab-system
 *   (`[5, 30, 720, 1440, 2880, 5760, 10080, 21600]` — 5 min to 15 days).
 *   After the base ladder the final interval is stretched by `1 + mastery/100`.
 * - **Leitner** — five boxes with intervals `[1, 3, 7, 14, 30]` days. A correct
 *   recall promotes one box; an error demotes to box 1.
 * - **SM-2** — an illustrative variant inspired by Wozniak (1990), not Anki compatibility. Each card carries
 *   `interval` (days), `repetitions` and `easeFactor` (EF ∈ [1.3, ∞), default
 *   2.5). Quality `q ∈ [0,5]` updates EF via
 *   `EF' = EF + (0.1 − (5−q)·(0.08 + (5−q)·0.02))` then clamps at 1.3. When
 *   `q < 3` repetitions reset to 0 and interval returns to 1; otherwise
 *   intervals become 1, 6, `prev·EF'` for repetitions 0, 1, ≥2.
 *
 * Added to the rehearsal models are pure helpers for calendar heat-maps,
 * streak arithmetic, forgetting-curve retention and mistake prioritisation.
 * Results are reproducible with explicit reference dates. Some helpers default
 * to the current clock. This comparison variant differs from the versioned
 * sm2-v1 state contract in review.ts: do not interchange their states.
 *
 * References:
 * - Ebbinghaus, H. (1885). *Über das Gedächtnis.*
 * - Leitner, S. (1972). *So lernt man lernen.*
 * - Wozniak, P. A. (1990). Optimization of learning. Unpublished MSc.
 * - Cepeda, N. J. et al. (2006). Distributed practice in verbal recall tasks.
 *   Psychological Bulletin, 132(3), 354-380. doi:10.1037/0033-2909.132.3.354
 */

import { hashString, mulberry32 } from './rng.js';

/** Base Ebbinghaus intervals in minutes: 5 min, 30 min, 12 h, 1 d, 2 d, 4 d, 7 d, 15 d. */
export const EBBINGHAUS_INTERVALS_MINUTES: readonly number[] = [5, 30, 720, 1440, 2880, 5760, 10080, 21600];

/** Leitner box intervals in days (5 boxes). */
export const LEITNER_INTERVALS_DAYS: readonly number[] = [1, 3, 7, 14, 30];

/** Number of Leitner boxes. */
export const LEITNER_BOXES = 5;

/** SM-2 defaults. */
export const SM2_DEFAULT_EASE = 2.5;
export const SM2_MIN_EASE = 1.3;
export const SM2_EASE_STEP = 0.1;

/** Activity-level thresholds in minutes per day for the calendar heat-map. */
export const CALENDAR_THRESHOLDS: readonly number[] = [0, 15, 30, 60];

/** Allowed SM-2 quality ratings. */
export type SM2Quality = 0 | 1 | 2 | 3 | 4 | 5;

/** SM-2 card state. */
export type SM2Card = {
  /** Current interval in days. */
  interval: number;
  /** Consecutive correct repetitions. */
  repetitions: number;
  /** Ease factor (≥ 1.3). */
  easeFactor: number;
};

/** One step of an Ebbinghaus schedule. */
export type EbbinghausStep = {
  /** 0-based repetition index. */
  repetition: number;
  /** Interval in minutes until the next review. */
  intervalMinutes: number;
  /** Interval in days (rounded to 2 decimals for JSON). */
  intervalDays: number;
  /** ISO timestamp of the due date (when `now` is supplied). */
  dueAt: string | null;
};

/** Combined schedule comparing the three models. */
export type SrsSchedule = {
  ebbinghaus: { steps: readonly EbbinghausStep[]; nextDueAt: string };
  leitner: { box: number; intervalDays: number; nextDueAt: string };
  sm2: { updated: SM2Card; nextDueAt: string };
  retention: { halfLifeDays: number; retentionAtInterval: number };
};

/** Streak summary for a set of ISO dates. */
export type StreakSummary = {
  /** Number of dates supplied (unique). */
  totalDays: number;
  /** Longest run of consecutive days. */
  longestStreak: number;
  /** Current run ending at the most recent date (0 when history is empty). */
  currentStreak: number;
  /** Earliest date supplied (YYYY-MM-DD) or null. */
  firstDate: string | null;
  /** Latest date supplied (YYYY-MM-DD) or null. */
  lastDate: string | null;
};

/** One cell of the calendar heat-map. */
export type CalendarDay = {
  /** Calendar date (YYYY-MM-DD). */
  date: string;
  /** Simulated minutes studied that day. */
  minutes: number;
  /** Heat-map level 0-4 (0 = no study). */
  level: number;
};

/**
 * Clamp a number to an inclusive range.
 *
 * @param value - Value to clamp.
 * @param min - Lower bound.
 * @param max - Upper bound.
 */
function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

/**
 * Add minutes to a Date.
 *
 * @param date - Base date.
 * @param minutes - Minutes to add (may be fractional).
 */
function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

/**
 * Add days to a Date (UTC midnight preserved for calendar maths).
 *
 * @param date - Base date.
 * @param days - Days to add.
 */
function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

/**
 * Round to two decimals.
 *
 * @param value - Value to round.
 */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Parse an ISO date `YYYY-MM-DD` as UTC midnight.
 *
 * @param iso - ISO date.
 */
function parseIsoDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

/**
 * Validate an ISO date `YYYY-MM-DD`.
 *
 * @param iso - Candidate string.
 * @returns True when the date is a valid calendar date.
 */
export function isIsoDate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return false;
  }
  const date = parseIsoDate(iso);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === iso;
}

/**
 * Compute the next review date under the Ebbinghaus ladder.
 *
 * @param reviewCount - Consecutive reviews already completed (0 = new word).
 * @param masteryScore - Mastery 0-100; stretches the final rung by `1 + mastery/100`.
 * @param now - Reference time (defaults to `new Date()`).
 */
export function ebbinghausNextReview(
  reviewCount: number,
  masteryScore: number,
  now: Date = new Date(),
): Date {
  const clampedMastery = clamp(masteryScore, 0, 100);
  const count = Math.max(0, Math.floor(reviewCount));
  if (count >= EBBINGHAUS_INTERVALS_MINUTES.length) {
    const base = EBBINGHAUS_INTERVALS_MINUTES[EBBINGHAUS_INTERVALS_MINUTES.length - 1] as number;
    const adjustment = 1 + clampedMastery / 100;
    return addMinutes(now, base * adjustment);
  }
  const interval = EBBINGHAUS_INTERVALS_MINUTES[count] as number;
  return addMinutes(now, interval);
}

/**
 * Update a mastery score from one answering event.
 *
 * Mirrors the reference vocab-system: correct answers raise the score by
 * `confidence·5`, errors lower it by `confidence·8`, clamped to [0, 100].
 *
 * @param currentMastery - Current mastery 0-100.
 * @param isCorrect - Whether the answer was correct.
 * @param confidence - Self-rated confidence 1-5.
 */
export function updateMasteryScore(currentMastery: number, isCorrect: boolean, confidence: number): number {
  const clampedConfidence = clamp(Math.round(confidence), 1, 5);
  const clampedMastery = clamp(currentMastery, 0, 100);
  const delta = isCorrect ? clampedConfidence * 5 : -clampedConfidence * 8;
  const next = clamp(clampedMastery + delta, 0, 100);
  return Math.round(next * 100) / 100;
}

/**
 * Forgetting-curve retention `R = exp(−t / S)` where `S` is stability (days).
 *
 * @param elapsedDays - Days since last review (≥ 0).
 * @param stabilityDays - Memory stability in days (> 0).
 * @returns Unfitted model output in [0, 1], not calibrated recall probability.
 */
export function forgettingRetention(elapsedDays: number, stabilityDays: number): number {
  const t = Math.max(0, elapsedDays);
  const s = Math.max(0.1, stabilityDays);
  return round2(Math.exp(-t / s));
}

/**
 * Half-life (days) to 50 % retention for a given stability.
 *
 * @param stabilityDays - Stability in days.
 */
export function retentionHalfLife(stabilityDays: number): number {
  const s = Math.max(0.1, stabilityDays);
  return round2(s * Math.log(2));
}

/**
 * SM-2 ease-factor update.
 *
 * @param easeFactor - Current EF.
 * @param quality - Quality rating 0-5.
 */
export function sm2UpdatedEase(easeFactor: number, quality: SM2Quality): number {
  const ef = clamp(easeFactor, SM2_MIN_EASE, 10);
  const updated = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  return round2(Math.max(SM2_MIN_EASE, updated));
}

/**
 * Apply the SM-2 algorithm to one review.
 *
 * @param card - Current card state.
 * @param quality - Quality 0-5 (< 3 counts as incorrect).
 * @returns Updated card (interval in days).
 */
export function sm2Update(card: SM2Card, quality: SM2Quality): SM2Card {
  const easeFactor = sm2UpdatedEase(card.easeFactor, quality);
  if (quality < 3) {
    return { interval: 1, repetitions: 0, easeFactor };
  }
  const reps = card.repetitions + 1;
  let interval: number;
  if (reps === 1) {
    interval = 1;
  } else if (reps === 2) {
    interval = 6;
  } else {
    interval = Math.round(card.interval * easeFactor);
  }
  return { interval, repetitions: reps, easeFactor };
}

/**
 * Next Leitner box after one review.
 *
 * @param currentBox - Current box 1..5.
 * @param correct - Whether the answer was correct.
 */
export function leitnerNextBox(currentBox: number, correct: boolean): number {
  const box = clamp(Math.round(currentBox), 1, LEITNER_BOXES);
  if (correct) {
    return Math.min(LEITNER_BOXES, box + 1);
  }
  return 1;
}

/**
 * Interval in days for a Leitner box.
 *
 * @param box - Box 1..5.
 */
export function leitnerIntervalDays(box: number): number {
  const index = clamp(Math.round(box), 1, LEITNER_BOXES) - 1;
  return LEITNER_INTERVALS_DAYS[index] as number;
}

/**
 * Due date for a Leitner box.
 *
 * @param box - Current box.
 * @param correct - Whether the last review was correct (determines the *next* box).
 * @param now - Reference time.
 */
export function leitnerDueDate(box: number, correct: boolean, now: Date = new Date()): Date {
  const nextBox = leitnerNextBox(box, correct);
  return addDays(now, leitnerIntervalDays(nextBox));
}

/**
 * Activity level 0-4 for a daily total.
 *
 * Levels after flooring minutes: 0 (0), 1 (1-14), 2 (15-29), 3 (30-59), 4 (60+).
 *
 * @param minutes - Minutes studied (≥ 0).
 */
export function calendarLevel(minutes: number): number {
  const mins = Math.max(0, Math.floor(minutes));
  if (mins === 0) {
    return 0;
  }
  if (mins < 15) {
    return 1;
  }
  if (mins < 30) {
    return 2;
  }
  if (mins < 60) {
    return 3;
  }
  return 4;
}

/**
 * Generate a deterministic demo calendar heat-map.
 *
 * Useful as a reproducible fixture for the `GET /v1/srs/calendar` endpoint and
 * for research figures. Minutes are drawn from a seeded distribution that
 * mimics the 0-90 min range seen in the reference system.
 *
 * @param seed - Seed string.
 * @param days - Number of days to generate (1-365).
 * @param endDateIso - End date `YYYY-MM-DD` (defaults to today UTC).
 */
export function demoCalendar(seed: string, days: number, endDateIso?: string): CalendarDay[] {
  const total = clamp(Math.round(days), 1, 365);
  const endIso = endDateIso ?? new Date().toISOString().slice(0, 10);
  if (!isIsoDate(endIso)) {
    throw new Error(`Invalid end date: ${endIso}`);
  }
  const end = parseIsoDate(endIso);
  const rng = mulberry32(hashString(seed));
  const result: CalendarDay[] = [];
  for (let offset = total - 1; offset >= 0; offset -= 1) {
    const date = addDays(end, -offset);
    const iso = date.toISOString().slice(0, 10);
    // Distribution: 20% zero, otherwise 5-90 with slight heavy tail.
    const roll = rng();
    let minutes: number;
    if (roll < 0.2) {
      minutes = 0;
    } else {
      const skewed = Math.pow(rng(), 0.7);
      minutes = Math.round(5 + skewed * 85);
    }
    result.push({ date: iso, minutes, level: calendarLevel(minutes) });
  }
  return result;
}

/**
 * Compute streaks from an unordered set of ISO dates.
 *
 * Consecutive means calendar-consecutive in UTC.
 *
 * @param isoDates - ISO dates `YYYY-MM-DD` (duplicates are ignored).
 */
export function computeStreak(isoDates: readonly string[]): StreakSummary {
  if (isoDates.length === 0) {
    return { totalDays: 0, longestStreak: 0, currentStreak: 0, firstDate: null, lastDate: null };
  }
  const valid = [...new Set(isoDates.filter((value) => isIsoDate(value)))].sort();
  if (valid.length === 0) {
    return { totalDays: 0, longestStreak: 0, currentStreak: 0, firstDate: null, lastDate: null };
  }
  let longest = 1;
  let current = 1;
  let run = 1;
  for (let index = 1; index < valid.length; index += 1) {
    const previous = parseIsoDate(valid[index - 1] as string).getTime();
    const currentTime = parseIsoDate(valid[index] as string).getTime();
    const diffDays = Math.round((currentTime - previous) / 86_400_000);
    if (diffDays === 1) {
      run += 1;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
  }
  // Current streak: run ending at the most recent date.
  for (let index = valid.length - 1; index > 0; index -= 1) {
    const later = parseIsoDate(valid[index] as string).getTime();
    const earlier = parseIsoDate(valid[index - 1] as string).getTime();
    const diffDays = Math.round((later - earlier) / 86_400_000);
    if (diffDays === 1) {
      current += 1;
    } else {
      break;
    }
  }
  return {
    totalDays: valid.length,
    longestStreak: longest,
    currentStreak: current,
    firstDate: valid[0] as string,
    lastDate: valid[valid.length - 1] as string,
  };
}

/**
 * Priority score for a mistake entry (higher = review sooner).
 *
 * Formula: `priority = errorCount * 10 + daysSinceLastError * 0.5 + (100 - mastery) * 0.2`
 * plus a small leech penalty when `errorCount ≥ 5`.
 *
 * @param errorCount - Times the word was answered incorrectly (≥ 1).
 * @param daysSinceLastError - Days since last error (≥ 0).
 * @param mastery - Current mastery 0-100.
 */
export function mistakePriority(errorCount: number, daysSinceLastError: number, mastery: number): number {
  const errors = Math.max(1, Math.floor(errorCount));
  const days = Math.max(0, daysSinceLastError);
  const master = clamp(mastery, 0, 100);
  let score = errors * 10 + days * 0.5 + (100 - master) * 0.2;
  if (errors >= 5) {
    score += 5;
  }
  return round2(score);
}

/**
 * Build a full comparison schedule for one review step.
 *
 * @param options - Scheduling inputs.
 */
export function buildSrsSchedule(options: {
  reviewCount: number;
  masteryScore: number;
  sm2Card: SM2Card;
  quality: SM2Quality;
  leitnerBox: number;
  leitnerCorrect: boolean;
  now: Date;
}): SrsSchedule {
  const { reviewCount, masteryScore, sm2Card, quality, leitnerBox, leitnerCorrect, now } = options;

  const ebbinghausDue = ebbinghausNextReview(reviewCount, masteryScore, now);
  const sm2Updated = sm2Update(sm2Card, quality);
  const sm2Due = addDays(now, sm2Updated.interval);
  const leitnerDue = leitnerDueDate(leitnerBox, leitnerCorrect, now);

  // Ebbinghaus ladder for display: from current reviewCount forward 5 steps.
  const steps: EbbinghausStep[] = [];
  for (let offset = 0; offset < 5; offset += 1) {
    const repetition = reviewCount + offset;
    const due = ebbinghausNextReview(repetition, masteryScore, now);
    const intervalMin =
      repetition < EBBINGHAUS_INTERVALS_MINUTES.length
        ? (EBBINGHAUS_INTERVALS_MINUTES[repetition] as number)
        : Math.round(
            (EBBINGHAUS_INTERVALS_MINUTES[EBBINGHAUS_INTERVALS_MINUTES.length - 1] as number) *
              (1 + clamp(masteryScore, 0, 100) / 100),
          );
    steps.push({
      repetition,
      intervalMinutes: intervalMin,
      intervalDays: round2(intervalMin / 1440),
      dueAt: due.toISOString(),
    });
  }

  const stability = Math.max(1, sm2Updated.interval);
  const halfLife = retentionHalfLife(stability);
  const retentionAtInterval = forgettingRetention(sm2Updated.interval, stability);

  return {
    ebbinghaus: { steps, nextDueAt: ebbinghausDue.toISOString() },
    leitner: {
      box: leitnerNextBox(leitnerBox, leitnerCorrect),
      intervalDays: leitnerIntervalDays(leitnerNextBox(leitnerBox, leitnerCorrect)),
      nextDueAt: leitnerDue.toISOString(),
    },
    sm2: { updated: sm2Updated, nextDueAt: sm2Due.toISOString() },
    retention: { halfLifeDays: halfLife, retentionAtInterval },
  };
}
