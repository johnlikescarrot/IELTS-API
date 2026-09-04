import { requireNumber } from './validate.ts';

/** CEFR levels covered by the IELTS band scale. */
export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
/** Union of CEFR levels. */
export type CefrLevel = (typeof CEFR_LEVELS)[number];

interface CefrRow {
  readonly level: CefrLevel;
  readonly minBand: number;
  readonly maxBand: number;
  readonly descriptor: string;
}

/** Approximate IELTS-to-CEFR reference bands for orientation, not diagnosis. */
export const CEFR_TABLE: readonly CefrRow[] = [
  { level: 'C2', minBand: 8.5, maxBand: 9, descriptor: 'Expert / fully operational command.' },
  { level: 'C1', minBand: 7, maxBand: 8, descriptor: 'Effective operational proficiency.' },
  { level: 'B2', minBand: 5.5, maxBand: 6.5, descriptor: 'Independent, generally effective user.' },
  { level: 'B1', minBand: 4, maxBand: 5, descriptor: 'Modest user, threshold competence.' },
  { level: 'A2', minBand: 3, maxBand: 3.5, descriptor: 'Waystage, basic everyday exchanges.' },
  { level: 'A1', minBand: 0, maxBand: 2.5, descriptor: 'Breakthrough or non user.' },
];

/** Map an IELTS band score onto its CEFR level. */
export function bandToCefr(band: number): CefrRow {
  const value = requireNumber(band, 'band', 0, 9);
  // The final row starts at band 0, so a match is always found.
  return CEFR_TABLE.find((row) => value >= row.minBand) as CefrRow;
}

/** Map a CEFR level back onto its IELTS band range. */
export function cefrToBand(level: string): CefrRow | undefined {
  const upper = level.toUpperCase();
  return CEFR_TABLE.find((row) => row.level === upper);
}
