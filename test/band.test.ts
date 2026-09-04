import { describe, expect, it } from 'vitest';
import type { BandRange } from '../src/types/ielts.js';
import {
  allValidBands,
  assessBand,
  bandFromSteps,
  bandSteps,
  clampBand,
  convertRawToBand,
  describeOverallBand,
  describeOverallBandWithAssessment,
  nextBand,
  overallBandDescriptors,
  overallBandScore,
  previousBand,
  roundToNearestHalf,
} from '../src/services/band.js';
import { LISTENING_BAND_RANGES } from '../src/data/listening.js';

describe('roundToNearestHalf', () => {
  it('rounds to the nearest half band', () => {
    expect(roundToNearestHalf(6.125)).toBe(6);
    expect(roundToNearestHalf(6.25)).toBe(6.5);
    expect(roundToNearestHalf(6.375)).toBe(6.5);
    expect(roundToNearestHalf(6.5)).toBe(6.5);
    expect(roundToNearestHalf(6.75)).toBe(7);
    expect(roundToNearestHalf(6.875)).toBe(7);
  });
});

describe('clampBand', () => {
  it('clamps into the 0-9 range', () => {
    expect(clampBand(-1)).toBe(0);
    expect(clampBand(5)).toBe(5);
    expect(clampBand(15)).toBe(9);
  });
});

describe('convertRawToBand', () => {
  it('converts every boundary of the listening table', () => {
    const cases: Array<[number, number]> = [
      [40, 9],
      [39, 9],
      [38, 8.5],
      [37, 8.5],
      [36, 8],
      [34, 7.5],
      [32, 7.5],
      [31, 7],
      [30, 7],
      [29, 6.5],
      [26, 6.5],
      [25, 6],
      [23, 6],
      [22, 5.5],
      [18, 5.5],
      [17, 5],
      [16, 5],
      [15, 4.5],
      [13, 4.5],
      [12, 4],
      [10, 4],
      [9, 3.5],
      [7, 3.5],
      [6, 3],
      [5, 3],
      [4, 2.5],
      [3, 2.5],
      [2, 2],
      [1, 1],
      [0, 0],
    ];
    for (const [correct, expected] of cases) {
      expect(convertRawToBand(correct, LISTENING_BAND_RANGES)).toBe(expected);
    }
  });

  it('clamps values above and below the covered range', () => {
    expect(convertRawToBand(100, LISTENING_BAND_RANGES)).toBe(9);
    expect(convertRawToBand(-7, LISTENING_BAND_RANGES)).toBe(0);
  });

  it('returns the lowest band when the table has a gap', () => {
    const gapTable: readonly BandRange[] = [
      { band: 2, min: 0, max: 0 },
      { band: 4, min: 5, max: 10 },
    ];
    expect(convertRawToBand(3, gapTable)).toBe(4);
    expect(convertRawToBand(7, gapTable)).toBe(4);
  });

  it('returns zero for an empty table', () => {
    expect(convertRawToBand(35, [])).toBe(0);
  });
});

describe('assessBand', () => {
  it('returns an assessment for each tier', () => {
    expect(assessBand(8)).toContain('Very good');
    expect(assessBand(8.5)).toContain('Very good');
    expect(assessBand(7)).toContain('Good user');
    expect(assessBand(6)).toContain('Competent');
    expect(assessBand(5)).toContain('Modest');
    expect(assessBand(4)).toContain('Limited');
  });
});

describe('describeOverallBand', () => {
  it('returns a descriptor for an integer band', () => {
    expect(describeOverallBand(7)?.band).toBe(7);
  });

  it('returns undefined for a value without a descriptor', () => {
    expect(describeOverallBand(10)).toBeUndefined();
    expect(describeOverallBand(6.5)).toBeUndefined();
  });
});

describe('describeOverallBandWithAssessment', () => {
  it('bundles the descriptor and assessment together', () => {
    const result = describeOverallBandWithAssessment(8);
    expect(result.descriptor?.band).toBe(8);
    expect(result.assessment).toContain('Very good');
  });
});

describe('overallBandScore', () => {
  it('computes the rounded overall band and exact average', () => {
    const result = overallBandScore({
      listening: 7.5,
      reading: 6.5,
      writing: 6.5,
      speaking: 7,
    });
    expect(result.overall).toBe(7);
    expect(result.average).toBe(6.875);
    expect(result.components).toEqual({
      listening: 7.5,
      reading: 6.5,
      writing: 6.5,
      speaking: 7,
    });
    expect(result.assessment).toContain('Good user');
  });

  it('rounds up a quarter band', () => {
    const result = overallBandScore({
      listening: 6.5,
      reading: 6.5,
      writing: 6.5,
      speaking: 6,
    });
    expect(result.overall).toBe(6.5);
  });
});

describe('band steps', () => {
  it('converts between bands and half-band steps', () => {
    expect(bandSteps(0)).toBe(0);
    expect(bandSteps(6.5)).toBe(13);
    expect(bandSteps(9)).toBe(18);
    expect(bandFromSteps(13)).toBe(6.5);
    expect(bandFromSteps(18)).toBe(9);
  });
});

describe('neighbouring bands', () => {
  it('steps to the previous half band, clamped at zero', () => {
    expect(previousBand(6.5)).toBe(6);
    expect(previousBand(0)).toBe(0);
  });

  it('steps to the next half band, clamped at nine', () => {
    expect(nextBand(6.5)).toBe(7);
    expect(nextBand(9)).toBe(9);
  });
});

describe('allValidBands', () => {
  it('returns every half band from 0 to 9', () => {
    const bands = allValidBands();
    expect(bands).toHaveLength(19);
    expect(bands[0]).toBe(0);
    expect(bands[18]).toBe(9);
  });
});

describe('overallBandDescriptors', () => {
  it('returns the full descriptor list', () => {
    const descriptors = overallBandDescriptors();
    expect(descriptors.length).toBe(10);
    expect(descriptors[0]?.band).toBe(0);
  });
});
