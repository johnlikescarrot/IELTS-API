import { describe, expect, it } from 'vitest';

import { CONVERSION_TABLES, CONVERSION_TARGETS, convertBand } from '../../src/data/conversions.js';

describe('CONVERSION_TABLES', () => {
  it('exposes eight target scales', () => {
    expect(CONVERSION_TARGETS).toEqual([
      'cefr',
      'toefl-ibt',
      'cambridge-english-scale',
      'pte-academic',
      'duolingo',
      'listening-raw',
      'academic-reading-raw',
      'general-training-reading-raw',
    ]);
  });

  it('describes every scale completely', () => {
    for (const target of CONVERSION_TARGETS) {
      const table = CONVERSION_TABLES[target];
      expect(table.target).toBe(target);
      expect(table.name.length).toBeGreaterThan(0);
      expect(table.provider.length).toBeGreaterThan(0);
      expect(table.sourceUrl.startsWith('https://')).toBe(true);
      expect(table.unit.length).toBeGreaterThan(0);
      expect(table.note.length).toBeGreaterThan(0);
    }
  });

  it('covers bands 4.0 to 9.0 on the provider scales and 2.5 to 9.0 on the raw-mark scales', () => {
    for (const target of CONVERSION_TARGETS) {
      const bands = CONVERSION_TABLES[target].entries.map((entry) => entry.band);
      const floor = target.endsWith('-raw') ? 2.5 : 4;
      expect(bands[0]).toBe(floor);
      expect(bands).toHaveLength(((9 - floor) / 0.5 + 1) as number);
      for (let index = 1; index < bands.length; index += 1) {
        expect(bands[index]).toBe((bands[index - 1] ?? 0) + 0.5);
      }
    }
  });

  it('publishes contiguous, non-overlapping raw-mark ranges', () => {
    for (const target of ['listening-raw', 'academic-reading-raw', 'general-training-reading-raw'] as const) {
      const rangesByBand = CONVERSION_TABLES[target].entries.map((entry) => entry.value as [number, number]);
      for (const [low, high] of rangesByBand) {
        expect(low).toBeLessThanOrEqual(high);
      }
      // Bands ascend, so each row's range sits directly below the previous one.
      for (let index = 1; index < rangesByBand.length; index += 1) {
        const [, previousHigh] = rangesByBand[index - 1] as [number, number];
        const [currentLow] = rangesByBand[index] as [number, number];
        expect(currentLow).toBe(previousHigh + 1);
      }
    }
    expect(CONVERSION_TABLES['listening-raw'].entries[0]?.value).toEqual([4, 5]);
    expect(CONVERSION_TABLES['listening-raw'].entries.at(-1)?.value).toEqual([39, 40]);
    expect(CONVERSION_TABLES['general-training-reading-raw'].entries.at(-1)?.value).toEqual([40, 40]);
  });

  it('renders ranges and levels as display strings', () => {
    expect(convertBand('cefr', 7)?.display).toBe('C1');
    expect(convertBand('toefl-ibt', 7)?.display).toBe('94–101');
    expect(convertBand('listening-raw', 7)?.display).toBe('30–31');
    expect(convertBand('academic-reading-raw', 7)?.display).toBe('30–32');
    expect(convertBand('general-training-reading-raw', 9)?.display).toBe('40–40');
  });
});

describe('convertBand', () => {
  it('finds a row for every band from 4.0 to 9.0', () => {
    for (let band = 4; band <= 9; band += 0.5) {
      for (const target of CONVERSION_TARGETS) {
        expect(convertBand(target, band)).toBeDefined();
      }
    }
  });

  it('returns undefined below the published floor', () => {
    expect(convertBand('cefr', 3.5)).toBeUndefined();
    expect(convertBand('duolingo', 0)).toBeUndefined();
  });

  it('returns undefined for non-reportable bands', () => {
    expect(convertBand('cefr', 7.25)).toBeUndefined();
  });
});
