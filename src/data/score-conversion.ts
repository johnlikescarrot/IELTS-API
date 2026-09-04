/**
 * Approximate raw-score to band-score conversion tables for the Listening and
 * Reading papers (40 questions each).
 *
 * IMPORTANT: The official conversion is test-specific and is never published
 * verbatim by IELTS; the ranges below reflect the widely published
 * approximation charts used by preparation providers. Treat results as
 * estimates, not official scores.
 */

export type ScoreModule = 'listening' | 'reading-academic' | 'reading-general-training';

export interface BandRange {
  readonly band: number;
  readonly min: number;
  readonly max: number;
}

export const LISTENING_RANGES: readonly BandRange[] = [
  { band: 9, min: 39, max: 40 },
  { band: 8.5, min: 37, max: 38 },
  { band: 8, min: 35, max: 36 },
  { band: 7.5, min: 33, max: 34 },
  { band: 7, min: 30, max: 32 },
  { band: 6.5, min: 27, max: 29 },
  { band: 6, min: 23, max: 26 },
  { band: 5.5, min: 19, max: 22 },
  { band: 5, min: 15, max: 18 },
  { band: 4.5, min: 13, max: 14 },
  { band: 4, min: 10, max: 12 },
  { band: 3.5, min: 8, max: 9 },
  { band: 3, min: 6, max: 7 },
  { band: 2.5, min: 4, max: 5 },
  { band: 2, min: 2, max: 3 },
  { band: 1, min: 0, max: 1 }
];

export const READING_ACADEMIC_RANGES: readonly BandRange[] = [
  { band: 9, min: 39, max: 40 },
  { band: 8.5, min: 37, max: 38 },
  { band: 8, min: 35, max: 36 },
  { band: 7.5, min: 33, max: 34 },
  { band: 7, min: 30, max: 32 },
  { band: 6.5, min: 27, max: 29 },
  { band: 6, min: 23, max: 26 },
  { band: 5.5, min: 19, max: 22 },
  { band: 5, min: 15, max: 18 },
  { band: 4.5, min: 13, max: 14 },
  { band: 4, min: 10, max: 12 },
  { band: 3.5, min: 8, max: 9 },
  { band: 3, min: 6, max: 7 },
  { band: 2.5, min: 4, max: 5 },
  { band: 2, min: 2, max: 3 },
  { band: 1, min: 0, max: 1 }
];

export const READING_GENERAL_TRAINING_RANGES: readonly BandRange[] = [
  { band: 9, min: 40, max: 40 },
  { band: 8.5, min: 39, max: 39 },
  { band: 8, min: 37, max: 38 },
  { band: 7.5, min: 36, max: 36 },
  { band: 7, min: 34, max: 35 },
  { band: 6.5, min: 32, max: 33 },
  { band: 6, min: 30, max: 31 },
  { band: 5.5, min: 27, max: 29 },
  { band: 5, min: 23, max: 26 },
  { band: 4.5, min: 19, max: 22 },
  { band: 4, min: 15, max: 18 },
  { band: 3.5, min: 12, max: 14 },
  { band: 3, min: 9, max: 11 },
  { band: 2.5, min: 6, max: 8 },
  { band: 2, min: 3, max: 5 },
  { band: 1, min: 0, max: 2 }
];

export const MODULE_RANGES: Readonly<Record<ScoreModule, readonly BandRange[]>> = {
  listening: LISTENING_RANGES,
  'reading-academic': READING_ACADEMIC_RANGES,
  'reading-general-training': READING_GENERAL_TRAINING_RANGES
};

export const DISCLAIMER =
  'Approximate conversion based on widely published preparation charts. Official raw-to-band conversion varies per test and is not published verbatim by IELTS.' as const;
