import { describe, expect, it } from 'vitest';

import {
  BAND_DESCRIPTORS,
  BAND_SCALE,
  CRITERIA_BY_SET,
  SPEAKING_CRITERIA,
  WRITING_TASK1_CRITERIA,
  WRITING_TASK2_CRITERIA,
  bandScaleEntry,
  cefrForBand,
  findDescriptors,
} from '../../src/data/bands.js';

describe('BAND_SCALE', () => {
  it('covers 0 to 9 in half-band steps', () => {
    expect(BAND_SCALE).toHaveLength(19);
    expect(BAND_SCALE[0]?.band).toBe(0);
    expect(BAND_SCALE[18]?.band).toBe(9);
    for (const entry of BAND_SCALE) {
      expect(entry.label.length).toBeGreaterThan(0);
      expect(entry.description.length).toBeGreaterThan(0);
      expect(entry.cefr.length).toBeGreaterThan(0);
    }
  });
});

describe('criteria', () => {
  it('exposes the four analytic criteria per set', () => {
    expect(SPEAKING_CRITERIA).toHaveLength(4);
    expect(WRITING_TASK1_CRITERIA).toHaveLength(4);
    expect(WRITING_TASK2_CRITERIA).toHaveLength(4);
    expect(CRITERIA_BY_SET.speaking).toBe(SPEAKING_CRITERIA);
    expect(CRITERIA_BY_SET['writing-task-1']).toBe(WRITING_TASK1_CRITERIA);
    expect(CRITERIA_BY_SET['writing-task-2']).toBe(WRITING_TASK2_CRITERIA);
  });
});

describe('BAND_DESCRIPTORS', () => {
  it('holds a summary for every set, criterion and band', () => {
    expect(BAND_DESCRIPTORS).toHaveLength(3 * 4 * 10);
    for (const descriptor of BAND_DESCRIPTORS) {
      expect(descriptor.band).toBeGreaterThanOrEqual(0);
      expect(descriptor.band).toBeLessThanOrEqual(9);
      expect(descriptor.summary.length).toBeGreaterThan(10);
    }
  });
});

describe('findDescriptors', () => {
  it('returns every descriptor of a set', () => {
    expect(findDescriptors('speaking')).toHaveLength(40);
  });

  it('filters by criterion', () => {
    const rows = findDescriptors('speaking', 'pronunciation');
    expect(rows).toHaveLength(10);
    expect(rows.every((row) => row.criterion === 'pronunciation')).toBe(true);
  });

  it('filters by band', () => {
    const rows = findDescriptors('writing-task-2', undefined, 9);
    expect(rows).toHaveLength(4);
    expect(rows.every((row) => row.band === 9)).toBe(true);
  });

  it('filters by criterion and band together', () => {
    const rows = findDescriptors('writing-task-1', 'taskAchievement', 7);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.set).toBe('writing-task-1');
  });

  it('returns an empty list for impossible combinations', () => {
    expect(findDescriptors('speaking', 'taskResponse')).toEqual([]);
  });
});

describe('bandScaleEntry', () => {
  it('finds reportable bands', () => {
    expect(bandScaleEntry(7.5)?.cefr).toBe('C1');
    expect(bandScaleEntry(0)?.label).toBe('Did not attempt the test');
  });

  it('returns undefined outside the scale', () => {
    expect(bandScaleEntry(9.5)).toBeUndefined();
    expect(bandScaleEntry(-1)).toBeUndefined();
  });
});

describe('cefrForBand', () => {
  it('maps bands to CEFR levels', () => {
    expect(cefrForBand(9)).toBe('C2');
    expect(cefrForBand(4)).toBe('B1');
  });

  it('falls back to a dash for unknown bands', () => {
    expect(cefrForBand(9.5)).toBe('-');
  });
});
