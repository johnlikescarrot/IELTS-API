import { describe, expect, it } from 'vitest';

import { RAW_SCORE_TABLES, RAW_SCORE_TOTAL } from '../../src/data/rawScores.js';
import { convertRawScore, rescaleToForty, sensitivityAt, targetProgress } from '../../src/lib/rawScore.js';

import type { RawScoreTable } from '../../src/types.js';

const LISTENING = RAW_SCORE_TABLES.listening;
const ACADEMIC = RAW_SCORE_TABLES['reading-academic'];
const GENERAL = RAW_SCORE_TABLES['reading-general'];

describe('rescaleToForty', () => {
  it('leaves a full paper untouched', () => {
    expect(rescaleToForty(29, RAW_SCORE_TOTAL)).toBe(29);
    expect(rescaleToForty(0, RAW_SCORE_TOTAL)).toBe(0);
  });

  it('rescales a shorter section proportionally', () => {
    expect(rescaleToForty(7, 10)).toBe(28);
    expect(rescaleToForty(10, 10)).toBe(40);
    expect(rescaleToForty(0, 10)).toBe(0);
    expect(rescaleToForty(9, 20)).toBe(18);
  });

  it('rounds a fractional rescaling to the nearest mark', () => {
    // 5/13 * 40 = 15.38...
    expect(rescaleToForty(5, 13)).toBe(15);
    // 7/13 * 40 = 21.53...
    expect(rescaleToForty(7, 13)).toBe(22);
  });
});

describe('sensitivityAt', () => {
  it('reports a score in the middle of a band as stable', () => {
    // Listening band 6.0 spans 23-25, so 24 is safe in both directions.
    expect(sensitivityAt(LISTENING, 24, 6)).toEqual({ minusOne: 6, plusOne: 6, stable: true });
  });

  it('reports a score on the upper edge of a band as unstable', () => {
    // 29 is the top of Listening band 6.5; 30 earns band 7.0.
    expect(sensitivityAt(LISTENING, 29, 6.5)).toEqual({ minusOne: 6.5, plusOne: 7, stable: false });
  });

  it('reports a score on the lower edge of a band as unstable', () => {
    // 30 is the bottom of Listening band 7.0; 29 drops to 6.5.
    expect(sensitivityAt(LISTENING, 30, 7)).toEqual({ minusOne: 6.5, plusOne: 7, stable: false });
  });

  it('has no lower neighbour at a raw score of zero', () => {
    const sensitivity = sensitivityAt(LISTENING, 0, 2.5);
    expect(sensitivity.minusOne).toBeNull();
    expect(sensitivity.plusOne).toBe(2.5);
    expect(sensitivity.stable).toBe(true);
  });

  it('has no upper neighbour at full marks', () => {
    const sensitivity = sensitivityAt(LISTENING, RAW_SCORE_TOTAL, 9);
    expect(sensitivity.plusOne).toBeNull();
    expect(sensitivity.minusOne).toBe(9);
    expect(sensitivity.stable).toBe(true);
  });

  it('treats full marks as unstable when the band below differs', () => {
    // General Training reserves band 9 for 40/40, so 39 is a different band.
    const sensitivity = sensitivityAt(GENERAL, RAW_SCORE_TOTAL, 9);
    expect(sensitivity.minusOne).toBe(8.5);
    expect(sensitivity.plusOne).toBeNull();
    expect(sensitivity.stable).toBe(false);
  });
});

describe('targetProgress', () => {
  it('counts the marks still needed', () => {
    expect(targetProgress(ACADEMIC, 27, 7)).toEqual({
      band: 7,
      minCorrect: 30,
      marksNeeded: 3,
      achieved: false,
    });
  });

  it('reports a target already achieved', () => {
    expect(targetProgress(ACADEMIC, 34, 7)).toEqual({
      band: 7,
      minCorrect: 30,
      marksNeeded: 0,
      achieved: true,
    });
  });

  it('never reports negative marks when the score is far above the target', () => {
    expect(targetProgress(ACADEMIC, 40, 5).marksNeeded).toBe(0);
  });

  it('resolves a half-band target to its own threshold', () => {
    expect(targetProgress(LISTENING, 20, 6.5)).toEqual({
      band: 6.5,
      minCorrect: 26,
      marksNeeded: 6,
      achieved: false,
    });
  });

  it('reports a target above the top of the table as unreachable', () => {
    expect(targetProgress(LISTENING, 40, 9.5)).toEqual({
      band: 9.5,
      minCorrect: null,
      marksNeeded: null,
      achieved: false,
    });
  });
});

