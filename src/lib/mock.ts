/**
 * Deterministic mock-exam helpers.
 *
 * Every helper is a pure function of its inputs, so a mock sitting planned,
 * graded or converted today returns byte-identical results years later. The
 * behaviours mirror the YYSD IELTS online mock-exam test center
 * (`wanli4473/yysd-testcenter`): threshold tables map raw marks to bands,
 * partial papers are scaled to a 40-question paper before the lookup, and
 * full suites run Listening, then Reading, then Writing in order.
 */

import {
  EXAM_MODE_RULES,
  LISTENING_SUITE_MINUTES,
  MOCK_CONTROLS,
  MOCK_SCORING,
  MOCK_SHARED_RULES,
  MOCK_SUITE_COUNT,
  PRACTICE_MODE_RULES,
  RAW_BAND_TABLES,
  READING_SUITE_MINUTES,
  WRITING_SUITE_MINUTES,
} from '../data/mock.js';
import { bandScaleEntry, cefrForBand } from '../data/bands.js';
import { practiceItems } from '../data/practiceTests.js';
import { TASK_TYPES } from '../data/tasks.js';
import { WRITING_TOPICS } from '../data/topics.js';
import { badRequest } from './errors.js';
import { seededIndices } from './rng.js';
import { round2 } from './textstats.js';

import type {
  BandScaleEntry,
  GradeItem,
  GradeResult,
  MockMode,
  MockSessionSkill,
  MockSkill,
  MockSuite,
  RawBandResult,
  RawBandThreshold,
  SessionPlan,
  SessionSection,
} from '../types.js';
import type { PracticeItem } from '../types.js';
import type { TaskType, WritingTopic } from '../types.js';

/** Largest paper the converters and graders accept (a full IELTS paper). */
const FULL_PAPER_QUESTIONS = 40;

/** Compute the published raw-score range a matched row covers. */
function rangeOf(skill: MockSkill, index: number, matched: RawBandThreshold): string {
  const rows = RAW_BAND_TABLES[skill].rows;
  const upper = index === 0 ? FULL_PAPER_QUESTIONS : (rows[index - 1] as RawBandThreshold).minRaw - 1;
  return matched.minRaw >= upper ? String(matched.minRaw) : `${matched.minRaw}–${upper}`;
}

/**
 * Map a raw mark onto its indicative band.
 *
 * @param skill - Receptive paper the conversion applies to.
 * @param raw - Correct answers.
 * @param total - Questions in the paper (partial papers scale to 40).
 * @throws {HttpError} `400` when `raw` or `total` is out of range.
 */
export function rawToBand(skill: MockSkill, raw: number, total: number): RawBandResult {
  if (!Number.isInteger(total) || total < 1 || total > FULL_PAPER_QUESTIONS) {
    throw badRequest(`"total" must be an integer between 1 and ${FULL_PAPER_QUESTIONS}.`, {
      parameter: 'total',
      received: String(total),
    });
  }
  if (!Number.isInteger(raw) || raw < 0 || raw > total) {
    throw badRequest('"raw" must be an integer between 0 and the paper total.', {
      parameter: 'raw',
      received: String(raw),
    });
  }
  const scaledRaw = total === FULL_PAPER_QUESTIONS ? raw : Math.round((raw / total) * FULL_PAPER_QUESTIONS);
  const rows = RAW_BAND_TABLES[skill].rows;
  // Every table bottoms out at `minRaw: 0`, so a row always matches.
  const matched = rows.find((row) => scaledRaw >= row.minRaw) as RawBandThreshold;
  const index = rows.indexOf(matched);
  const scaleEntry = bandScaleEntry(matched.band) as BandScaleEntry;
  return {
    skill,
    raw,
    total,
    scaledRaw,
    band: matched.band,
    level: scaleEntry.label,
    cefr: cefrForBand(matched.band),
    range: rangeOf(skill, index, matched),
  };
}

