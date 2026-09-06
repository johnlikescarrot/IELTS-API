import { describe, expect, it } from 'vitest';

import {
  RAW_SCORE_MODULES,
  RAW_SCORE_TABLES,
  RAW_SCORE_TOTAL,
  RAW_SCORE_VARIANTS,
  bandForThresholds,
  expandRows,
  rawScoreTable,
  rowForRawScore,
  variantDisagreements,
} from '../../src/data/rawScores.js';
import { BAND_SCALE } from '../../src/data/bands.js';

import type { RawScoreTable } from '../../src/types.js';

/** Every raw score a 40-question paper can produce. */
const ALL_SCORES = Array.from({ length: RAW_SCORE_TOTAL + 1 }, (_, index) => index);

describe('raw-score tables', () => {
  it('publishes one table per objectively-marked paper', () => {
    expect(RAW_SCORE_MODULES).toEqual(['listening', 'reading-academic', 'reading-general']);
    for (const module of RAW_SCORE_MODULES) {
      expect(RAW_SCORE_TABLES[module].module).toBe(module);
      expect(RAW_SCORE_TABLES[module].totalQuestions).toBe(RAW_SCORE_TOTAL);
      expect(RAW_SCORE_TABLES[module].provenance).toBe('indicative-consensus');
      expect(RAW_SCORE_TABLES[module].note).toContain('Indicative consensus table');
    }
  });

  /**
   * The central validity claim of the dataset: IELTS publishes the *average*
   * marks scored at whole bands, and each of those averages must fall inside
   * the row this table assigns to that band. If a threshold were transcribed
   * wrongly, an anchor would land in the neighbouring row and this fails.
   */
  it.each(RAW_SCORE_MODULES)('reproduces every official anchor mark for %s', (module) => {
    const table = RAW_SCORE_TABLES[module];
    expect(table.anchors.length).toBeGreaterThan(0);
    for (const anchor of table.anchors) {
      const row = rowForRawScore(table, anchor.marks);
      expect(
        row.band,
        `${module}: official average of ${anchor.marks} marks should sit in band ${anchor.band}`,
      ).toBe(anchor.band);
      expect(anchor.marks).toBeGreaterThanOrEqual(row.minCorrect);
      expect(anchor.marks).toBeLessThanOrEqual(row.maxCorrect);
    }
    expect(table.anchorSourceUrl).toBe('https://ielts.org/take-a-test/your-results/ielts-scoring-in-detail');
  });

  it.each(RAW_SCORE_MODULES)('covers 0-40 without gaps or overlaps for %s', (module) => {
    const table = RAW_SCORE_TABLES[module];
    const covered = new Set<number>();
    for (const row of table.rows) {
      expect(row.minCorrect).toBeLessThanOrEqual(row.maxCorrect);
      for (let correct = row.minCorrect; correct <= row.maxCorrect; correct += 1) {
        expect(covered.has(correct), `${module}: raw score ${correct} is covered twice`).toBe(false);
        covered.add(correct);
      }
    }
    expect([...covered].sort((a, b) => a - b)).toEqual(ALL_SCORES);
  });

  it.each(RAW_SCORE_MODULES)('is monotonic and reportable for %s', (module) => {
    const { rows } = RAW_SCORE_TABLES[module];
    const reportable = new Set(BAND_SCALE.map((entry) => entry.band));
    for (const [index, row] of rows.entries()) {
      expect(reportable.has(row.band), `${module}: band ${row.band} is not on the scale`).toBe(true);
      if (index > 0) {
        const previous = rows[index - 1] as (typeof rows)[number];
        expect(row.band).toBeLessThan(previous.band);
        expect(row.maxCorrect).toBe(previous.minCorrect - 1);
      }
    }
    expect(rows[0]?.maxCorrect).toBe(RAW_SCORE_TOTAL);
    expect(rows[0]?.band).toBe(9);
    expect(rows.at(-1)?.minCorrect).toBe(0);
  });

  it('never awards a General Training candidate more than an Academic one', () => {
    for (const correct of ALL_SCORES) {
      const academic = rowForRawScore(RAW_SCORE_TABLES['reading-academic'], correct).band;
      const general = rowForRawScore(RAW_SCORE_TABLES['reading-general'], correct).band;
      expect(general, `at ${correct}/40 General Training should not exceed Academic`).toBeLessThanOrEqual(
        academic,
      );
    }
  });

  /**
   * Applying the Academic table to a General Training paper is a real scoring
   * error, not a rounding one: at four raw scores it is worth a whole band.
   */
  it('differs by a full band between the two Reading tables at four raw scores', () => {
    const wholeBandApart = ALL_SCORES.filter(
      (correct) =>
        rowForRawScore(RAW_SCORE_TABLES['reading-academic'], correct).band -
          rowForRawScore(RAW_SCORE_TABLES['reading-general'], correct).band >=
        1,
    );
    expect(wholeBandApart).toContain(23);
    expect(wholeBandApart).toContain(30);
    expect(wholeBandApart).toContain(35);
    expect(wholeBandApart.length).toBeGreaterThan(0);
  });

  it('places the widely-cited scores where the published tables place them', () => {
    const listening = RAW_SCORE_TABLES.listening;
    const academic = RAW_SCORE_TABLES['reading-academic'];
    const general = RAW_SCORE_TABLES['reading-general'];
    expect(rowForRawScore(listening, 30).band).toBe(7);
    expect(rowForRawScore(listening, 26).band).toBe(6.5);
    expect(rowForRawScore(listening, 39).band).toBe(9);
    expect(rowForRawScore(academic, 27).band).toBe(6.5);
    expect(rowForRawScore(academic, 30).band).toBe(7);
    expect(rowForRawScore(general, 27).band).toBe(5.5);
    expect(rowForRawScore(general, 40).band).toBe(9);
  });
});

