/**
 * Exam-center routes (`/v1/exams`).
 *
 * The exam center composes the published datasets into deterministic,
 * addressable mock-exam papers: the same paper can be re-derived from its
 * identifier on any replica, and every content pointer references a dataset
 * the API already serves. A companion vocabulary drill applies the same
 * contract to self-testing.
 */

import {
  EXAM_MODULES,
  EXAM_MODULE_IDS,
  EXAM_PAPERS,
  LISTENING_SECTIONS,
  MAX_SEED_LENGTH,
  SPEAKING_PARTS,
  WRITING_WEIGHTING,
  WRITTEN_SCHEDULE,
  WRITTEN_TOTAL_MINUTES,
  canonicalSeed,
  decodePaperId,
  paperId,
} from '../data/exams.js';
import { allEntries, PARTS_OF_SPEECH } from '../data/vocabulary.js';
import { practiceItems } from '../data/practiceTests.js';
import { archiveVolumes } from '../data/archive.js';
import { SPEAKING_TOPICS, WRITING_TOPICS } from '../data/topics.js';
import { TASK_TYPES } from '../data/tasks.js';
import { EXAM_THEMES } from '../data/themes.js';
import { badRequest, notFound } from '../lib/errors.js';
import { getBoolean, getEnum, getInt, getString, toParams } from '../lib/query.js';
import { buildExamPaper, buildVocabularyDrill } from '../lib/exam.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';
import type { ExamModule } from '../types.js';

/** Read and validate the module parameter (defaults to Academic). */
function moduleParam(params: ReturnType<typeof toParams>): ExamModule {
  return getEnum(params, 'module', EXAM_MODULE_IDS) ?? 'academic';
}

/** Read and validate the seed parameter (defaults to today's ISO date). */
function seedParam(params: ReturnType<typeof toParams>): string {
  const seed = getString(params, 'seed') ?? new Date().toISOString().slice(0, 10);
  if (seed.length > MAX_SEED_LENGTH) {
    throw badRequest(`Parameter "seed" must be at most ${MAX_SEED_LENGTH} characters.`, {
      parameter: 'seed',
      received: `${seed.length} characters`,
      max: String(MAX_SEED_LENGTH),
    });
  }
  return seed;
}

/** Read the optional volume filter (a Cambridge IELTS volume, 1-22). */
function volumeParam(params: ReturnType<typeof toParams>): number | undefined {
  const raw = getString(params, 'volume');
  if (raw === undefined) {
    return undefined;
  }
  if (!/^\d+$/.test(raw)) {
    throw badRequest('Parameter "volume" must be an integer between 1 and 22.', {
      parameter: 'volume',
      received: raw,
    });
  }
  const volume = Number.parseInt(raw, 10);
  if (volume < 1 || volume > 22) {
    throw badRequest('Parameter "volume" must be between 1 and 22.', {
      parameter: 'volume',
      received: raw,
      min: '1',
      max: '22',
    });
  }
  return volume;
}

