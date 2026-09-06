/**
 * The test-day rulebook for the mock exam centre.
 *
 * Section order, durations, question counts, transfer and check times, and
 * word minimums follow the published IELTS Academic and General Training
 * formats as documented by the IELTS partners; every sentence here is an
 * original summary written for this project, and the module deliberately
 * avoids details that vary by centre (room layout, document rules beyond
 * identification). A mock centre — the model is the open
 * `wanli4473/yysd-testcenter` site — needs exactly this row per
 * module-and-delivery combination to time an exam viewer and print an
 * instruction sheet; `/v1/exam/config` publishes it, `/v1/exam/schedule`
 * turns it into a countdown timeline.
 */

import type { ExamDelivery, ExamModule, ExamSectionInfo, ExamTestDayConfig } from '../types.js';

/** Examination papers covered by the rulebook. */
export const EXAM_MODULES: readonly ExamModule[] = ['academic', 'general-training'];

/** Delivery modes covered by the rulebook. */
export const EXAM_DELIVERIES: readonly ExamDelivery[] = ['paper', 'computer'];

/** Provenance and caveats attached to every rulebook row. */
export const EXAM_FORMAT_PROVENANCE =
  'Durations, section order, question counts and word minimums follow the published IELTS formats as ' +
  'documented by the IELTS partners (British Council, IDP: IELTS Australia and Cambridge Assessment ' +
  'English) around 2025-2026; the wording is original to this API. Centres may differ on ancillary ' +
  'rules, so treat this as a mock-exam convention, not a legal copy of the real test day.';

const LISTENING_PARTS: readonly string[] = [
  'Part 1 — a conversation between two people set in an everyday social context.',
  'Part 2 — a monologue set in an everyday social context.',
  'Part 3 — a conversation among up to four people in an educational or training context.',
  'Part 4 — a monologue on an academic subject.',
];

const LISTENING_RULES: Record<ExamDelivery, readonly string[]> = {
  paper: [
    'Every recording is played once and only once.',
    'Write answers on the question paper while listening; spelling and grammar must match the recording.',
    'Ten minutes at the end are reserved for transferring answers to the answer sheet — use them.',
  ],
  computer: [
    'Every recording is played once and only once.',
    'Type answers directly into the numbered fields as you listen.',
    'Two minutes are given after the last recording to check answers; no separate transfer time exists.',
  ],
};

const READING_FORMAT: Record<ExamModule, readonly string[]> = {
  academic: [
    'Three long passages, roughly 950 words each, increasing in difficulty.',
    'Texts are adapted from books, journals, magazines and newspapers written for a general academic readership.',
    '40 questions drawn from the full canonical question-type taxonomy.',
  ],
  'general-training': [
    'Section 1 — two or three short, factual texts from everyday life (notices, advertisements, schedules).',
    'Section 2 — two short workplace-oriented texts (job descriptions, staff policies, contracts).',
    'Section 3 — one longer, more complex passage of general descriptive or analytical text.',
    '40 questions in total; the paper is timed within the hour with no transfer time.',
  ],
};

const READING_RULES: readonly string[] = [
  'The full hour is the candidate’s to divide across the three passages.',
  'No extra transfer time is given at the end of the paper.',
  'Answers must be written using the words found in the text wherever the question demands it.',
];

const WRITING_TASK1: Record<ExamModule, readonly string[]> = {
  academic: [
    'Task 1 (about 20 minutes, at least 150 words) — describe, summarise or explain visual information: a ' +
      'graph, table, chart, diagram, map or process.',
    'Task 2 (about 40 minutes, at least 250 words) — a discursive essay responding to a point of view, ' +
      'argument or problem.',
  ],
  'general-training': [
    'Task 1 (about 20 minutes, at least 150 words) — write a letter, formal, semi-formal or informal, in ' +
      'response to a situation.',
    'Task 2 (about 40 minutes, at least 250 words) — a discursive essay responding to a point of view or ' +
      'general topic.',
  ],
};

const WRITING_RULES: readonly string[] = [
  'Task 2 carries twice the weight of Task 1, so finish Task 1 inside its suggested 20 minutes.',
  'Writing under the word minimum is penalised; there is no upper word limit.',
  'Both tasks are marked against the published analytic band descriptors.',
];

