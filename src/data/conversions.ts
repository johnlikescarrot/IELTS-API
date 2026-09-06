/**
 * IELTS score concordances.
 *
 * Test providers publish their own comparison tables; universities apply their
 * own, stricter rules. Every table below is therefore exposed as an
 * **indicative concordance**, carries the provider it is compiled from, and
 * should not be used as an admissions decision rule. Values are reproduced
 * from the providers' publicly published comparison tables.
 */

import type { ConversionEntry, ConversionTarget } from '../types.js';

/** A concordance table for one target scale. */
export interface ConversionTable {
  /** Target scale identifier. */
  target: ConversionTarget;
  /** Human-readable name of the target scale. */
  name: string;
  /** Organisation that publishes the target scale. */
  provider: string;
  /** Public URL documenting the comparison. */
  sourceUrl: string;
  /** Unit of the target scale values. */
  unit: string;
  /** How the mapping should be interpreted. */
  provenance: 'indicative' | 'published-concordance';
  /** Caveat surfaced in every response that uses this table. */
  note: string;
  /** Rows, ordered by IELTS band. */
  entries: readonly ConversionEntry[];
}

/** Build range entries from `[band, min, max]` triples. */
function ranges(triples: readonly (readonly [number, number, number])[]): ConversionEntry[] {
  return triples.map(([band, min, max]) => ({
    band,
    value: [min, max],
    display: `${min}–${max}`,
  }));
}

/** Build level entries from `[band, level]` pairs. */
function levels(pairs: readonly (readonly [number, string])[]): ConversionEntry[] {
  return pairs.map(([band, level]) => ({ band, value: level, display: level }));
}

/** CEFR concordance compiled from the IELTS partners' published mapping. */
const CEFR = levels([
  [4.0, 'B1'],
  [4.5, 'B1'],
  [5.0, 'B2'],
  [5.5, 'B2'],
  [6.0, 'B2'],
  [6.5, 'B2'],
  [7.0, 'C1'],
  [7.5, 'C1'],
  [8.0, 'C1'],
  [8.5, 'C2'],
  [9.0, 'C2'],
]);

/** TOEFL iBT comparison table published by ETS. */
const TOEFL_IBT = ranges([
  [4.0, 0, 31],
  [4.5, 32, 34],
  [5.0, 35, 45],
  [5.5, 46, 59],
  [6.0, 60, 78],
  [6.5, 79, 93],
  [7.0, 94, 101],
  [7.5, 102, 109],
  [8.0, 110, 114],
  [8.5, 115, 117],
  [9.0, 118, 120],
]);

/** Cambridge English Scale comparison published by Cambridge Assessment English. */
const CAMBRIDGE = ranges([
  [4.0, 140, 159],
  [4.5, 160, 169],
  [5.0, 170, 175],
  [5.5, 176, 179],
  [6.0, 180, 184],
  [6.5, 185, 189],
  [7.0, 190, 199],
  [7.5, 200, 209],
  [8.0, 210, 219],
  [8.5, 220, 230],
  [9.0, 220, 230],
]);

/** PTE Academic comparison published by Pearson. */
const PTE = ranges([
  [4.0, 30, 35],
  [4.5, 36, 42],
  [5.0, 43, 50],
  [5.5, 51, 58],
  [6.0, 59, 67],
  [6.5, 68, 75],
  [7.0, 76, 78],
  [7.5, 79, 82],
  [8.0, 83, 85],
  [8.5, 86, 88],
  [9.0, 89, 90],
]);

/** Duolingo English Test comparison published by Duolingo. */
const DUOLINGO = ranges([
  [4.0, 65, 75],
  [4.5, 75, 85],
  [5.0, 85, 95],
  [5.5, 95, 105],
  [6.0, 105, 115],
  [6.5, 115, 125],
  [7.0, 125, 135],
  [7.5, 135, 145],
  [8.0, 145, 155],
  [8.5, 155, 160],
  [9.0, 160, 170],
]);

/**
 * Raw-mark to band tables for the receptive papers, compiled from the marking
 * guides published inside the Cambridge IELTS volumes. The exact cut-offs
 * vary slightly from volume to volume, so these rows are indicative: they
 * publish the ranges that recur across the printed guides.
 */
const LISTENING_RAW = ranges([
  [2.5, 4, 5],
  [3.0, 6, 7],
  [3.5, 8, 9],
  [4.0, 10, 12],
  [4.5, 13, 15],
  [5.0, 16, 17],
  [5.5, 18, 22],
  [6.0, 23, 25],
  [6.5, 26, 29],
  [7.0, 30, 31],
  [7.5, 32, 34],
  [8.0, 35, 36],
  [8.5, 37, 38],
  [9.0, 39, 40],
]);

/** Raw-mark table for the Academic Reading paper (40 questions). */
const ACADEMIC_READING_RAW = ranges([
  [2.5, 4, 5],
  [3.0, 6, 7],
  [3.5, 8, 9],
  [4.0, 10, 12],
  [4.5, 13, 14],
  [5.0, 15, 18],
  [5.5, 19, 22],
  [6.0, 23, 26],
  [6.5, 27, 29],
  [7.0, 30, 32],
  [7.5, 33, 34],
  [8.0, 35, 36],
  [8.5, 37, 38],
  [9.0, 39, 40],
]);

