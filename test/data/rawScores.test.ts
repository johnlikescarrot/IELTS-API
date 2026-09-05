import { describe, expect, it } from 'vitest';

import {
  RAW_SCORE_MAXIMUM,
  RAW_SCORE_PAPERS,
  RAW_SCORE_TABLES,
  bandForRaw,
  rawForBand,
} from '../../src/data/rawScores.js';

describe('the raw-score conversion tables', () => {
  it('publishes one table per marked paper', () => {
    expect(RAW_SCORE_PAPERS).toEqual(['listening', 'reading-academic', 'reading-general']);
    expect(RAW_SCORE_MAXIMUM).toBe(40);
  });

  it('keeps every table monotonic, non-overlapping and inside the paper maximum', () => {
    for (const paper of RAW_SCORE_PAPERS) {
      const table = RAW_SCORE_TABLES[paper];
      expect(table.paper).toBe(paper);
      expect(table.maximum).toBe(RAW_SCORE_MAXIMUM);
      expect(table.note).toContain('Indicative');
      expect(table.sourceUrl).toContain('ielts.org');
      let previous: (typeof table.bands)[number] | undefined;
      for (const row of table.bands) {
        expect(row.min).toBeLessThanOrEqual(row.max);
        expect(row.max).toBeLessThanOrEqual(RAW_SCORE_MAXIMUM);
        expect(row.min).toBeGreaterThanOrEqual(0);
        if (previous !== undefined) {
          expect(row.band).toBeLessThan(previous.band);
          expect(row.max).toBeLessThan(previous.min);
        }
        previous = row;
      }
    }
  });

  it('renders single-mark ranges without a dash', () => {
    const row = RAW_SCORE_TABLES['reading-general'].bands.find((band) => band.band === 9);
    expect(row?.display).toBe('40');
    expect(RAW_SCORE_TABLES.listening.bands[0]?.display).toBe('39–40');
  });

  it('converts a raw score to a band', () => {
    expect(bandForRaw('listening', 30)?.band).toBe(7);
    expect(bandForRaw('reading-academic', 30)?.band).toBe(7);
    expect(bandForRaw('reading-general', 30)?.band).toBe(6);
  });

  it('leaves scores below the published range unmatched', () => {
    expect(bandForRaw('listening', 0)).toBeUndefined();
    expect(bandForRaw('listening', 3)).toBeUndefined();
  });

  it('finds the lowest raw score for a band', () => {
    expect(rawForBand('reading-academic', 6)?.min).toBe(23);
    expect(rawForBand('listening', 1)).toBeUndefined();
  });

  it('marks the General Training table as the strictest at band 7', () => {
    const academic = rawForBand('reading-academic', 7)?.min as number;
    const general = rawForBand('reading-general', 7)?.min as number;
    expect(general).toBeGreaterThan(academic);
  });
});
