import { describe, expect, it } from 'vitest';

import { CONVERSION_TABLES, CONVERSION_TARGETS, convertBand } from '../../src/data/conversions.js';

describe('CONVERSION_TABLES', () => {
  it('exposes five target scales', () => {
    expect(CONVERSION_TARGETS).toEqual([
      'cefr',
      'toefl-ibt',
      'cambridge-english-scale',
      'pte-academic',
      'duolingo',
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
      expect(table.entries.length).toBe(11);
    }
  });

  it('renders ranges and levels as display strings', () => {
    expect(convertBand('cefr', 7)?.display).toBe('C1');
    expect(convertBand('toefl-ibt', 7)?.display).toBe('94–101');
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