/** The exam-form catalogue and assembly contract. */
function catalogue(): HandlerResult {
  const listeningTests = practiceItems().filter((item) => item.collection === 'listening-full-test');
  const readingTests = practiceItems().filter((item) => item.collection === 'reading-full-test');
  return {
    data: {
      name: 'IELTS mock exam center',
      format: {
        papers: EXAM_PAPERS,
        writtenTotalMinutes: WRITTEN_TOTAL_MINUTES,
        writtenSchedule: WRITTEN_SCHEDULE,
        listeningSections: LISTENING_SECTIONS,
        speakingParts: SPEAKING_PARTS,
        writingWeighting: WRITING_WEIGHTING,
      },
      modules: EXAM_MODULES,
      assembly: {
        method:
          'A paper is a pure function of its module and canonical seed: the Listening paper draws a full listening test and an official Cambridge audio set, the Academic Reading paper draws a full reading test, and the Writing and Speaking papers draw their prompts from the task banks.',
        pools: {
          listeningTests: listeningTests.length,
          readingTests: readingTests.length,
          task1Families: TASK_TYPES.length,
          task2Prompts: WRITING_TOPICS.length,
          part1Sets: SPEAKING_TOPICS.filter((topic) => topic.part === 1).length,
          part2CueCards: SPEAKING_TOPICS.filter((topic) => topic.part === 2).length,
          part3Topics: SPEAKING_TOPICS.filter((topic) => topic.part === 3).length,
          themes: EXAM_THEMES.length,
          audioVolumes: archiveVolumes().filter((volume) => volume.testNumbers !== null).length,
        },
        contentPolicy:
          'Papers are plans, not content: every item is a pointer into a published, derived dataset, and no upstream material is redistributed.',
      },
      marking: {
        method: 'Raw marks out of 40 convert to bands through the indicative Cambridge marking-guide tables.',
        listening: '/v1/scores/interpret?scale=listening-raw&score=30',
        academicReading: '/v1/scores/interpret?scale=academic-reading-raw&score=30',
        generalTrainingReading: '/v1/scores/interpret?scale=general-training-reading-raw&score=30',
        overall: '/v1/scores/overall?listening=6.5&reading=6&writing=5.5&speaking=6',
      },
      drill: {
        path: '/v1/exams/drill/vocabulary',
        parameters: 'size (1-50, default 10), seed, volume (1-22), pos, key (show or hide).',
      },
    },
    meta: {
      paperOfTheDay: `Omitting the seed builds today's paper: /v1/exams/blueprint?module=academic.`,
      reproducibility: `Papers are addressable: /v1/exams/papers/${paperId('academic', canonicalSeed('2026-09-05'))} re-derives the 2026-09-05 Academic paper from its id alone.`,
    },
  };
}

/** Assemble a mock-exam paper. */
function blueprint(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const module = moduleParam(params);
  const seed = canonicalSeed(seedParam(params));
  return {
    data: buildExamPaper({ module, seed }),
    meta: {
      method:
        'The paper composes the official test format with seeded draws from the practice-test, archive, topic and task datasets; identical module and seed always rebuild the same paper.',
      seed,
      marking: 'The marking links carry worked examples: replace the score with your raw marks out of 40.',
    },
  };
}

/** Re-derive a paper from its addressable identifier. */
function paper(context: RouteContext): HandlerResult {
  // The router guarantees the parameter exists on a matched route.
  const id = context.params['paperId'] as string;
  const decoded = decodePaperId(id);
  if (decoded === undefined) {
    throw notFound(`No mock exam paper matches ${id}.`, {
      paperId: id,
      expected: 'mock-{module}-{seed}, e.g. mock-academic-3fa2c81d',
      endpoint: '/v1/exams/blueprint',
    });
  }
  return {
    data: buildExamPaper({ module: decoded.module, seed: decoded.seed }),
    meta: {
      method:
        'The identifier encodes the module and the canonical seed, so the paper is re-derived, never stored.',
      seed: decoded.seed,
    },
  };
}

/** Build a vocabulary drill. */
function drill(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const seed = canonicalSeed(seedParam(params));
  return {
    data: buildVocabularyDrill({
      seed,
      size: getInt(params, 'size', 1, 50, 10),
      volume: volumeParam(params),
      pos: getEnum(params, 'pos', PARTS_OF_SPEECH),
      includeKey: getBoolean(params, 'key', true),
      entries: allEntries(),
    }),
    meta: {
      method:
        'Each item tests one Cambridge headword against its published definition and three distractor definitions from other headwords, drawn deterministically from the seed.',
      seed,
      key: 'Omit ?key=false to keep the answer key; the key maps every item id to the correct letter.',
    },
  };
}

/** Exam-center routes. */
export const examRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/exams',
    versioned: true,
    summary: 'The mock-exam center: the official test format and the assembly contract.',
    handler: catalogue,
  },
  {
    method: 'GET',
    path: '/v1/exams/blueprint',
    versioned: true,
    summary: 'Assemble a deterministic, reproducible mock-exam paper.',
    handler: blueprint,
  },
  {
    method: 'GET',
    path: '/v1/exams/drill/vocabulary',
    versioned: true,
    summary: 'A deterministic multiple-choice vocabulary drill with an optional answer key.',
    handler: drill,
  },
  {
    method: 'GET',
    path: '/v1/exams/papers/:paperId',
    versioned: true,
    summary: 'Re-derive a mock-exam paper from its addressable identifier.',
    handler: paper,
  },
];
