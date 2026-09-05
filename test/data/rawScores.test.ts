import { describe, expect, it } from 'vitest';

import {
  bandForRawScore,
  rawScoreForBand,
  RAW_SCORE_MODULES,
  RAW_SCORE_TABLES,
} from '../../src/data/rawScores.js';

describe('RAW_SCORE_TABLES', () => {
  it('exposes the three objective modules', () => {
    expect(RAW_SCORE_MODULES).toEqual(['listening', 'reading-academic', 'reading-general-training']);
  });

  it('describes every module completely', () => {
    for (const moduleId of RAW_SCORE_MODULES) {
      const table = RAW_SCORE_TABLES[moduleId];
      expect(table.id).toBe(moduleId);
      expect(table.name.length).toBeGreaterThan(0);
      expect(table.questions).toBe(40);
      expect(table.sourceUrl.startsWith('https://')).toBe(true);
      expect(table.note.length).toBeGreaterThan(0);
      expect(table.entries.length).toBe(11);
    }
  });

  it('orders every table by band with contiguous, non-overlapping ranges', () => {
    for (const moduleId of RAW_SCORE_MODULES) {
      const entries = RAW_SCORE_TABLES[moduleId].entries;
      let previousMin = 41;
      for (const entry of entries) {
        expect(entry.min).toBeLessThanOrEqual(entry.max);
        expect(entry.max).toBeLessThan(previousMin);
        previousMin = entry.min;
      }
      expect(entries[0]?.band).toBe(9);
      expect(entries[entries.length - 1]?.band).toBe(RAW_SCORE_TABLES[moduleId].floor);
    }
  });

  it('covers every raw mark either inside the table or below its floor', () => {
    for (const moduleId of RAW_SCORE_MODULES) {
      const lowest = RAW_SCORE_TABLES[moduleId].entries[RAW_SCORE_TABLES[moduleId].entries.length - 1];
      for (let correct = 0; correct <= 40; correct += 1) {
        const row = bandForRawScore(moduleId, correct);
        if (row === undefined) {
          expect(correct).toBeLessThan(lowest?.min ?? 0);
        }
      }
    }
  });
});

describe('bandForRawScore', () => {
  it('matches the published anchors for Listening', () => {
    expect(bandForRawScore('listening', 30)?.band).toBe(7);
    expect(bandForRawScore('listening', 39)?.band).toBe(9);
    expect(bandForRawScore('listening', 40)?.band).toBe(9);
    expect(bandForRawScore('listening', 10)?.band).toBe(4);
  });

  it('matches the published anchors for Academic Reading', () => {
    expect(bandForRawScore('reading-academic', 30)?.band).toBe(7);
    expect(bandForRawScore('reading-academic', 33)?.band).toBe(7.5);
    expect(bandForRawScore('reading-academic', 39)?.band).toBe(9);
  });

  it('matches the published anchors for General Training Reading', () => {
    expect(bandForRawScore('reading-general-training', 30)?.band).toBe(6);
    expect(bandForRawScore('reading-general-training', 39)?.band).toBe(8.5);
    expect(bandForRawScore('reading-general-training', 40)?.band).toBe(9);
  });

  it('returns undefined below the published floor', () => {
    expect(bandForRawScore('listening', 9)).toBeUndefined();
    expect(bandForRawScore('reading-general-training', 0)).toBeUndefined();
  });
});

describe('rawScoreForBand', () => {
  it('finds a row for every band from 4.0 to 9.0', () => {
    for (const moduleId of RAW_SCORE_MODULES) {
      for (let band = 4; band <= 9; band += 0.5) {
        expect(rawScoreForBand(moduleId, band)).toBeDefined();
      }
    }
  });

  it('gives the General Training paper stricter cut points than the Academic paper', () => {
    const academic = rawScoreForBand('reading-academic', 7);
    const general = rawScoreForBand('reading-general-training', 7);
    expect(general && academic && general.min > academic.min).toBe(true);
  });

  it('returns undefined outside the table', () => {
    expect(rawScoreForBand('listening', 3.5)).toBeUndefined();
    expect(rawScoreForBand('listening', 9.5)).toBeUndefined();
  });
});
