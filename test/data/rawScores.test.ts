import { describe, expect, it } from 'vitest';

import {
  RAW_SCORE_NOTE,
  RAW_SCORE_SOURCE,
  RAW_SCORE_TABLES,
  RAW_SCORE_TABLE_IDS,
  convertRawScore,
  rawScoreTable,
  rawTableIdFor,
} from '../../src/data/rawScores.js';

describe('RAW_SCORE_TABLES', () => {
  it('exposes the three conversion tables in report order', () => {
    expect(RAW_SCORE_TABLE_IDS).toEqual(['listening', 'reading-academic', 'reading-general-training']);
    expect(RAW_SCORE_TABLES.map((table) => table.id)).toEqual(RAW_SCORE_TABLE_IDS);
  });

  it('describes every table completely', () => {
    for (const table of RAW_SCORE_TABLES) {
      expect(table.questions).toBe(40);
      expect(table.sourceUrl.startsWith('https://')).toBe(true);
      expect(table.note.length).toBeGreaterThan(0);
      expect(table.rows.length).toBeGreaterThan(10);
      expect(table.rows[0]?.band).toBe(3.0);
      expect(table.rows.at(-1)?.band).toBe(9.0);
      for (const row of table.rows) {
        expect(row.min).toBeLessThanOrEqual(row.max);
        expect(row.band).toBeGreaterThanOrEqual(3.0);
        expect(row.band).toBeLessThanOrEqual(9.0);
      }
    }
  });

  it('keeps the rows contiguous inside each table', () => {
    for (const table of RAW_SCORE_TABLES) {
      for (let index = 1; index < table.rows.length; index += 1) {
        const previous = table.rows[index - 1] as { min: number; max: number };
        const current = table.rows[index] as { min: number };
        expect(current.min).toBe(previous.max + 1);
      }
    }
  });

  it('shares one Listening table and keeps Reading tables separate', () => {
    expect(rawTableIdFor('listening', 'academic')).toBe('listening');
    expect(rawTableIdFor('listening', 'general-training')).toBe('listening');
    expect(rawTableIdFor('reading', 'academic')).toBe('reading-academic');
    expect(rawTableIdFor('reading', 'general-training')).toBe('reading-general-training');
    expect(RAW_SCORE_TABLES[0]?.module).toBeNull();
    expect(RAW_SCORE_TABLES[1]?.module).toBe('academic');
    expect(RAW_SCORE_TABLES[2]?.module).toBe('general-training');
  });

  it('documents the provenance', () => {
    expect(RAW_SCORE_SOURCE.url).toContain('ielts.org');
    expect(RAW_SCORE_NOTE).toContain('Indicative conversion');
    expect(rawScoreTable('listening').name).toContain('Academic and General Training');
  });
});

describe('convertRawScore', () => {
  it('maps in-range scores to the published band', () => {
    expect(convertRawScore('listening', 27).band).toBe(6.5);
    expect(convertRawScore('reading-academic', 27).band).toBe(6.5);
    expect(convertRawScore('reading-general-training', 27).band).toBe(5.5);
    expect(convertRawScore('listening', 40).band).toBe(9.0);
  });

  it('reports the matched range and both neighbouring bands', () => {
    const result = convertRawScore('listening', 27);
    expect(result.matched).toBe(true);
    expect(result.row).toEqual({ min: 26, max: 29, band: 6.5 });
    expect(result.oneBandAhead).toEqual({ band: 7.0, correct: 30 });
    expect(result.oneBandBehind).toEqual({ band: 6.0, correct: 25 });
  });

  it('returns null outside the published rows but names the closest band', () => {
    const low = convertRawScore('listening', 3);
    expect(low.matched).toBe(false);
    expect(low.band).toBeNull();
    expect(low.row).toBeNull();
    expect(low.oneBandAhead).toEqual({ band: 3.0, correct: 6 });
    expect(low.oneBandBehind).toBeNull();

    const gtLow = convertRawScore('reading-general-training', 5);
    expect(gtLow.band).toBeNull();
    expect(gtLow.oneBandAhead).toEqual({ band: 3.0, correct: 9 });
  });

  it('has no band above a perfect score', () => {
    const perfect = convertRawScore('reading-academic', 40);
    expect(perfect.matched).toBe(true);
    expect(perfect.band).toBe(9.0);
    expect(perfect.oneBandAhead).toBeNull();
    expect(perfect.oneBandBehind).toEqual({ band: 8.5, correct: 38 });
  });

  it('echoes the module the table belongs to', () => {
    expect(convertRawScore('listening', 30).module).toBeNull();
    expect(convertRawScore('reading-general-training', 30).module).toBe('general-training');
    expect(convertRawScore('reading-academic', 30).module).toBe('academic');
  });
});
