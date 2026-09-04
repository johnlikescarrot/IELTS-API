import type { BandRange } from '../types/ielts.js';

/**
 * Listening raw-score conversion table (Academic and General Training Listening
 * use the same conversion).
 *
 * The test has 40 questions. Each row is an inclusive range of correct answers
 * mapped to the band awarded. The table follows commonly published conversion
 * tables; candidates should confirm against official IELTS practice materials.
 */
export const LISTENING_BAND_RANGES: readonly BandRange[] = [
  { band: 9.0, min: 39, max: 40 },
  { band: 8.5, min: 37, max: 38 },
  { band: 8.0, min: 35, max: 36 },
  { band: 7.5, min: 32, max: 34 },
  { band: 7.0, min: 30, max: 31 },
  { band: 6.5, min: 26, max: 29 },
  { band: 6.0, min: 23, max: 25 },
  { band: 5.5, min: 18, max: 22 },
  { band: 5.0, min: 16, max: 17 },
  { band: 4.5, min: 13, max: 15 },
  { band: 4.0, min: 10, max: 12 },
  { band: 3.5, min: 7, max: 9 },
  { band: 3.0, min: 5, max: 6 },
  { band: 2.5, min: 3, max: 4 },
  { band: 2.0, min: 2, max: 2 },
  { band: 1.0, min: 1, max: 1 },
  { band: 0.0, min: 0, max: 0 },
];

/** The maximum number of Listening questions. */
export const LISTENING_QUESTION_COUNT = 40;