/** Raw-mark table for the General Training Reading paper (40 questions). */
const GENERAL_TRAINING_READING_RAW = ranges([
  [2.5, 6, 8],
  [3.0, 9, 11],
  [3.5, 12, 14],
  [4.0, 15, 18],
  [4.5, 19, 22],
  [5.0, 23, 26],
  [5.5, 27, 29],
  [6.0, 30, 31],
  [6.5, 32, 33],
  [7.0, 34, 35],
  [7.5, 36, 36],
  [8.0, 37, 38],
  [8.5, 39, 39],
  [9.0, 40, 40],
]);

const CONCORDANCE_NOTE =
  'Indicative concordance compiled from the providers’ own published comparison tables. Receiving institutions apply their own rules; always verify against the current published table.';

const RAW_MARK_NOTE =
  'Indicative cut-offs compiled from the marking guides printed inside the Cambridge IELTS volumes; exact cut-offs vary slightly between volumes. The Listening and Reading papers each carry 40 raw marks.';

/** All concordance tables keyed by target scale. */
export const CONVERSION_TABLES: Record<ConversionTarget, ConversionTable> = {
  cefr: {
    target: 'cefr',
    name: 'Common European Framework of Reference for Languages',
    provider: 'Council of Europe / IELTS partners',
    sourceUrl: 'https://www.coe.int/en/web/common-european-framework-reference-languages',
    unit: 'CEFR level',
    provenance: 'published-concordance',
    note: CONCORDANCE_NOTE,
    entries: CEFR,
  },
  'toefl-ibt': {
    target: 'toefl-ibt',
    name: 'TOEFL iBT total score',
    provider: 'ETS',
    sourceUrl: 'https://www.ets.org/toefl/score-users/scoring/concordance.html',
    unit: 'TOEFL iBT points',
    provenance: 'indicative',
    note: CONCORDANCE_NOTE,
    entries: TOEFL_IBT,
  },
  'cambridge-english-scale': {
    target: 'cambridge-english-scale',
    name: 'Cambridge English Scale',
    provider: 'Cambridge Assessment English',
    sourceUrl: 'https://www.cambridgeenglish.org/exams-and-tests/cefr/',
    unit: 'Cambridge English Scale points',
    provenance: 'indicative',
    note: CONCORDANCE_NOTE,
    entries: CAMBRIDGE,
  },
  'pte-academic': {
    target: 'pte-academic',
    name: 'PTE Academic overall score',
    provider: 'Pearson',
    sourceUrl: 'https://www.pearsonpte.com/scores-understand-your-scores',
    unit: 'PTE Academic points',
    provenance: 'indicative',
    note: CONCORDANCE_NOTE,
    entries: PTE,
  },
  duolingo: {
    target: 'duolingo',
    name: 'Duolingo English Test overall score',
    provider: 'Duolingo',
    sourceUrl: 'https://duolingo-english-test.zendesk.com/hc/en-us/articles/4402012454925',
    unit: 'DET points',
    provenance: 'indicative',
    note: CONCORDANCE_NOTE,
    entries: DUOLINGO,
  },
  'listening-raw': {
    target: 'listening-raw',
    name: 'IELTS Listening raw marks',
    provider: 'Cambridge IELTS marking guides',
    sourceUrl: 'https://ielts.org/take-a-test/how-ielts-is-scored',
    unit: 'raw marks out of 40',
    provenance: 'indicative',
    note: RAW_MARK_NOTE,
    entries: LISTENING_RAW,
  },
  'academic-reading-raw': {
    target: 'academic-reading-raw',
    name: 'IELTS Academic Reading raw marks',
    provider: 'Cambridge IELTS marking guides',
    sourceUrl: 'https://ielts.org/take-a-test/how-ielts-is-scored',
    unit: 'raw marks out of 40',
    provenance: 'indicative',
    note: RAW_MARK_NOTE,
    entries: ACADEMIC_READING_RAW,
  },
  'general-training-reading-raw': {
    target: 'general-training-reading-raw',
    name: 'IELTS General Training Reading raw marks',
    provider: 'Cambridge IELTS marking guides',
    sourceUrl: 'https://ielts.org/take-a-test/how-ielts-is-scored',
    unit: 'raw marks out of 40',
    provenance: 'indicative',
    note: RAW_MARK_NOTE,
    entries: GENERAL_TRAINING_READING_RAW,
  },
};

/** Identifiers of every supported target scale. */
export const CONVERSION_TARGETS: readonly ConversionTarget[] = Object.keys(
  CONVERSION_TABLES,
) as ConversionTarget[];

/**
 * Look up a band score in a concordance table.
 *
 * @param target - Target scale.
 * @param band - IELTS band score (half bands supported).
 * @returns The matching row, or `undefined` when the band is below the table's floor.
 */
export function convertBand(target: ConversionTarget, band: number): ConversionEntry | undefined {
  return CONVERSION_TABLES[target].entries.find((entry) => entry.band === band);
}
