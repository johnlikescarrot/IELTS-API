import { describe, expect, it } from 'vitest';

import { RAW_SCORE_TABLE_IDS, RAW_SCORE_TABLES, convertRawScore } from '../../src/data/rawScores.js';
import { isValidBand } from '../../src/lib/band.js';

describe('the raw-score conversion tables', () => {
  it('covers the three objectively marked papers', () => {
    expect(RAW_SCORE_TABLE_IDS).toEqual(['listening', 'academic-reading', 'general-reading']);
    expect(RAW_SCORE_TABLES['listening'].module).toBe('both');
    expect(RAW_SCORE_TABLES['academic-reading'].module).toBe('academic');
    expect(RAW_SCORE_TABLES['general-reading'].module).toBe('general-training');
  });

  it('publishes provenance and a caveat with every table', () => {
    for (const id of RAW_SCORE_TABLE_IDS) {
      const table = RAW_SCORE_TABLES[id];
      expect(table.rawMax).toBe(40);
      expect(table.provider.length).toBeGreaterThan(3);
      expect(table.sourceUrl).toContain('https://');
      expect(table.note).toContain('vary slightly');
    }
  });

  it('orders rows by ascending band with contiguous, gap-free ranges', () => {
    for (const id of RAW_SCORE_TABLE_IDS) {
      const entries = RAW_SCORE_TABLES[id].entries;
      expect(entries.length).toBeGreaterThan(10);
      for (let index = 0; index < entries.length; index += 1) {
        const entry = entries[index]!;
        expect(isValidBand(entry.band)).toBe(true);
        expect(entry.min).toBeLessThanOrEqual(entry.max);
        if (index > 0) {
          const previous = entries[index - 1]!;
          expect(entry.band).toBeGreaterThan(previous.band);
          expect(entry.min).toBe(previous.max + 1);
        }
      }
      expect(entries[entries.length - 1]!.max).toBe(40);
    }
  });

  it('transcribes the published anchor rows', () => {
    // Band 7 needs 30 marks in listening and academic reading, but 34 in general reading.
    expect(convertRawScore('listening', 30)?.band).toBe(7);
    expect(convertRawScore('academic-reading', 30)?.band).toBe(7);
    expect(convertRawScore('general-reading', 30)?.band).toBe(6);
    expect(convertRawScore('general-reading', 34)?.band).toBe(7);
    // Band 8 starts at 35 marks for listening and academic reading, 37 for general reading.
    expect(convertRawScore('listening', 35)?.band).toBe(8);
    expect(convertRawScore('academic-reading', 35)?.band).toBe(8);
    expect(convertRawScore('general-reading', 37)?.band).toBe(8);
  });
});

describe('convertRawScore', () => {
  it('maps a mid-table mark with its range and the distance to the next band', () => {
    expect(convertRawScore('listening', 32)).toEqual({
      band: 7.5,
      min: 32,
      max: 34,
      display: '32–34',
      nextBand: 8,
      marksToNextBand: 3,
    });
  });

  it('renders single-mark rows without a range dash', () => {
    expect(convertRawScore('general-reading', 36)).toEqual({
      band: 7.5,
      min: 36,
      max: 36,
      display: '36',
      nextBand: 8,
      marksToNextBand: 1,
    });
  });

  it('reports the ceiling of the table without a next band', () => {
    expect(convertRawScore('general-reading', 40)?.nextBand).toBeNull();
    expect(convertRawScore('general-reading', 40)?.marksToNextBand).toBeNull();
    expect(convertRawScore('listening', 40)?.band).toBe(9);
  });

  it('converts the lowest published row of each table', () => {
    expect(convertRawScore('listening', 11)?.band).toBe(4);
    expect(convertRawScore('academic-reading', 4)?.band).toBe(2.5);
    expect(convertRawScore('general-reading', 9)?.band).toBe(3);
  });

  it('leaves marks below the published floor unmatched rather than guessing', () => {
    expect(convertRawScore('listening', 10)).toBeUndefined();
    expect(convertRawScore('listening', 0)).toBeUndefined();
    expect(convertRawScore('academic-reading', 3)).toBeUndefined();
    expect(convertRawScore('general-reading', 8)).toBeUndefined();
  });

  it('matches every published raw mark against exactly one row', () => {
    for (const id of RAW_SCORE_TABLE_IDS) {
      const table = RAW_SCORE_TABLES[id];
      const floor = table.entries[0]!.min;
      for (let raw = 0; raw <= table.rawMax; raw += 1) {
        const hit = convertRawScore(id, raw);
        if (raw < floor) {
          expect(hit).toBeUndefined();
        } else {
          expect(hit?.band).toBe(table.entries.find((entry) => raw >= entry.min && raw <= entry.max)?.band);
        }
      }
    }
  });
});
