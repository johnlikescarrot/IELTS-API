import { describe, expect, it } from 'vitest';

import {
  RAW_SCORE_COMPONENTS,
  RAW_SCORE_MAX,
  RAW_SCORE_TABLES,
  convertRawScore,
  rowForRawScore,
} from '../../src/data/rawscores.js';

describe('raw-score conversion tables', () => {
  it('publishes one table per objectively marked component', () => {
    expect(RAW_SCORE_COMPONENTS).toEqual(['listening', 'reading-academic', 'reading-general-training']);
    for (const component of RAW_SCORE_COMPONENTS) {
      expect(RAW_SCORE_TABLES[component].component).toBe(component);
      expect(RAW_SCORE_TABLES[component].questions).toBe(RAW_SCORE_MAX);
    }
  });

  it('covers every raw score from 0 to 40 exactly once', () => {
    for (const component of RAW_SCORE_COMPONENTS) {
      for (let raw = 0; raw <= RAW_SCORE_MAX; raw += 1) {
        const matches = RAW_SCORE_TABLES[component].rows.filter((row) => raw >= row.min && raw <= row.max);
        expect(matches, `${component} raw=${raw}`).toHaveLength(1);
      }
    }
  });

  it('is ordered by descending band with contiguous, non-overlapping ranges', () => {
    for (const component of RAW_SCORE_COMPONENTS) {
      const rows = RAW_SCORE_TABLES[component].rows;
      for (let index = 1; index < rows.length; index += 1) {
        const previous = rows[index - 1]!;
        const current = rows[index]!;
        expect(current.band).toBeLessThan(previous.band);
        expect(current.max).toBe(previous.min - 1);
      }
      expect(rows[0]!.max).toBe(RAW_SCORE_MAX);
      expect(rows[rows.length - 1]!.min).toBe(0);
    }
  });

  it('uses only reportable half-band values', () => {
    for (const component of RAW_SCORE_COMPONENTS) {
      for (const row of RAW_SCORE_TABLES[component].rows) {
        expect(row.band % 0.5).toBe(0);
        expect(row.band).toBeGreaterThanOrEqual(0);
        expect(row.band).toBeLessThanOrEqual(9);
        expect(row.min).toBeLessThanOrEqual(row.max);
      }
    }
  });

  it('labels the basis of every boundary', () => {
    const bases = new Set(
      RAW_SCORE_COMPONENTS.flatMap((component) => RAW_SCORE_TABLES[component].rows.map((row) => row.basis)),
    );
    expect(bases).toEqual(new Set(['published', 'extrapolated']));
  });

  it('records competing boundaries where public tables disagree', () => {
    const contested = RAW_SCORE_TABLES.listening.rows.filter((row) => row.disagreement !== null);
    expect(contested.length).toBeGreaterThan(0);
    expect(contested[0]!.disagreement).toContain('older');
    expect(RAW_SCORE_TABLES['reading-academic'].rows.some((row) => row.disagreement === null)).toBe(true);
  });

  it('requires more correct answers in General Training than in Academic Reading', () => {
    const academic = RAW_SCORE_TABLES['reading-academic'].rows.find((row) => row.band === 7)!;
    const general = RAW_SCORE_TABLES['reading-general-training'].rows.find((row) => row.band === 7)!;
    expect(general.min).toBeGreaterThan(academic.min);
  });

  it('marks every table as indicative rather than official', () => {
    for (const component of RAW_SCORE_COMPONENTS) {
      expect(RAW_SCORE_TABLES[component].provenance).toBe('indicative');
      expect(RAW_SCORE_TABLES[component].note).toContain('Indicative only');
    }
  });
});

describe('rowForRawScore', () => {
  it('finds the row covering a raw score', () => {
    expect(rowForRawScore('listening', 30)?.band).toBe(7);
  });

  it('returns undefined outside the table', () => {
    expect(rowForRawScore('listening', 41)).toBeUndefined();
    expect(rowForRawScore('listening', -1)).toBeUndefined();
  });
});

describe('convertRawScore', () => {
  it('converts the documented Listening boundaries', () => {
    expect(convertRawScore('listening', 39)?.band).toBe(9);
    expect(convertRawScore('listening', 35)?.band).toBe(8);
    expect(convertRawScore('listening', 30)?.band).toBe(7);
    expect(convertRawScore('listening', 23)?.band).toBe(6);
  });

  it('converts the documented Academic Reading boundaries', () => {
    expect(convertRawScore('reading-academic', 30)?.band).toBe(7);
    expect(convertRawScore('reading-academic', 27)?.band).toBe(6.5);
    expect(convertRawScore('reading-academic', 23)?.band).toBe(6);
  });

  it('converts the documented General Training Reading boundaries', () => {
    expect(convertRawScore('reading-general-training', 34)?.band).toBe(7);
    expect(convertRawScore('reading-general-training', 30)?.band).toBe(6);
    expect(convertRawScore('reading-general-training', 40)?.band).toBe(9);
  });

  it('reports accuracy, range and basis', () => {
    const result = convertRawScore('reading-academic', 30)!;
    expect(result.outOf).toBe(40);
    expect(result.accuracy).toBe(0.75);
    expect(result.range).toEqual({ min: 30, max: 32 });
    expect(result.basis).toBe('published');
    expect(result.disagreement).toBeNull();
  });

  it('reports the marginal cost of the next half band', () => {
    const result = convertRawScore('reading-academic', 28)!;
    expect(result.band).toBe(6.5);
    expect(result.nextBand).toEqual({ band: 7, raw: 30, additionalCorrect: 2 });
    expect(result.marginToLoseBand).toBe(1);
  });

  it('has no next band at band 9', () => {
    const result = convertRawScore('listening', 40)!;
    expect(result.band).toBe(9);
    expect(result.nextBand).toBeNull();
    expect(result.marginToLoseBand).toBe(1);
  });

  it('reports no margin at band 0', () => {
    const result = convertRawScore('listening', 0)!;
    expect(result.band).toBe(0);
    expect(result.marginToLoseBand).toBeNull();
    expect(result.nextBand).toEqual({ band: 1, raw: 1, additionalCorrect: 1 });
  });

  it('surfaces a contested boundary', () => {
    expect(convertRawScore('listening', 31)?.disagreement).toContain('band 7.0');
  });

  it('returns undefined outside the table', () => {
    expect(convertRawScore('listening', 41)).toBeUndefined();
  });

  it('never decreases the band as the raw score rises', () => {
    for (const component of RAW_SCORE_COMPONENTS) {
      let previous = -1;
      for (let raw = 0; raw <= RAW_SCORE_MAX; raw += 1) {
        const band = convertRawScore(component, raw)!.band;
        expect(band).toBeGreaterThanOrEqual(previous);
        previous = band;
      }
    }
  });
});
