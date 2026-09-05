import { describe, expect, it } from 'vitest';

import { MAX_RAW_SCORE, MIN_RAW_SCORE, convertRawMark, rawToBand } from '../../src/lib/study.js';

describe('rawToBand', () => {
  it('maps published intervals to bands', () => {
    expect(rawToBand('listening', 40)).toBe(9);
    expect(rawToBand('listening', 30)).toBe(7);
    expect(rawToBand('reading-academic', 35)).toBe(8);
    expect(rawToBand('reading-general', 40)).toBe(9);
    expect(rawToBand('reading-general', 39)).toBe(8.5);
  });

  it('returns null below the lowest published interval', () => {
    expect(rawToBand('listening', 0)).toBeNull();
    expect(rawToBand('listening', 3)).toBeNull();
  });

  it('rejects unknown tables', () => {
    expect(() => rawToBand('writing', 30)).toThrow('Unknown raw-score table "writing".');
  });

  it('rejects marks outside 0-40', () => {
    expect(() => rawToBand('listening', -1)).toThrow('"raw" must be an integer');
    expect(() => rawToBand('listening', 41)).toThrow('"raw" must be an integer');
    expect(() => rawToBand('listening', 30.5)).toThrow('"raw" must be an integer');
    expect(MIN_RAW_SCORE).toBe(0);
    expect(MAX_RAW_SCORE).toBe(40);
  });
});

describe('convertRawMark', () => {
  it('returns the table together with the band', () => {
    const result = convertRawMark('reading-academic', 23);
    expect(result.table.id).toBe('reading-academic');
    expect(result.table.questions).toBe(40);
    expect(result.band).toBe(6);
  });

  it('returns a null band for uncovered marks', () => {
    expect(convertRawMark('listening', 2).band).toBeNull();
  });

  it('rejects unknown tables', () => {
    expect(() => convertRawMark('speaking', 20)).toThrow('Unknown raw-score table "speaking".');
  });
});