describe('convertRawScore', () => {
  it('converts a full-paper score with its band range and next band', () => {
    const result = convertRawScore(ACADEMIC, 29, RAW_SCORE_TOTAL);
    expect(result).toMatchObject({
      module: 'reading-academic',
      moduleName: 'Academic Reading',
      correct: 29,
      outOf: 40,
      scaledCorrect: 29,
      percentage: 72.5,
      band: 6.5,
      cefr: 'B2',
      label: 'Competent user',
      bandRange: { minCorrect: 27, maxCorrect: 29 },
      nextBand: { band: 7, minCorrect: 30, marksNeeded: 1 },
      target: null,
    });
  });

  it('scores the same raw mark a whole band lower on General Training', () => {
    expect(convertRawScore(ACADEMIC, 30, RAW_SCORE_TOTAL).band).toBe(7);
    expect(convertRawScore(GENERAL, 30, RAW_SCORE_TOTAL).band).toBe(6);
  });

  it('reports no next band at the top of the scale', () => {
    const result = convertRawScore(LISTENING, RAW_SCORE_TOTAL, RAW_SCORE_TOTAL);
    expect(result.band).toBe(9);
    expect(result.nextBand).toBeNull();
    expect(result.percentage).toBe(100);
  });

  it('handles a raw score of zero', () => {
    const result = convertRawScore(LISTENING, 0, RAW_SCORE_TOTAL);
    expect(result.band).toBe(2.5);
    expect(result.percentage).toBe(0);
    expect(result.bandRange).toEqual({ minCorrect: 0, maxCorrect: 3 });
    expect(result.nextBand).toEqual({ band: 3, minCorrect: 4, marksNeeded: 4 });
  });

  it('rescales a shorter section and records both scores', () => {
    const result = convertRawScore(LISTENING, 7, 10);
    expect(result.correct).toBe(7);
    expect(result.outOf).toBe(10);
    expect(result.scaledCorrect).toBe(28);
    expect(result.band).toBe(6.5);
    expect(result.percentage).toBe(70);
  });

  it('includes progress towards a target band when one is given', () => {
    const result = convertRawScore(LISTENING, 26, RAW_SCORE_TOTAL, 7);
    expect(result.band).toBe(6.5);
    expect(result.target).toEqual({ band: 7, minCorrect: 30, marksNeeded: 4, achieved: false });
  });

  it('rejects a score larger than the section it came from', () => {
    expect(() => convertRawScore(LISTENING, 9, 5)).toThrowError(
      expect.objectContaining({
        status: 400,
        details: expect.objectContaining({ parameter: 'correct', received: '9', max: '5' }),
      }),
    );
  });

  it('falls back to an unknown label for a band outside the published scale', () => {
    const odd = {
      module: 'listening',
      name: 'Synthetic paper',
      rows: [{ band: 9.25, minCorrect: 0, maxCorrect: 40 }],
    } as unknown as RawScoreTable;
    const result = convertRawScore(odd, 10, RAW_SCORE_TOTAL);
    expect(result.band).toBe(9.25);
    expect(result.label).toBe('Unknown');
  });

  it('is consistent with the table for every raw score of every paper', () => {
    for (const table of [LISTENING, ACADEMIC, GENERAL]) {
      for (let correct = 0; correct <= RAW_SCORE_TOTAL; correct += 1) {
        const result = convertRawScore(table, correct, RAW_SCORE_TOTAL);
        expect(correct).toBeGreaterThanOrEqual(result.bandRange.minCorrect);
        expect(correct).toBeLessThanOrEqual(result.bandRange.maxCorrect);
        if (result.nextBand !== null) {
          expect(result.nextBand.band).toBeGreaterThan(result.band);
          expect(result.nextBand.marksNeeded).toBeGreaterThan(0);
        }
      }
    }
  });

  it('never lets the band fall as the raw score rises', () => {
    for (const table of [LISTENING, ACADEMIC, GENERAL]) {
      let previous = -1;
      for (let correct = 0; correct <= RAW_SCORE_TOTAL; correct += 1) {
        const { band } = convertRawScore(table, correct, RAW_SCORE_TOTAL);
        expect(band).toBeGreaterThanOrEqual(previous);
        previous = band;
      }
    }
  });
});
