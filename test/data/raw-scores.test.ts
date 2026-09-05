import { describe, expect, it } from 'vitest';

import {
  RAW_SCORE_NOTE,
  RAW_SCORE_TABLE_IDS,
  RAW_SCORE_TABLES,
  findRawScoreTable,
  listRawScoreTable,
  rawMarkToBand,
} from '../../src/data/raw-scores.js';

describe('RAW_SCORE_TABLES', () => {
  it('covers 0-40 contiguously in every table', () => {
    expect(RAW_SCORE_TABLES).toHaveLength(3);
    for (const table of RAW_SCORE_TABLES) {
      expect(table.rows[0]?.max).toBe(40);
      expect(table.rows[table.rows.length - 1]?.min).toBe(0);
      for (let index = 1; index < table.rows.length; index += 1) {
        const above = table.rows[index - 1] as { min: number };
        const below = table.rows[index] as { max: number };
        expect(above.min).toBe(below.max + 1);
      }
    }
  });

  it('keeps bands monotonic and half-stepped', () => {
    for (const table of RAW_SCORE_TABLES) {
      for (let index = 1; index < table.rows.length; index += 1) {
        const upper = table.rows[index - 1] as { band: number };
        const lower = table.rows[index] as { band: number };
        expect(upper.band).toBeGreaterThanOrEqual(lower.band);
        expect((upper.band * 2) % 1).toBe(0);
      }
    }
  });

  it('names and scopes every table', () => {
    expect(RAW_SCORE_TABLE_IDS).toEqual(['listening', 'reading-academic', 'reading-general-training']);
    expect(RAW_SCORE_TABLES.every((table) => table.name.length > 10 && table.scope.length > 10)).toBe(true);
    expect(RAW_SCORE_NOTE).toContain('Indicative');
  });
});

describe('findRawScoreTable / listRawScoreTable', () => {
  it('resolves known ids', () => {
    expect(findRawScoreTable('listening')?.rows).toHaveLength(17);
    expect(listRawScoreTable('reading-academic').id).toBe('reading-academic');
  });

  it('returns undefined for unknown ids via find', () => {
    expect(findRawScoreTable('speaking')).toBeUndefined();
  });

  it('throws 400 for unknown ids via list', () => {
    expect(() => listRawScoreTable('speaking')).toThrowError(/Unknown conversion table/);
  });
});

describe('rawMarkToBand', () => {
  it('maps boundary raw marks', () => {
    expect(rawMarkToBand('listening', 40).row.band).toBe(9);
    expect(rawMarkToBand('listening', 39).row.band).toBe(9);
    expect(rawMarkToBand('listening', 38).row.band).toBe(8.5);
    expect(rawMarkToBand('listening', 0).row.band).toBe(1);
    expect(rawMarkToBand('reading-general-training', 38).row.band).toBe(9);
    expect(rawMarkToBand('reading-general-training', 39).row.band).toBe(9);
  });

  it('rejects out-of-range and fractional raw marks', () => {
    expect(() => rawMarkToBand('listening', 41)).toThrowError(/integer between 0 and 40/);
    expect(() => rawMarkToBand('listening', -1)).toThrowError(/integer between 0 and 40/);
    expect(() => rawMarkToBand('listening', 7.5)).toThrowError(/integer between 0 and 40/);
  });

  it('rejects unknown tables', () => {
    expect(() => rawMarkToBand('writing', 30)).toThrowError(/Unknown conversion table "writing"/);
  });

  it('reports the matched table and row', () => {
    const result = rawMarkToBand('reading-academic', 31);
    expect(result.table.id).toBe('reading-academic');
    expect(result.row).toEqual({ min: 30, max: 32, band: 7 });
  });
});
