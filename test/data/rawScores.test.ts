import { describe, expect, it } from 'vitest';

import {
  RAW_SCORE_TABLES,
  RAW_SCORE_TESTS,
  convertRawScore,
  rawScoreTable,
} from '../../src/data/rawScores.js';

import type { RawScoreTest } from '../../src/types.js';

describe('RAW_SCORE_TABLES', () => {
  it('covers the three objective papers, Listening shared by both modules', () => {
    expect(RAW_SCORE_TESTS).toEqual(['listening', 'academic-reading', 'general-training-reading']);
    expect(rawScoreTable('listening').appliesTo).toEqual(['academic', 'general-training']);
    expect(rawScoreTable('academic-reading').appliesTo).toEqual(['academic']);
    expect(rawScoreTable('general-training-reading').appliesTo).toEqual(['general-training']);
  });

  it('describes every paper completely', () => {
    for (const table of RAW_SCORE_TABLES) {
      expect(table.questions).toBe(40);
      expect(table.provenance).toBe('published-table');
      expect(table.provider.length).toBeGreaterThan(0);
      expect(table.sourceUrl.startsWith('https://')).toBe(true);
      expect(table.note.length).toBeGreaterThan(0);
      expect(table.rows.length).toBe(14);
    }
  });

  it('orders rows from band 9 down to the published floor of 2.5 without gaps', () => {
    for (const table of RAW_SCORE_TABLES) {
      expect(table.rows[0]?.band).toBe(9);
      expect(table.rows[table.rows.length - 1]?.band).toBe(2.5);
      for (let index = 1; index < table.rows.length; index += 1) {
        const previous = table.rows[index - 1];
        const current = table.rows[index];
        expect((previous?.band as number) - (current?.band as number)).toBe(0.5);
        expect(current?.correct[1]).toBe((previous?.correct[0] as number) - 1);
      }
    }
  });

  it('keeps 39-40 correct a band 9 on Listening and Academic but not GT Reading', () => {
    expect(convertRawScore('listening', 39).band).toBe(9);
    expect(convertRawScore('academic-reading', 39).band).toBe(9);
    expect(convertRawScore('general-training-reading', 39).band).toBe(8.5);
  });

  it('demands more correct answers on GT Reading for the same band', () => {
    for (const correct of [30, 32, 34, 36]) {
      const academic = convertRawScore('academic-reading', correct).band as number;
      const general = convertRawScore('general-training-reading', correct).band as number;
      expect(academic).toBeGreaterThan(general);
    }
  });
});

describe('convertRawScore', () => {
  it.each([
    ['listening', 30, 7.0],
    ['listening', 35, 8.0],
    ['academic-reading', 33, 7.5],
    ['academic-reading', 15, 5.0],
    ['general-training-reading', 40, 9.0],
    ['general-training-reading', 23, 5.0],
  ] as const)('maps %s %d/40 to band %d', (test: RawScoreTest, correct: number, band: number) => {
    const conversion = convertRawScore(test, correct);
    expect(conversion.band).toBe(band);
    expect(conversion.belowFloor).toBe(false);
    expect(correct).toBeGreaterThanOrEqual(conversion.range?.[0] as number);
    expect(correct).toBeLessThanOrEqual(conversion.range?.[1] as number);
  });

  it('reports null below the published floor instead of inventing a band', () => {
    for (const test of RAW_SCORE_TESTS) {
      const conversion = convertRawScore(test, 0);
      expect(conversion.band).toBeNull();
      expect(conversion.range).toBeNull();
      expect(conversion.belowFloor).toBe(true);
    }
    expect(convertRawScore('listening', 3).belowFloor).toBe(true);
    expect(convertRawScore('general-training-reading', 5).belowFloor).toBe(true);
  });

  it('covers every score from each floor up to 40', () => {
    for (const test of RAW_SCORE_TESTS) {
      const table = rawScoreTable(test);
      const floor = table.rows[table.rows.length - 1]?.correct[0] as number;
      for (let correct = floor; correct <= 40; correct += 1) {
        expect(convertRawScore(test, correct).band).not.toBeNull();
      }
    }
  });
});