/**
 * Normalise one answer for comparison.
 *
 * Normalisation is NFC unicode folding, lower-casing, dash unification,
 * whitespace collapsing and the removal of decorative surrounding
 * punctuation — never stemming, article-dropping or fuzzy matching, so a
 * match always means the candidate wrote an accepted form.
 *
 * @param value - Raw answer text.
 */
export function normalizeAnswer(value: string): string {
  return value
    .normalize('NFC')
    .toLowerCase()
    .replace(/[‐‑‒–—―]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^["'“”‘’`´()[\]{}<>]+|["'“”‘’`´()[\]{}<>.,;:!?…]+$/g, '');
}

/** Split a sheet into non-empty `;`-separated entries. */
function sheetEntries(sheet: string): string[] {
  return sheet
    .split(';')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

/** Read and validate the question number of one sheet entry. */
function entryNumber(entry: string, parameter: string): number {
  const colon = entry.indexOf(':');
  const head = (colon < 0 ? entry : entry.slice(0, colon)).trim();
  if (colon < 0 || !/^\d+$/.test(head)) {
    throw badRequest(`Sheet entry "${entry}" must look like "12:answer".`, { parameter });
  }
  const no = Number.parseInt(head, 10);
  if (no < 1 || no > FULL_PAPER_QUESTIONS) {
    throw badRequest(`Question numbers must be between 1 and ${FULL_PAPER_QUESTIONS}.`, {
      parameter,
      received: head,
    });
  }
  return no;
}

/**
 * Parse an answer key of the form `1:answer|alternative;2:answer`.
 *
 * @param sheet - Raw key sheet.
 * @throws {HttpError} `400` when the sheet is empty or malformed.
 */
export function parseKeySheet(sheet: string): Map<number, string[]> {
  const entries = sheetEntries(sheet);
  if (entries.length === 0) {
    throw badRequest('Parameter "key" must contain at least one "<number>:<answer>" entry.', {
      parameter: 'key',
    });
  }
  if (entries.length > FULL_PAPER_QUESTIONS) {
    throw badRequest(`Parameter "key" must contain at most ${FULL_PAPER_QUESTIONS} entries.`, {
      parameter: 'key',
      received: String(entries.length),
    });
  }
  const keyed = new Map<number, string[]>();
  for (const entry of entries) {
    const no = entryNumber(entry, 'key');
    if (keyed.has(no)) {
      throw badRequest(`Key entry for question ${String(no)} is duplicated.`, { parameter: 'key' });
    }
    const alternatives = entry
      .slice(entry.indexOf(':') + 1)
      .split('|')
      .map((alternative) => normalizeAnswer(alternative))
      .filter((alternative) => alternative.length > 0);
    if (alternatives.length === 0) {
      throw badRequest(`Key entry for question ${String(no)} has no accepted answer.`, {
        parameter: 'key',
      });
    }
    keyed.set(no, alternatives);
  }
  return keyed;
}

/**
 * Parse a response sheet of the form `1:answer;2:answer`.
 *
 * Blank sheets grade as all-unanswered; blank answers score zero.
 *
 * @param sheet - Raw response sheet.
 * @throws {HttpError} `400` when the sheet is malformed.
 */
export function parseResponseSheet(sheet: string): Map<number, string> {
  const entries = sheetEntries(sheet);
  if (entries.length > FULL_PAPER_QUESTIONS) {
    throw badRequest(`Parameter "responses" must contain at most ${FULL_PAPER_QUESTIONS} entries.`, {
      parameter: 'responses',
      received: String(entries.length),
    });
  }
  const responses = new Map<number, string>();
  for (const entry of entries) {
    const no = entryNumber(entry, 'responses');
    if (responses.has(no)) {
      throw badRequest(`Response entry for question ${String(no)} is duplicated.`, {
        parameter: 'responses',
      });
    }
    responses.set(no, entry.slice(entry.indexOf(':') + 1).trim());
  }
  return responses;
}

/**
 * Grade a response sheet against an answer key.
 *
 * @param skill - Receptive paper the key belongs to.
 * @param keySheet - Answer key (`1:answer|alternative;2:answer`).
 * @param responseSheet - Candidate responses (`1:answer;2:answer`).
 */
export function gradeResponses(skill: MockSkill, keySheet: string, responseSheet: string): GradeResult {
  const keyed = parseKeySheet(keySheet);
  const responses = parseResponseSheet(responseSheet);
  const numbers = [...keyed.keys()].sort((left, right) => left - right);
  const items: GradeItem[] = [];
  let correct = 0;
  let unanswered = 0;
  for (const no of numbers) {
    const expected = keyed.get(no) as string[];
    const given = responses.get(no);
    if (given === undefined || given.length === 0) {
      unanswered += 1;
      items.push({ no, expected, given: null, correct: false });
    } else {
      const hit = expected.includes(normalizeAnswer(given));
      if (hit) {
        correct += 1;
      }
      items.push({ no, expected, given, correct: hit });
    }
  }
  const conversion = rawToBand(skill, correct, numbers.length);
  return {
    skill,
    total: numbers.length,
    raw: correct,
    scaledRaw: conversion.scaledRaw,
    band: conversion.band,
    level: conversion.level,
    cefr: conversion.cefr,
    accuracy: round2(correct / numbers.length),
    unanswered,
    items,
  };
}

/** Timed blocks of one paper or suite. */
function sectionsFor(skill: MockSessionSkill): SessionSection[] {
  switch (skill) {
    case 'listening':
      return [
        {
          name: 'Listening · Sections 1–4',
          minutes: 30,
          questions: 40,
          minWords: null,
          notes: 'Four recorded sections, 40 questions; answers are entered on screen.',
        },
        {
          name: 'Answer review',
          minutes: 2,
          questions: null,
          minWords: null,
          notes:
            'Computer-delivered review window. On paper, 10 minutes of transfer time are allowed instead.',
        },
      ];
    case 'reading-academic':
      return [
        {
          name: 'Academic Reading · Passages 1–3',
          minutes: 60,
          questions: 40,
          minWords: null,
          notes: 'Three passages of increasing difficulty, 40 questions, no extra transfer time.',
        },
      ];
    case 'reading-general':
      return [
        {
          name: 'General Training Reading · Sections 1–3',
          minutes: 60,
          questions: 40,
          minWords: null,
          notes: 'Short texts, workplace documents and one long passage; 40 questions, no transfer time.',
        },
      ];
    case 'writing':
      return [
        {
          name: 'Writing Task 1',
          minutes: 20,
          questions: null,
          minWords: 150,
          notes:
            'At least 150 words: describe visual information (Academic) or write a letter (General Training).',
        },
        {
          name: 'Writing Task 2',
          minutes: 40,
          questions: null,
          minWords: 250,
          notes: 'At least 250 words in response to the essay prompt; worth twice the Task 1 marks.',
        },
      ];
    case 'full-suite':
      return [
        {
          name: 'Listening · Sections 1–4',
          minutes: 30,
          questions: 40,
          minWords: null,
          notes: 'Four recorded sections, 40 questions; answers are entered on screen.',
        },
        {
          name: 'Answer review',
          minutes: 2,
          questions: null,
          minWords: null,
          notes: 'Two-minute computer-delivered review before the Reading paper starts.',
        },
        {
          name: 'Reading · Passages 1–3',
          minutes: 60,
          questions: 40,
          minWords: null,
          notes: 'Three passages, 40 questions, no extra transfer time.',
        },
        {
          name: 'Writing Task 1',
          minutes: 20,
          questions: null,
          minWords: 150,
          notes: 'At least 150 words.',
        },
        {
          name: 'Writing Task 2',
          minutes: 40,
          questions: null,
          minWords: 250,
          notes: 'At least 250 words; worth twice the Task 1 marks.',
        },
      ];
  }
}

/**
 * Build the timing blueprint of a computer-delivered sitting.
 *
 * @param skill - Paper or suite the plan covers.
 * @param mode - Practice (pausable, reviewable) or exam conditions.
 */
export function buildSessionPlan(skill: MockSessionSkill, mode: MockMode): SessionPlan {
  const sections = sectionsFor(skill);
  const totalMinutes = sections.reduce((sum, section) => sum + section.minutes, 0);
  return {
    skill,
    mode,
    delivery: 'computer',
    totalMinutes,
    sections,
    controls: [...MOCK_CONTROLS],
    rules: [...MOCK_SHARED_RULES, ...(mode === 'practice' ? PRACTICE_MODE_RULES : EXAM_MODE_RULES)],
    scoring: [...MOCK_SCORING],
  };
}

/** Stable identifier of suite `n` (`mock-001`). */
export function mockSuiteId(n: number): string {
  return `mock-${String(n).padStart(3, '0')}`;
}

/**
 * Build one stable full-suite mock from the practice-test index.
 *
 * Listening and reading papers rotate through their collections while the
 * writing tasks are drawn deterministically from the task banks, so every
 * suite is stable across processes, machines and releases.
 *
 * @param n - Suite number, 1-based.
 * @throws {HttpError} `400` when `n` is outside the catalogue.
 */
export function buildMockSuite(n: number): MockSuite {
  if (!Number.isInteger(n) || n < 1 || n > MOCK_SUITE_COUNT) {
    throw badRequest(`"n" must be an integer between 1 and ${String(MOCK_SUITE_COUNT)}.`, {
      parameter: 'n',
      received: String(n),
    });
  }
  const listeningPool = practiceItems().filter(
    (item: PracticeItem) => item.collection === 'listening-full-test',
  );
  const readingPool = practiceItems().filter((item: PracticeItem) => item.collection === 'reading-full-test');
  const listeningItem = listeningPool[(n - 1) % listeningPool.length] as PracticeItem;
  const readingItem = readingPool[(n - 1) % readingPool.length] as PracticeItem;
  const task1Pool = TASK_TYPES.filter((task: TaskType) => task.module === 'academic');
  const task1 = task1Pool[
    seededIndices(`mock-suite-${String(n)}-task1`, task1Pool.length, 1)[0] as number
  ] as TaskType;
  const prompt = WRITING_TOPICS[
    seededIndices(`mock-suite-${String(n)}-task2`, WRITING_TOPICS.length, 1)[0] as number
  ] as WritingTopic;
  return {
    id: mockSuiteId(n),
    n,
    title: `Full-suite mock ${mockSuiteId(n)}`,
    listening: { id: listeningItem.id, title: listeningItem.title, questions: listeningItem.questions },
    reading: { id: readingItem.id, title: readingItem.title, questions: readingItem.questions },
    writing: {
      task1: { familyId: task1.id, family: task1.name, minutes: 20, minWords: 150 },
      task2: {
        promptId: prompt.id,
        category: prompt.category,
        questionType: prompt.questionType,
        minutes: 40,
        minWords: 250,
      },
    },
    totalMinutes: LISTENING_SUITE_MINUTES + READING_SUITE_MINUTES + WRITING_SUITE_MINUTES,
  };
}

/** Every stable full-suite mock in catalogue order. */
export function mockSuites(): MockSuite[] {
  return Array.from({ length: MOCK_SUITE_COUNT }, (_unused, index) => buildMockSuite(index + 1));
}

/**
 * Look up one suite by identifier (case-insensitive, `mock-001`).
 *
 * @param id - Candidate identifier.
 */
export function findMockSuite(id: string): MockSuite | undefined {
  const match = /^mock-(\d{1,3})$/i.exec(id.trim());
  if (match?.[1] === undefined) {
    return undefined;
  }
  const n = Number.parseInt(match[1], 10);
  if (!Number.isInteger(n) || n < 1 || n > MOCK_SUITE_COUNT) {
    return undefined;
  }
  return buildMockSuite(n);
}
