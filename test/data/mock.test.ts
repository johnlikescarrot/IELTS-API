import { describe, expect, it } from 'vitest';

import { BAND_SCALE } from '../../src/data/bands.js';
import {
  EXAM_MODE_RULES,
  LISTENING_SUITE_MINUTES,
  MOCK_CONTROLS,
  MOCK_MODES,
  MOCK_SCORING,
  MOCK_SESSION_SKILLS,
  MOCK_SHARED_RULES,
  MOCK_SKILLS,
  MOCK_SUITE_COUNT,
  PRACTICE_MODE_RULES,
  RAW_BAND_TABLES,
  READING_SUITE_MINUTES,
  WRITING_SUITE_MINUTES,
} from '../../src/data/mock.js';

describe('mock-exam catalogues', () => {
  it('covers the three receptive papers and both session modes', () => {
    expect(MOCK_SKILLS).toEqual(['listening', 'reading-academic', 'reading-general']);
    expect(MOCK_MODES).toEqual(['practice', 'exam']);
    expect(MOCK_SESSION_SKILLS).toEqual([
      'listening',
      'reading-academic',
      'reading-general',
      'writing',
      'full-suite',
    ]);
    expect(MOCK_SUITE_COUNT).toBe(24);
  });

  it('times a full suite at Listening 32 + Reading 60 + Writing 60', () => {
    expect(LISTENING_SUITE_MINUTES).toBe(32);
    expect(READING_SUITE_MINUTES).toBe(60);
    expect(WRITING_SUITE_MINUTES).toBe(60);
  });

  it('publishes computer-delivered controls, conduct rules and scoring notes', () => {
    expect(MOCK_CONTROLS).toContain('timer');
    expect(MOCK_CONTROLS).toContain('notepad');
    expect(MOCK_CONTROLS).toContain('finish-section');
    expect(MOCK_SHARED_RULES.length).toBeGreaterThan(0);
    expect(PRACTICE_MODE_RULES.join(' ')).toContain('Practice mode');
    expect(EXAM_MODE_RULES.join(' ')).toContain('Exam conditions');
    expect(MOCK_SCORING.join(' ')).toContain('/v1/mock/raw-to-band');
  });
});

describe('indicative raw-score tables', () => {
  it('publishes one provenance-carrying table per receptive paper', () => {
    for (const skill of MOCK_SKILLS) {
      const table = RAW_BAND_TABLES[skill];
      expect(table.skill).toBe(skill);
      expect(table.name.length).toBeGreaterThan(0);
      expect(table.source.length).toBeGreaterThan(0);
      expect(table.provenance).toBe('indicative');
      expect(table.note).toContain('Indicative conversion');
    }
  });

  it('orders every table from the highest cut score down to a zero catch-all', () => {
    for (const skill of MOCK_SKILLS) {
      const rows = RAW_BAND_TABLES[skill].rows;
      expect(rows.length).toBeGreaterThan(10);
      for (let index = 1; index < rows.length; index += 1) {
        const previous = rows[index - 1];
        const current = rows[index];
        expect(previous !== undefined && current !== undefined).toBe(true);
        if (previous !== undefined && current !== undefined) {
          expect(previous.minRaw).toBeGreaterThan(current.minRaw);
          expect(previous.band).toBeGreaterThanOrEqual(current.band);
        }
      }
      expect(rows[rows.length - 1]?.minRaw).toBe(0);
    }
  });

  it('uses only reportable bands that exist on the IELTS band scale', () => {
    const scaleBands = new Set(BAND_SCALE.map((entry) => entry.band));
    for (const skill of MOCK_SKILLS) {
      for (const row of RAW_BAND_TABLES[skill].rows) {
        expect(row.band).toBeGreaterThanOrEqual(1);
        expect(row.band).toBeLessThanOrEqual(9);
        expect(scaleBands.has(row.band)).toBe(true);
      }
    }
  });

  it('starts listening and academic reading at 39 for band 9', () => {
    expect(RAW_BAND_TABLES['listening'].rows[0]).toEqual({ minRaw: 39, band: 9 });
    expect(RAW_BAND_TABLES['reading-academic'].rows[0]).toEqual({ minRaw: 39, band: 9 });
  });

  it('makes General Training cuts stricter than Academic cuts at band 7', () => {
    const academic = RAW_BAND_TABLES['reading-academic'].rows.find((row) => row.band === 7);
    const general = RAW_BAND_TABLES['reading-general'].rows.find((row) => row.band === 7);
    expect(academic?.minRaw).toBe(30);
    expect(general?.minRaw).toBe(34);
    expect(RAW_BAND_TABLES['reading-general'].rows[0]).toEqual({ minRaw: 40, band: 9 });
  });
});
