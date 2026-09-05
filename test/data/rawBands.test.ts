import { describe, expect, it } from 'vitest';

import {
  MAX_RAW_SCORE,
  RAW_BAND_SCALES,
  RAW_BAND_TABLES,
  rawBandProfile,
  rawBandRows,
  rawToBand,
} from '../../src/data/rawBands.js';

describe('the raw-score tables', () => {
  it('publishes three receptive scales', () => {
    expect([...RAW_BAND_SCALES]).toEqual(['listening', 'academic-reading', 'general-reading']);
    expect(Object.keys(RAW_BAND_TABLES).sort()).toEqual([...RAW_BAND_SCALES].sort());
  });

  it('stores strictly descending threshold rows ending in a floor row', () => {
    for (const scale of RAW_BAND_SCALES) {
      const table = RAW_BAND_TABLES[scale];
      expect(table.scale).toBe(scale);
      expect(table.thresholds.length).toBeGreaterThan(5);
      for (let index = 0; index < table.thresholds.length - 1; index += 1) {
        const current = table.thresholds[index] as { minRaw: number; band: number };
        const next = table.thresholds[index + 1] as { minRaw: number; band: number };
        expect(current.minRaw).toBeGreaterThan(next.minRaw);
        expect(current.band).toBeGreaterThan(next.band);
      }
      const last = table.thresholds[table.thresholds.length - 1] as { minRaw: number };
      expect(last.minRaw).toBe(0);
    }
  });

  it('marks the published minimum at the second-to-last row', () => {
    for (const scale of RAW_BAND_SCALES) {
      const table = RAW_BAND_TABLES[scale];
      const boundary = table.thresholds[table.thresholds.length - 2] as { minRaw: number };
      expect(table.publishedMinimum).toBe(boundary.minRaw);
    }
  });
});

describe('rawToBand', () => {
  it('converts listening raw scores', () => {
    expect(rawToBand('listening', 39)).toMatchObject({ band: 9, label: 'Expert user', cefr: 'C2' });
    expect(rawToBand('listening', 30)).toMatchObject({
      band: 7,
      label: 'Good user',
      cefr: 'C1',
      belowPublishedRows: false,
    });
    expect(rawToBand('listening', 23)).toMatchObject({ band: 6 });
  });

  it('converts academic reading raw scores', () => {
    expect(rawToBand('academic-reading', 35)).toMatchObject({ band: 8 });
    expect(rawToBand('academic-reading', 33)).toMatchObject({ band: 7.5 });
    expect(rawToBand('academic-reading', 15)).toMatchObject({ band: 5 });
  });

  it('converts general training reading raw scores', () => {
    expect(rawToBand('general-reading', 40)).toMatchObject({ band: 9 });
    expect(rawToBand('general-reading', 39)).toMatchObject({ band: 8.5 });
    expect(rawToBand('general-reading', 30)).toMatchObject({ band: 6, belowPublishedRows: false });
  });

  it('flags conversions below the published rows', () => {
    expect(rawToBand('listening', 2)).toMatchObject({ band: 2.5, belowPublishedRows: true });
    expect(rawToBand('listening', 4)).toMatchObject({ band: 3, belowPublishedRows: false });
    expect(rawToBand('general-reading', 5)).toMatchObject({ band: 2, belowPublishedRows: true });
    expect(rawToBand('general-reading', 6)).toMatchObject({ band: 2.5, belowPublishedRows: false });
  });

  it('saturates outside the 0-40 range', () => {
    expect(rawToBand('listening', MAX_RAW_SCORE + 1)).toMatchObject({ band: 9 });
    expect(rawToBand('listening', -1)).toMatchObject({ band: 2.5, belowPublishedRows: true });
  });
});

describe('rawBandProfile', () => {
  it('resolves the label and CEFR level of a band', () => {
    expect(rawBandProfile(7)).toEqual({ label: 'Good user', cefr: 'C1' });
  });

  it('falls back for non-reportable bands', () => {
    expect(rawBandProfile(42)).toEqual({ label: 'Unreported band', cefr: '-' });
  });
});

describe('rawBandRows', () => {
  it('expands each table to one row per raw score', () => {
    for (const scale of RAW_BAND_SCALES) {
      const rows = rawBandRows(scale);
      expect(rows).toHaveLength(MAX_RAW_SCORE + 1);
      expect(rows.map((row) => row.raw)).toEqual(
        Array.from({ length: MAX_RAW_SCORE + 1 }, (_unused, raw) => raw),
      );
      expect(rows.every((row) => row.band >= 0 && row.band <= 9)).toBe(true);
    }
  });

  it('matches the threshold lookup', () => {
    const rows = rawBandRows('listening');
    expect(rows[30]).toEqual({ raw: 30, band: 7 });
    expect(rows[0]).toEqual({ raw: 0, band: 2.5 });
  });
});
