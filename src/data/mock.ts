/**
 * Mock-exam session data.
 *
 * The operational model — timed practice vs exam-condition sittings, a
 * manifest of stable full-suite mocks, per-question auto-grading with an
 * indicative raw-to-band mapping — is informed by the YYSD IELTS online
 * mock-exam test center (`wanli4473/yysd-testcenter`), an open-source static
 * front end plus Node API whose papers post `{score, total, band}` to the
 * parent frame and look the band up in a threshold table, scaling partial
 * papers to a 40-question paper first. This module re-implements that
 * behaviour as deterministic, citable data: three indicative threshold tables
 * (Listening, Academic Reading, General Training Reading), the
 * computer-delivered timing blueprints and the conduct rules of each mode.
 *
 * The cut scores are indicative: the IELTS partners equate every live test
 * version, so neighbouring Cambridge volumes move individual thresholds by
 * about one raw mark. The tables below follow the widely reproduced
 * Cambridge raw-score conversions (Listening 39+ for band 9, Academic
 * Reading 39+ for band 9, General Training Reading 40 for band 9 with
 * stricter mid-range cuts because the texts are easier) and every response
 * carries that caveat next to the matched row.
 */

import type { MockMode, MockSessionSkill, MockSkill, RawBandThreshold } from '../types.js';

/** Receptive papers with a raw-score conversion. */
export const MOCK_SKILLS: readonly MockSkill[] = ['listening', 'reading-academic', 'reading-general'];

/** Papers and suites a session plan can be built for. */
export const MOCK_SESSION_SKILLS: readonly MockSessionSkill[] = [
  'listening',
  'reading-academic',
  'reading-general',
  'writing',
  'full-suite',
];

/** Session modes: untimed practice or exam conditions. */
export const MOCK_MODES: readonly MockMode[] = ['practice', 'exam'];

/** Number of stable full-suite mocks derived from the practice-test index. */
export const MOCK_SUITE_COUNT = 24;

/** Listening paper of a full suite: 30 minutes of audio plus review. */
export const LISTENING_SUITE_MINUTES = 32;

/** Reading paper of a full suite. */
export const READING_SUITE_MINUTES = 60;

/** Writing paper of a full suite (Task 1: 20, Task 2: 40). */
export const WRITING_SUITE_MINUTES = 60;

/** Listening thresholds: minimum raw score out of 40 per band. */
const LISTENING_ROWS: readonly RawBandThreshold[] = [
  { minRaw: 39, band: 9 },
  { minRaw: 37, band: 8.5 },
  { minRaw: 35, band: 8 },
  { minRaw: 33, band: 7.5 },
  { minRaw: 30, band: 7 },
  { minRaw: 27, band: 6.5 },
  { minRaw: 23, band: 6 },
  { minRaw: 20, band: 5.5 },
  { minRaw: 16, band: 5 },
  { minRaw: 13, band: 4.5 },
  { minRaw: 10, band: 4 },
  { minRaw: 8, band: 3.5 },
  { minRaw: 6, band: 3 },
  { minRaw: 4, band: 2.5 },
  { minRaw: 2, band: 2 },
  { minRaw: 1, band: 1 },
  { minRaw: 0, band: 1 },
];

/** Academic Reading thresholds: minimum raw score out of 40 per band. */
const READING_ACADEMIC_ROWS: readonly RawBandThreshold[] = [
  { minRaw: 39, band: 9 },
  { minRaw: 37, band: 8.5 },
  { minRaw: 35, band: 8 },
  { minRaw: 33, band: 7.5 },
  { minRaw: 30, band: 7 },
  { minRaw: 27, band: 6.5 },
  { minRaw: 23, band: 6 },
  { minRaw: 19, band: 5.5 },
  { minRaw: 15, band: 5 },
  { minRaw: 13, band: 4.5 },
  { minRaw: 10, band: 4 },
  { minRaw: 8, band: 3.5 },
  { minRaw: 6, band: 3 },
  { minRaw: 4, band: 2.5 },
  { minRaw: 3, band: 2 },
  { minRaw: 2, band: 1.5 },
  { minRaw: 1, band: 1 },
  { minRaw: 0, band: 1 },
];

