/**
 * The official IELTS test format.
 *
 * Every constant in this module reproduces the test structure published by the
 * IELTS partners (paper counts, section contexts, timings and word minimums).
 * The mock-exam center composes these constants with the API's own datasets:
 * the constants say what a paper *is*, the datasets say what goes *in* it.
 *
 * Paper identifiers are addressable and self-describing: a paper id encodes
 * the module and the canonical seed, so `/v1/exams/papers/:id` can re-derive
 * any paper without storing it.
 */

import { hashString } from '../lib/rng.js';

import type { ExamModule } from '../types.js';

/** The two IELTS test modules. */
export const EXAM_MODULE_IDS: readonly ExamModule[] = ['academic', 'general-training'];

/** How the two modules differ. */
export const EXAM_MODULES: readonly {
  id: ExamModule;
  name: string;
  reading: string;
  writingTask1: string;
}[] = [
  {
    id: 'academic',
    name: 'Academic',
    reading:
      'Three long texts taken from books, journals, magazines and newspapers; at least one develops a detailed logical argument.',
    writingTask1:
      'Describe, summarise or explain visual information (a graph, chart, table, process or map) in at least 150 words.',
  },
  {
    id: 'general-training',
    name: 'General Training',
    reading:
      'Section 1: everyday notices and advertisements; Section 2: work-related documents; Section 3: a longer text of general interest.',
    writingTask1:
      'Write a letter (formal, semi-formal or informal) of at least 150 words responding to a given situation.',
  },
];

/** The four papers of the test, in the order they are sat. */
export const EXAM_PAPERS: readonly {
  skill: 'listening' | 'reading' | 'writing' | 'speaking';
  name: string;
  parts: number;
  questions: number | null;
  minutes: number | null;
  description: string;
}[] = [
  {
    skill: 'listening',
    name: 'Listening',
    parts: 4,
    questions: 40,
    minutes: 40,
    description:
      'Four recorded sections of increasing difficulty: 30 minutes of audio plus a 10-minute answer-transfer window in the paper-based test.',
  },
  {
    skill: 'reading',
    name: 'Reading',
    parts: 3,
    questions: 40,
    minutes: 60,
    description: 'Three long texts with 40 questions; no extra transfer time is given.',
  },
  {
    skill: 'writing',
    name: 'Writing',
    parts: 2,
    questions: null,
    minutes: 60,
    description: 'Task 1 (at least 150 words, 20 minutes) and Task 2 (at least 250 words, 40 minutes).',
  },
  {
    skill: 'speaking',
    name: 'Speaking',
    parts: 3,
    questions: null,
    minutes: null,
    description: 'A face-to-face interview of 11 to 14 minutes in three parts, assessed separately.',
  },
];

/** Total timed minutes of the written papers (paper-based, no breaks). */
export const WRITTEN_TOTAL_MINUTES = 160;

/** Official structure of the four Listening sections, in playback order. */
export const LISTENING_SECTIONS: readonly {
  section: number;
  format: 'conversation' | 'monologue';
  context: string;
  questions: number;
}[] = [
  {
    section: 1,
    format: 'conversation',
    context: 'A conversation in an everyday social context (two speakers).',
    questions: 10,
  },
  {
    section: 2,
    format: 'monologue',
    context: 'A monologue set in an everyday social context (one speaker).',
    questions: 10,
  },
  {
    section: 3,
    format: 'conversation',
    context: 'A conversation in an academic or training context (up to four speakers).',
    questions: 10,
  },
  {
    section: 4,
    format: 'monologue',
    context: 'A monologue on an academic subject (one speaker, a lecture).',
    questions: 10,
  },
];

/** Official structure of the three Speaking parts, in interview order. */
export const SPEAKING_PARTS: readonly [
  { part: number; name: string; minutes: string; description: string },
  { part: number; name: string; minutes: string; description: string },
  { part: number; name: string; minutes: string; description: string },
] = [
  {
    part: 1,
    name: 'Introduction and interview',
    minutes: '4-5',
    description:
      'The examiner asks the candidate about familiar topics: home, family, work, studies and interests.',
  },
  {
    part: 2,
    name: 'Long turn',
    minutes: '3-4',
    description:
      'The candidate receives a cue card, prepares for one minute, speaks for one to two minutes and answers one or two rounding-off questions.',
  },
  {
    part: 3,
    name: 'Discussion',
    minutes: '4-5',
    description:
      'The examiner invites a two-way discussion of more abstract ideas and issues connected to the Part 2 topic.',
  },
];

/** How the two Writing tasks are weighted. */
export const WRITING_WEIGHTING = 'Task 2 contributes twice as much as Task 1 to the Writing band.';

/** Timed schedule of the written papers, without breaks between them. */
export const WRITTEN_SCHEDULE: readonly { at: number; paper: string; minutes: number; event: string }[] = [
  {
    at: 0,
    paper: 'listening',
    minutes: 40,
    event: 'Listening: 30 minutes of audio, then 10 minutes to transfer answers.',
  },
  { at: 40, paper: 'reading', minutes: 60, event: 'Reading: three texts, 40 questions.' },
  { at: 100, paper: 'writing', minutes: 60, event: 'Writing: Task 1 (20 minutes), Task 2 (40 minutes).' },
];

/** How the computer-based delivery differs. */
export const COMPUTER_BASED_NOTE =
  'In the computer-based test the Listening paper lasts about 30 minutes with no separate transfer window, so the written papers total about 150 minutes.';

/** How the Speaking test is scheduled. */
export const SPEAKING_SCHEDULE_NOTE =
  'The Speaking test is administered separately, within seven days before or after the written papers.';

/** Maximum accepted length of a caller-supplied seed. */
export const MAX_SEED_LENGTH = 64;

/**
 * Canonicalise a caller-supplied seed.
 *
 * Papers and drills are built from an eight-digit hexadecimal seed so that the
 * seed fits inside the addressable paper id. Two different seed strings can
 * canonically collide, but one canonical seed always builds one paper.
 *
 * @param seed - Caller-supplied seed (1-64 characters).
 * @returns Eight lowercase hexadecimal digits.
 */
export function canonicalSeed(seed: string): string {
  return hashString(seed).toString(16).padStart(8, '0');
}

/**
 * Build the addressable identifier of a mock-exam paper.
 *
 * @param module - Test module.
 * @param seed - Canonical seed (eight lowercase hexadecimal digits).
 */
export function paperId(module: ExamModule, seed: string): string {
  return `mock-${module}-${seed}`;
}

/**
 * Decode a paper identifier back into its module and canonical seed.
 *
 * @param id - Candidate paper identifier.
 * @returns The module and seed, or `undefined` when the identifier is not a
 *   well-formed paper id.
 */
export function decodePaperId(id: string): { module: ExamModule; seed: string } | undefined {
  const match = /^mock-(academic|general-training)-([0-9a-f]{8})$/.exec(id);
  if (match === null) {
    return undefined;
  }
  return { module: match[1] as ExamModule, seed: match[2] as string };
}
