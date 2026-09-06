import { describe, expect, it } from 'vitest';

import {
  MAX_RAW_SCORE,
  nextBandFrom,
  RAW_SCORE_PAPERS,
  RAW_SCORE_TABLES,
  rawScoreForBand,
  rawScoreRow,
} from '../../src/data/rawScores.js';

import type { RawScorePaper } from '../../src/types.js';

describe('table integrity', () => {
  it('publishes exactly the three objectively marked papers', () => {
    expect([...RAW_SCORE_PAPERS]).toEqual(['listening', 'academic-reading', 'general-reading']);
  });

  it.each(RAW_SCORE_PAPERS)('covers every raw score from 0 to 40 exactly once on %s', (paper) => {
    const seen = new Set<number>();
    for (let correct = 0; correct <= MAX_RAW_SCORE; correct += 1) {
      const matches = RAW_SCORE_TABLES[paper].rows.filter(
        (row) => correct >= row.minCorrect && correct <= row.maxCorrect,
      );
      expect(matches).toHaveLength(1);
      seen.add(correct);
    }
    expect(seen.size).toBe(MAX_RAW_SCORE + 1);
  });

  it.each(RAW_SCORE_PAPERS)('is monotonic in band and contiguous in marks on %s', (paper) => {
    const { rows } = RAW_SCORE_TABLES[paper];
    for (let index = 1; index < rows.length; index += 1) {
      const previous = rows[index - 1] as (typeof rows)[number];
      const current = rows[index] as (typeof rows)[number];
      expect(current.band).toBeLessThan(previous.band);
      expect(current.maxCorrect).toBe(previous.minCorrect - 1);
      expect(current.minCorrect).toBeLessThanOrEqual(current.maxCorrect);
    }
    expect(rows.at(0)?.maxCorrect).toBe(MAX_RAW_SCORE);
    expect(rows.at(-1)?.minCorrect).toBe(0);
  });

  it.each(RAW_SCORE_PAPERS)('uses only reportable band values on %s', (paper) => {
    for (const row of RAW_SCORE_TABLES[paper].rows) {
      expect(row.band * 2).toBe(Math.round(row.band * 2));
      expect(row.band).toBeGreaterThanOrEqual(0);
      expect(row.band).toBeLessThanOrEqual(9);
    }
  });

  it.each(RAW_SCORE_PAPERS)('flags exactly the rows below the published floor on %s', (paper) => {
    const table = RAW_SCORE_TABLES[paper];
    for (const row of table.rows) {
      expect(row.extrapolated).toBe(row.maxCorrect < table.publishedFloor);
    }
  });

  it('marks the General Training table as the stricter of the two reading papers', () => {
    for (let band = 5; band <= 9; band += 0.5) {
      const academic = rawScoreForBand('academic-reading', band);
      const general = rawScoreForBand('general-reading', band);
      expect(general).toBeGreaterThan(academic as number);
    }
  });

  it('names its source and module for every paper', () => {
    for (const paper of RAW_SCORE_PAPERS) {
      const table = RAW_SCORE_TABLES[paper];
      expect(table.paper).toBe(paper);
      expect(table.questions).toBe(MAX_RAW_SCORE);
      expect(table.source).toMatch(/Cambridge IELTS/);
      expect(table.note).toMatch(/[Ii]ndicative/);
      expect(['academic', 'general-training', 'both']).toContain(table.module);
    }
  });
});

describe('rawScoreRow', () => {
  it('returns the published cut score for a full mark', () => {
    expect(rawScoreRow('listening', 40)).toMatchObject({ band: 9, extrapolated: false });
  });

  it('returns band 0 for a blank sheet', () => {
    expect(rawScoreRow('academic-reading', 0).band).toBe(0);
  });

  it('flags rows below the published floor', () => {
    expect(rawScoreRow('listening', 2).extrapolated).toBe(true);
    expect(rawScoreRow('general-reading', 5).extrapolated).toBe(true);
    expect(rawScoreRow('general-reading', 6).extrapolated).toBe(false);
  });

  it('separates the two reading tables at the same raw score', () => {
    expect(rawScoreRow('academic-reading', 30).band).toBe(7);
    expect(rawScoreRow('general-reading', 30).band).toBe(6);
  });
});

describe('rawScoreForBand', () => {
  it('returns the cheapest raw score that reaches a band', () => {
    expect(rawScoreForBand('listening', 7)).toBe(30);
    expect(rawScoreForBand('academic-reading', 6.5)).toBe(27);
  });

  it('returns undefined for a band the table does not cut at', () => {
    expect(rawScoreForBand('listening', 0.5)).toBeUndefined();
  });
});

describe('nextBandFrom', () => {
  it('reports the marks still needed for the next band', () => {
    expect(nextBandFrom('listening', 30)).toEqual({ band: 7.5, minCorrect: 32, marksNeeded: 2 });
  });

  it('reports one mark when the candidate sits at the top of a band', () => {
    expect(nextBandFrom('academic-reading', 38)?.marksNeeded).toBe(1);
  });

  it('returns null at the ceiling of the table', () => {
    expect(nextBandFrom('listening', 40)).toBeNull();
    expect(nextBandFrom('general-reading', 40)).toBeNull();
  });

  it('never proposes a lower band than the current one', () => {
    for (const paper of RAW_SCORE_PAPERS as RawScorePaper[]) {
      for (let correct = 0; correct < MAX_RAW_SCORE; correct += 1) {
        const current = rawScoreRow(paper, correct).band;
        const next = nextBandFrom(paper, correct);
        if (next === null) {
          expect(current).toBe(9);
          continue;
        }
        expect(next.band).toBeGreaterThan(current);
      }
    }
  });
});
