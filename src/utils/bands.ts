/** IELTS band-score conversion helpers (approximate public conversion tables). */

export type ReadingTestType = 'academic' | 'general';

export interface BandThreshold {
  minRaw: number;
  band: number;
}

/** Listening conversion (same table for Academic and General Training). */
export const LISTENING_THRESHOLDS: BandThreshold[] = [
  { minRaw: 39, band: 9 },
  { minRaw: 37, band: 8.5 },
  { minRaw: 35, band: 8 },
  { minRaw: 32, band: 7.5 },
  { minRaw: 30, band: 7 },
  { minRaw: 26, band: 6.5 },
  { minRaw: 23, band: 6 },
  { minRaw: 18, band: 5.5 },
  { minRaw: 16, band: 5 },
  { minRaw: 13, band: 4.5 },
  { minRaw: 11, band: 4 },
  { minRaw: 8, band: 3.5 },
  { minRaw: 6, band: 3 },
  { minRaw: 4, band: 2.5 },
  { minRaw: 2, band: 2 },
  { minRaw: 1, band: 1 },
];

export const READING_ACADEMIC_THRESHOLDS: BandThreshold[] = [
  { minRaw: 39, band: 9 },
  { minRaw: 37, band: 8.5 },
  { minRaw: 35, band: 8 },
  { minRaw: 33, band: 7.5 },
  { minRaw: 30, band: 7 },
  { minRaw: 27, band: 6.5 },
  { minRaw: 23, band: 6 },
  { minRaw: 19, band: 5.5 },
  { minRaw: 15, band: 5 },
  { minRaw: 13, band: 4.5 },
  { minRaw: 11, band: 4 },
  { minRaw: 9, band: 3.5 },
  { minRaw: 6, band: 3 },
  { minRaw: 4, band: 2.5 },
  { minRaw: 2, band: 2 },
  { minRaw: 1, band: 1 },
];

export const READING_GENERAL_THRESHOLDS: BandThreshold[] = [
  { minRaw: 40, band: 9 },
  { minRaw: 39, band: 8.5 },
  { minRaw: 37, band: 8 },
  { minRaw: 36, band: 7.5 },
  { minRaw: 34, band: 7 },
  { minRaw: 32, band: 6.5 },
  { minRaw: 30, band: 6 },
  { minRaw: 27, band: 5.5 },
  { minRaw: 23, band: 5 },
  { minRaw: 19, band: 4.5 },
  { minRaw: 15, band: 4 },
  { minRaw: 12, band: 3.5 },
  { minRaw: 9, band: 3 },
  { minRaw: 6, band: 2.5 },
  { minRaw: 3, band: 2 },
  { minRaw: 1, band: 1 },
];

export function rawToBand(raw: number, thresholds: BandThreshold[]): number {
  for (const t of thresholds) {
    if (raw >= t.minRaw) return t.band;
  }
  return 0;
}

export function listeningBand(raw: number): number {
  return rawToBand(raw, LISTENING_THRESHOLDS);
}

export function readingBand(raw: number, type: ReadingTestType): number {
  return rawToBand(
    raw,
    type === 'general' ? READING_GENERAL_THRESHOLDS : READING_ACADEMIC_THRESHOLDS,
  );
}

/** IELTS overall rounding: x.25 rounds up to the next half band, x.75 up to the next whole band. */
export function roundOverallBand(mean: number): number {
  const fraction = mean - Math.floor(mean);
  if (fraction < 0.25) return Math.floor(mean);
  if (fraction < 0.75) return Math.floor(mean) + 0.5;
  return Math.floor(mean) + 1;
}

export function overallBand(scores: {
  listening: number;
  reading: number;
  writing: number;
  speaking: number;
}): number {
  const mean = (scores.listening + scores.reading + scores.writing + scores.speaking) / 4;
  return roundOverallBand(mean);
}

/** A valid component score is 0–9 in 0.5 steps. */
export function isValidComponentScore(value: number): boolean {
  if (!Number.isFinite(value)) return false;
  if (value < 0 || value > 9) return false;
  return Math.round(value * 2) === value * 2;
}

/** A valid raw score is an integer 0–40. */
export function isValidRawScore(value: number): boolean {
  if (!Number.isFinite(value)) return false;
  if (!Number.isInteger(value)) return false;
  return value >= 0 && value <= 40;
}