describe('expandRows', () => {
  it('derives each upper bound from the threshold above it', () => {
    expect(
      expandRows([
        [39, 9],
        [30, 7],
        [0, 4],
      ]),
    ).toEqual([
      { band: 9, minCorrect: 39, maxCorrect: 40 },
      { band: 7, minCorrect: 30, maxCorrect: 38 },
      { band: 4, minCorrect: 0, maxCorrect: 29 },
    ]);
  });

  it('returns nothing for an empty threshold list', () => {
    expect(expandRows([])).toEqual([]);
  });
});

describe('bandForThresholds', () => {
  it('returns the band of the first threshold the score reaches', () => {
    const thresholds = [
      [30, 7],
      [0, 5],
    ] as const;
    expect(bandForThresholds(thresholds, 40)).toBe(7);
    expect(bandForThresholds(thresholds, 30)).toBe(7);
    expect(bandForThresholds(thresholds, 29)).toBe(5);
  });

  it('rejects a threshold list that does not reach the score', () => {
    expect(() => bandForThresholds([[30, 7]], 4)).toThrow('does not cover a raw score of 4');
    expect(() => bandForThresholds([], 0)).toThrow('does not cover a raw score of 0');
  });
});

describe('rowForRawScore', () => {
  it('rejects a table with no covering row', () => {
    const broken = { rows: [{ band: 9, minCorrect: 39, maxCorrect: 40 }] } as unknown as RawScoreTable;
    expect(() => rowForRawScore(broken, 10)).toThrow('no row covers a raw score of 10');
  });
});

describe('rawScoreTable', () => {
  it('resolves every published paper', () => {
    for (const module of RAW_SCORE_MODULES) {
      expect(rawScoreTable(module).module).toBe(module);
    }
  });

  it('rejects an unknown paper with the allowed list', () => {
    expect(() => rawScoreTable('speaking')).toThrowError(
      expect.objectContaining({
        status: 400,
        details: expect.objectContaining({ parameter: 'module', allowed: RAW_SCORE_MODULES.join(',') }),
      }),
    );
  });
});

describe('variantDisagreements', () => {
  it('describes every recorded variant against a real table', () => {
    expect(RAW_SCORE_VARIANTS.length).toBeGreaterThan(0);
    for (const variant of RAW_SCORE_VARIANTS) {
      expect(RAW_SCORE_MODULES).toContain(variant.module);
      expect(variant.sourceUrl).toMatch(/^https?:\/\//);
      expect(variant.note.length).toBeGreaterThan(0);
      expect(variant.thresholds.at(-1)?.[0]).toBe(0);
    }
    expect(new Set(RAW_SCORE_VARIANTS.map((variant) => variant.id)).size).toBe(RAW_SCORE_VARIANTS.length);
  });

  it('reports the exact scores at which a source disagrees', () => {
    const variant = RAW_SCORE_VARIANTS.find((candidate) => candidate.id === 'general-upper-bands');
    expect(variant).toBeDefined();
    expect(variantDisagreements(variant as (typeof RAW_SCORE_VARIANTS)[number])).toEqual([
      { correct: 37, consensusBand: 8, variantBand: 7.5 },
    ]);
  });

  it('finds the whole disagreement of the pre-2018 coaching table', () => {
    const variant = RAW_SCORE_VARIANTS.find(
      (candidate) => candidate.id === 'listening-2017-coaching-table',
    ) as (typeof RAW_SCORE_VARIANTS)[number];
    const disagreements = variantDisagreements(variant);
    expect(disagreements.length).toBe(19);
    // The stricter table reserves band 9 for full marks.
    expect(disagreements).toContainEqual({ correct: 39, consensusBand: 9, variantBand: 8.5 });
    for (const disagreement of disagreements) {
      expect(disagreement.variantBand).toBeLessThanOrEqual(disagreement.consensusBand);
    }
  });

  it('reports no disagreement when a variant matches the consensus', () => {
    const table = RAW_SCORE_TABLES.listening;
    const identical = {
      id: 'identical',
      module: 'listening',
      label: 'copy',
      sourceUrl: 'https://example.invalid/table',
      note: 'a faithful copy',
      thresholds: table.rows.map((row) => [row.minCorrect, row.band] as const),
    } as const;
    expect(variantDisagreements(identical)).toEqual([]);
  });
});