/** General Training Reading thresholds: stricter mid-range cuts. */
const READING_GENERAL_ROWS: readonly RawBandThreshold[] = [
  { minRaw: 40, band: 9 },
  { minRaw: 39, band: 8.5 },
  { minRaw: 37, band: 8 },
  { minRaw: 36, band: 7.5 },
  { minRaw: 34, band: 7 },
  { minRaw: 32, band: 6.5 },
  { minRaw: 30, band: 6 },
  { minRaw: 27, band: 5.5 },
  { minRaw: 23, band: 5 },
  { minRaw: 19, band: 4.5 },
  { minRaw: 15, band: 4 },
  { minRaw: 12, band: 3.5 },
  { minRaw: 9, band: 3 },
  { minRaw: 6, band: 2.5 },
  { minRaw: 4, band: 2 },
  { minRaw: 2, band: 1.5 },
  { minRaw: 1, band: 1 },
  { minRaw: 0, band: 1 },
];

/** One indicative conversion table with its provenance. */
export interface RawBandTable {
  /** Receptive paper the table applies to. */
  skill: MockSkill;
  /** Human-readable paper name. */
  name: string;
  /** Threshold rows, ordered from the highest cut score down. */
  rows: readonly RawBandThreshold[];
  /** Where the cuts were compiled from. */
  source: string;
  /** How the mapping should be interpreted. */
  provenance: 'indicative';
  /** Caveat surfaced in every response that uses this table. */
  note: string;
}

/** Caveat shared by every indicative raw-score table. */
const TABLE_NOTE =
  'Indicative conversion compiled from widely reproduced Cambridge raw-score tables. ' +
  'Live test versions are equated, so individual cut scores move by about one raw mark between ' +
  'volumes; receiving institutions apply their own rules. Band 0 (did not attempt the test) is ' +
  'never produced by a conversion: raw scores below the lowest published cut map to band 1.';

/** Indicative raw-score tables keyed by receptive paper. */
export const RAW_BAND_TABLES: Record<MockSkill, RawBandTable> = {
  listening: {
    skill: 'listening',
    name: 'IELTS Listening raw score to band',
    rows: LISTENING_ROWS,
    source: 'Cambridge IELTS Listening raw-score conversions, as operationalised by open mock-exam software',
    provenance: 'indicative',
    note: TABLE_NOTE,
  },
  'reading-academic': {
    skill: 'reading-academic',
    name: 'IELTS Academic Reading raw score to band',
    rows: READING_ACADEMIC_ROWS,
    source: 'Cambridge IELTS Academic Reading raw-score conversions',
    provenance: 'indicative',
    note: TABLE_NOTE,
  },
  'reading-general': {
    skill: 'reading-general',
    name: 'IELTS General Training Reading raw score to band',
    rows: READING_GENERAL_ROWS,
    source: 'Cambridge IELTS General Training Reading raw-score conversions (stricter cuts)',
    provenance: 'indicative',
    note: TABLE_NOTE,
  },
};

/** On-screen controls of a computer-delivered sitting. */
export const MOCK_CONTROLS: readonly string[] = ['timer', 'notepad', 'help', 'settings', 'finish-section'];

/** Conduct rules shared by every sitting. */
export const MOCK_SHARED_RULES: readonly string[] = [
  'The official timer and on-screen controls run for the whole sitting.',
  'Answer every question: there is no negative marking and blanks score zero.',
  'Spelling and grammar count exactly as on the live test.',
];

/** Conduct rules of untimed practice sittings. */
export const PRACTICE_MODE_RULES: readonly string[] = [
  'Practice mode: work section by section with the timer visible but non-binding.',
  'You may pause, leave and resume later; progress is kept per section.',
  'After submitting, review per-question feedback with explanations where available.',
];

/** Conduct rules of exam-condition sittings. */
export const EXAM_MODE_RULES: readonly string[] = [
  'Exam conditions: complete the paper in one sitting without pausing.',
  'Leaving the page voids the attempt; the full suite runs Listening, then Reading, then Writing in order.',
  'After submitting, receptive papers report raw marks out of 40 with indicative bands; writing is word-counted, not auto-scored.',
];

/** How each paper of a sitting is scored. */
export const MOCK_SCORING: readonly string[] = [
  'Listening and Reading: one raw mark per question, no partial credit, mapped to an indicative band by /v1/mock/raw-to-band.',
  'Writing Task 1: at least 150 words in 20 minutes, assessed against the Writing Task 1 descriptors at /v1/bands/descriptors.',
  'Writing Task 2: at least 250 words in 40 minutes, assessed against the Writing Task 2 descriptors at /v1/bands/descriptors.',
];