const SPEAKING_PARTS: readonly string[] = [
  'Part 1 (4-5 minutes) — introduction and interview on familiar topics.',
  'Part 2 (3-4 minutes) — a long turn: one minute of preparation, up to two minutes of speech.',
  'Part 3 (4-5 minutes) — a two-way discussion extending the Part 2 topic.',
];

const SPEAKING_RULES: readonly string[] = [
  'The test is a live, recorded interview with one examiner.',
  'It can be scheduled up to seven days before or after the written papers.',
  'There is no preparation time beyond the one minute of Part 2.',
];

const TEST_DAY_RULES: readonly string[] = [
  'The Listening, Reading and Writing papers are taken in one sitting with no scheduled break between them.',
  'Candidates are admitted after identity checks against the travel document used at registration.',
  'Electronic devices are not permitted in the test room.',
];

/** Extra time granted after Listening for one delivery mode, with its name. */
export function listeningAfter(delivery: ExamDelivery): { minutes: number; label: string } {
  return delivery === 'paper' ? { minutes: 10, label: 'transfer time' } : { minutes: 2, label: 'check time' };
}

/** Build the Listening section row for one delivery mode. */
function listeningSection(delivery: ExamDelivery): ExamSectionInfo {
  const after = listeningAfter(delivery);
  return {
    id: 'listening',
    name: 'Listening',
    skill: 'listening',
    durationMinutes: 30,
    timingLabel: `About 30 minutes plus ${after.minutes} minutes ${after.label}`,
    questions: 40,
    format: [...LISTENING_PARTS],
    rules: [...LISTENING_RULES[delivery]],
    afterMinutes: after.minutes,
    afterLabel: after.label,
  };
}

/** Build the Reading section row for one examination paper. */
function readingSection(module: ExamModule): ExamSectionInfo {
  return {
    id: 'reading',
    name: 'Reading',
    skill: 'reading',
    durationMinutes: 60,
    timingLabel: '60 minutes, no separate transfer time',
    questions: 40,
    format: [...READING_FORMAT[module]],
    rules: [...READING_RULES],
    afterMinutes: 0,
    afterLabel: null,
  };
}

/** Build the Writing section row for one examination paper. */
function writingSection(module: ExamModule): ExamSectionInfo {
  return {
    id: 'writing',
    name: 'Writing',
    skill: 'writing',
    durationMinutes: 60,
    timingLabel: '60 minutes (Task 1: ~20, Task 2: ~40)',
    questions: 2,
    format: [...WRITING_TASK1[module]],
    rules: [...WRITING_RULES],
    afterMinutes: 0,
    afterLabel: null,
  };
}

/** Build the Speaking section row; it is held separately from the sitting. */
function speakingSection(): ExamSectionInfo {
  return {
    id: 'speaking',
    name: 'Speaking',
    skill: 'speaking',
    durationMinutes: 14,
    timingLabel: '11-14 minutes',
    questions: null,
    format: [...SPEAKING_PARTS],
    rules: [...SPEAKING_RULES],
    afterMinutes: 0,
    afterLabel: null,
  };
}

/**
 * The rulebook row for one module and delivery mode.
 *
 * @param module - Examination paper.
 * @param delivery - Delivery mode.
 */
export function examTestDayConfig(module: ExamModule, delivery: ExamDelivery): ExamTestDayConfig {
  const sections: ExamSectionInfo[] = [
    listeningSection(delivery),
    readingSection(module),
    writingSection(module),
    speakingSection(),
  ];
  const sittingMinutes = sections
    .filter((section) => section.id !== 'speaking')
    .reduce((total, section) => total + section.durationMinutes + section.afterMinutes, 0);
  return {
    module,
    delivery,
    label: `${module === 'academic' ? 'Academic' : 'General Training'} — ${
      delivery === 'paper' ? 'paper-based' : 'on computer'
    }`,
    sittingMinutes,
    sections,
    testDayRules: [...TEST_DAY_RULES],
    provenance: EXAM_FORMAT_PROVENANCE,
  };
}

/** Every rulebook row: each examination paper under each delivery mode. */
export const EXAM_TEST_DAYS: readonly ExamTestDayConfig[] = EXAM_MODULES.flatMap((module) =>
  EXAM_DELIVERIES.map((delivery) => examTestDayConfig(module, delivery)),
);
