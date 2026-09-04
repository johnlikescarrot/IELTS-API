import { describe, expect, it } from 'vitest';
import {
  isValidComponentScore,
  isValidRawScore,
  listeningBand,
  overallBand,
  readingBand,
  roundOverallBand,
} from '../src/utils/bands.js';

describe('listeningBand', () => {
  it.each([
    [40, 9],
    [39, 9],
    [38, 8.5],
    [37, 8.5],
    [36, 8],
    [35, 8],
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
    [11, 4],
    [10, 3.5],
    [8, 3.5],
    [7, 3],
    [6, 3],
    [5, 2.5],
    [4, 2.5],
    [3, 2],
    [2, 2],
    [1, 1],
    [0, 0],
  ])('raw %i converts to band %s', (raw, band) => {
    expect(listeningBand(raw)).toBe(band);
  });
});

describe('readingBand', () => {
  it.each([
    [40, 9],
    [39, 9],
    [38, 8.5],
    [37, 8.5],
    [36, 8],
    [35, 8],
    [34, 7.5],
    [33, 7.5],
    [32, 7],
    [30, 7],
    [29, 6.5],
    [27, 6.5],
    [26, 6],
    [23, 6],
    [22, 5.5],
    [19, 5.5],
    [18, 5],
    [15, 5],
    [14, 4.5],
    [13, 4.5],
    [12, 4],
    [11, 4],
    [10, 3.5],
    [9, 3.5],
    [8, 3],
    [6, 3],
    [5, 2.5],
    [4, 2.5],
    [3, 2],
    [2, 2],
    [1, 1],
    [0, 0],
  ])('academic raw %i converts to band %s', (raw, band) => {
    expect(readingBand(raw, 'academic')).toBe(band);
  });

  it.each([
    [40, 9],
    [39, 8.5],
    [38, 8],
    [37, 8],
    [36, 7.5],
    [35, 7],
    [34, 7],
    [33, 6.5],
    [32, 6.5],
    [31, 6],
    [30, 6],
    [29, 5.5],
    [27, 5.5],
    [26, 5],
    [23, 5],
    [22, 4.5],
    [19, 4.5],
    [18, 4],
    [15, 4],
    [14, 3.5],
    [12, 3.5],
    [11, 3],
    [9, 3],
    [8, 2.5],
    [6, 2.5],
    [5, 2],
    [3, 2],
    [2, 1],
    [1, 1],
    [0, 0],
  ])('general raw %i converts to band %s', (raw, band) => {
    expect(readingBand(raw, 'general')).toBe(band);
  });
});

describe('roundOverallBand', () => {
  it('rounds fractions below 0.25 down', () => {
    expect(roundOverallBand(6.0)).toBe(6);
    expect(roundOverallBand(6.1)).toBe(6);
    expect(roundOverallBand(6.24)).toBe(6);
  });

  it('rounds fractions from 0.25 to below 0.75 to the half band', () => {
    expect(roundOverallBand(6.25)).toBe(6.5);
    expect(roundOverallBand(6.5)).toBe(6.5);
    expect(roundOverallBand(6.74)).toBe(6.5);
  });

  it('rounds fractions from 0.75 up to the next whole band', () => {
    expect(roundOverallBand(6.75)).toBe(7);
    expect(roundOverallBand(6.9)).toBe(7);
  });
});

describe('overallBand', () => {
  it('averages four components with IELTS rounding', () => {
    expect(overallBand({ listening: 7, reading: 7, writing: 7, speaking: 7 })).toBe(7);
    expect(overallBand({ listening: 8, reading: 8, writing: 8, speaking: 7 })).toBe(8);
    expect(overallBand({ listening: 6.5, reading: 6.5, writing: 6.5, speaking: 7 })).toBe(
      6.5,
    );
  });
});

describe('isValidComponentScore', () => {
  it('accepts 0–9 in 0.5 steps', () => {
    expect(isValidComponentScore(0)).toBe(true);
    expect(isValidComponentScore(7.5)).toBe(true);
    expect(isValidComponentScore(9)).toBe(true);
  });

  it('rejects non-finite values', () => {
    expect(isValidComponentScore(NaN)).toBe(false);
    expect(isValidComponentScore(Infinity)).toBe(false);
  });

  it('rejects out-of-range values', () => {
    expect(isValidComponentScore(-0.5)).toBe(false);
    expect(isValidComponentScore(9.5)).toBe(false);
  });

  it('rejects values off the 0.5 grid', () => {
    expect(isValidComponentScore(7.3)).toBe(false);
  });
});

describe('isValidRawScore', () => {
  it('accepts integers 0–40', () => {
    expect(isValidRawScore(0)).toBe(true);
    expect(isValidRawScore(23)).toBe(true);
    expect(isValidRawScore(40)).toBe(true);
  });

  it('rejects non-finite values', () => {
    expect(isValidRawScore(NaN)).toBe(false);
  });

  it('rejects non-integers', () => {
    expect(isValidRawScore(12.5)).toBe(false);
  });

  it('rejects out-of-range values', () => {
    expect(isValidRawScore(-1)).toBe(false);
    expect(isValidRawScore(41)).toBe(false);
  });
});
