import type {
  BandRange,
  ComponentBandScores,
  OverallBandDescriptor,
  OverallBandResult,
} from '../types/ielts.js';
import { OVERALL_BAND_DESCRIPTORS, getOverallBandDescriptor } from '../data/band-scores.js';

/**
 * Round an arbitrary average to the nearest IELTS half band.
 *
 * This mirrors the official rule: an overall band score is the average of the
 * four component bands rounded to the nearest half band.
 */
export function roundToNearestHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

/**
 * Clamp a band to the legal range `[0, 9]`.
 */
export function clampBand(band: number): number {
  return Math.min(Math.max(band, 0), 9);
}

/**
 * Convert a raw correct-answer count into an IELTS band using a conversion
 * table. Values are clamped to the table's covered range; if no row matches
 * (for example when the table is non-contiguous), the lowest band is returned.
 *
 * @param correct - Number of correct answers.
 * @param ranges - The ordered conversion table (highest band first).
 */
export function convertRawToBand(correct: number, ranges: readonly BandRange[]): number {
  const lowest = ranges.reduce((acc, row) => Math.min(acc, row.min), Number.POSITIVE_INFINITY);
  const highest = ranges.reduce((acc, row) => Math.max(acc, row.max), Number.NEGATIVE_INFINITY);
  const clamped = Math.min(Math.max(correct, lowest), highest);
  for (const row of ranges) {
    if (clamped >= row.min && clamped <= row.max) {
      return row.band;
    }
  }
  return ranges[ranges.length - 1]?.band ?? 0;
}

/**
 * Produce a short human assessment based on an overall band.
 */
export function assessBand(band: number): string {
  if (band >= 8) {
    return 'Very good to expert user: likely to meet most university and professional requirements.';
  }
  if (band >= 7) {
    return 'Good user: suitable for most academic and visa purposes.';
  }
  if (band >= 6) {
    return 'Competent user: acceptable for many undergraduate courses.';
  }
  if (band >= 5) {
    return 'Modest user: may be suitable for foundation or pre-sessional study.';
  }
  return 'Limited to non-user: further intensive study is strongly recommended.';
}

/**
 * Get the overall band descriptor for a given band, or `undefined` if the band
 * falls outside 0–9.
 */
export function describeOverallBand(band: number): OverallBandDescriptor | undefined {
  return getOverallBandDescriptor(band);
}

/**
 * Describe the overall band together with a human assessment.
 */
export function describeOverallBandWithAssessment(band: number): {
  descriptor: OverallBandDescriptor | undefined;
  assessment: string;
} {
  return {
    descriptor: describeOverallBand(band),
    assessment: assessBand(band),
  };
}

/**
 * Compute the overall IELTS band from the four component bands.
 *
 * The average is rounded to the nearest half band; the exact average is also
 * returned for transparency.
 */
export function overallBandScore(components: ComponentBandScores): OverallBandResult {
  const [listening, reading, writing, speaking] = [
    components.listening,
    components.reading,
    components.writing,
    components.speaking,
  ];
  const average = (listening + reading + writing + speaking) / 4;
  const overall = roundToNearestHalf(average);
  return {
    overall,
    average,
    components: { ...components },
    assessment: assessBand(overall),
  };
}

/** The number of 0.5-band steps from band 0 up to the given band. */
export function bandSteps(band: number): number {
  return Math.round((band - 0) / 0.5);
}

/**
 * Convert an integer step count (0..18) back into a band (0..9 in half bands).
 */
export function bandFromSteps(steps: number): number {
  return steps * 0.5;
}

/**
 * Return the immediately lower valid half band.
 */
export function previousBand(band: number): number {
  return bandFromSteps(Math.max(bandSteps(band) - 1, 0));
}

/**
 * Return the immediately higher valid half band.
 */
export function nextBand(band: number): number {
  return bandFromSteps(Math.min(bandSteps(band) + 1, 18));
}

/** All valid half-band values from 0 to 9 inclusive. */
export function allValidBands(): readonly number[] {
  return Array.from({ length: 19 }, (_, index) => index * 0.5);
}

/** A fixed reference to the overall band descriptors for API responses. */
export function overallBandDescriptors(): readonly OverallBandDescriptor[] {
  return OVERALL_BAND_DESCRIPTORS;
}
