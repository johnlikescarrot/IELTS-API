import { describe, expect, it } from 'vitest';

import {
  RAW_SCORE_MAX,
  RAW_SCORE_PROVENANCE,
  RAW_SCORE_SCALES,
  bandForRaw,
  minRawForBand,
  rawScoreResult,
  rawScoreTable,
  rawScoreTables,
  scaleForSkill,
} from '../../src/data/rawScores.js';

describe('raw-score conversion tables', () => {
  it('publishes ascending, gap-free tables that reach 40 marks', () => {
    expect(Object.keys(rawScoreTables())).toEqual([...RAW_SCORE_SCALES]);
    for (const scale of RAW_SCORE_SCALES) {
      const rows = rawScoreTable(scale);
      expect(rows.length).toBe(17);
      let cursor = (rows[0] as { minRaw: number }).minRaw;
      for (const row of rows) {
        expect(row.minRaw).toBe(cursor);
        expect(row.maxRaw).toBeGreaterThanOrEqual(row.minRaw);
        expect(row.band).toBeGreaterThan(0);
        cursor = row.maxRaw + 1;
      }
      expect(cursor).toBe(RAW_SCORE_MAX + 1);
      // Bands ascend by half-steps from 1.0.
      const bands = rows.map((row) => row.band);
      expect(bands).toEqual([...bands].sort((a, b) => a - b));
      expect(new Set(bands).size).toBe(bands.length);
    }
  });

  it('looks up the table rows at their boundaries', () => {
    expect(bandForRaw('listening', 1)?.band).toBe(1);
    expect(bandForRaw('listening', 39)?.band).toBe(9);
    expect(bandForRaw('listening', 40)?.band).toBe(9);
    expect(bandForRaw('listening', 30)?.band).toBe(7);
    expect(bandForRaw('academic-reading', 27)?.band).toBe(6.5);
    expect(bandForRaw('academic-reading', 30)?.band).toBe(7);
    expect(bandForRaw('general-training-reading', 33)?.band).toBe(7);
    expect(bandForRaw('general-training-reading', 40)?.band).toBe(9);
  });

  it('finds no row below the lowest published one', () => {
    expect(bandForRaw('listening', 0)).toBeUndefined();
    // Academic Reading starts at 2 marks; Listening and GT Reading at 1.
    expect(bandForRaw('academic-reading', 1)).toBeUndefined();
  });

  it('knows the minimum mark for a band', () => {
    expect(minRawForBand('listening', 7)).toBe(30);
    expect(minRawForBand('academic-reading', 7)).toBe(30);
    expect(minRawForBand('general-training-reading', 7)).toBe(33);
    expect(minRawForBand('listening', 0.5)).toBeUndefined();
  });

  it('maps module and receptive skill to a scale', () => {
    expect(scaleForSkill('academic', 'listening')).toBe('listening');
    expect(scaleForSkill('general-training', 'listening')).toBe('listening');
    expect(scaleForSkill('academic', 'reading')).toBe('academic-reading');
    expect(scaleForSkill('general-training', 'reading')).toBe('general-training-reading');
  });

  it('converts a mid-table mark and shows the distance to the next band', () => {
    const result = rawScoreResult('academic-reading', 27);
    expect(result).toMatchObject({
      scale: 'academic-reading',
      raw: 27,
      band: 6.5,
      range: { minRaw: 27, maxRaw: 29 },
      next: { band: 7, minRaw: 30, itemsNeeded: 3 },
    });
    expect(result.note).toContain('Indicative');
  });

  it('leaves marks below the table without a band but with a first step', () => {
    const result = rawScoreResult('academic-reading', 1);
    expect(result.band).toBeNull();
    expect(result.range).toBeNull();
    expect(result.next).toEqual({ band: 1, minRaw: 2, itemsNeeded: 1 });
    expect(result.note).toContain('below the lowest published conversion row');
  });

  it('caps at band 9 at the top of the table', () => {
    const result = rawScoreResult('listening', 40);
    expect(result.band).toBe(9);
    expect(result.next).toBeNull();
    expect(result.note).toContain('Top of the published table');
    expect(rawScoreResult('listening', 39).next).toBeNull();
  });

  it('carries the provenance note through every result type', () => {
    expect(RAW_SCORE_PROVENANCE).toContain('Test Report Form is authoritative');
  });
});
