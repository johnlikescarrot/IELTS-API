import type { BandRange, ReadingModule } from '../types/ielts.js';

/**
 * Academic Reading raw-score conversion table (40 questions).
 *
 * The Academic Reading module is more demanding than General Training Reading,
 * so a given number of correct answers generally earns a lower band here.
 */
export const ACADEMIC_READING_BAND_RANGES: readonly BandRange[] = [
  { band: 9.0, min: 39, max: 40 },
  { band: 8.5, min: 37, max: 38 },
  { band: 8.0, min: 35, max: 36 },
  { band: 7.5, min: 33, max: 34 },
  { band: 7.0, min: 30, max: 32 },
  { band: 6.5, min: 27, max: 29 },
  { band: 6.0, min: 23, max: 26 },
  { band: 5.5, min: 19, max: 22 },
  { band: 5.0, min: 15, max: 18 },
  { band: 4.5, min: 13, max: 14 },
  { band: 4.0, min: 10, max: 12 },
  { band: 3.5, min: 8, max: 9 },
  { band: 3.0, min: 6, max: 7 },
  { band: 2.5, min: 4, max: 5 },
  { band: 2.0, min: 3, max: 3 },
  { band: 1.5, min: 2, max: 2 },
  { band: 1.0, min: 1, max: 1 },
  { band: 0.0, min: 0, max: 0 },
];

/**
 * General Training Reading raw-score conversion table (40 questions).
 *
 * General Training Reading is considered slightly easier than Academic Reading,
 * so fewer correct answers can map to a higher band.
 */
export const GENERAL_TRAINING_READING_BAND_RANGES: readonly BandRange[] = [
  { band: 9.0, min: 39, max: 40 },
  { band: 8.5, min: 37, max: 38 },
  { band: 8.0, min: 36, max: 36 },
  { band: 7.5, min: 34, max: 35 },
  { band: 7.0, min: 32, max: 33 },
  { band: 6.5, min: 30, max: 31 },
  { band: 6.0, min: 27, max: 29 },
  { band: 5.5, min: 23, max: 26 },
  { band: 5.0, min: 19, max: 22 },
  { band: 4.5, min: 15, max: 18 },
  { band: 4.0, min: 12, max: 14 },
  { band: 3.5, min: 9, max: 11 },
  { band: 3.0, min: 6, max: 8 },
  { band: 2.5, min: 4, max: 5 },
  { band: 2.0, min: 3, max: 3 },
  { band: 1.5, min: 2, max: 2 },
  { band: 1.0, min: 1, max: 1 },
  { band: 0.0, min: 0, max: 0 },
];

/** The maximum number of Reading questions. */
export const READING_QUESTION_COUNT = 40;

/** Message used when an unknown Reading module is supplied. */
export const UNKNOWN_READING_MODULE_MESSAGE =
  'The Reading module must be either "academic" or "general-training".';

/**
 * Resolve the band-conversion table for the requested Reading module.
 *
 * @param module - The module, defaulting to `academic`.
 * @returns The matching conversion table.
 * @throws If the module is not a recognised value.
 */
export function getReadingBandRanges(module: ReadingModule): readonly BandRange[] {
  switch (module) {
    case 'academic':
      return ACADEMIC_READING_BAND_RANGES;
    case 'general-training':
      return GENERAL_TRAINING_READING_BAND_RANGES;
    default:
      throw new Error(UNKNOWN_READING_MODULE_MESSAGE);
  }
}
