/**
 * Mock exam-centre routes (`/v1/exam`).
 *
 * The endpoints turn the API into a test centre: `/config` publishes the
 * test-day rulebook, `/schedule` renders it as an invigilated countdown
 * timeline, `/tables` and `/score` expose the published raw-score conversion
 * convention, `/report` composes a mock score report in test-report-form
 * shape, and `/mock` assembles a full deterministic mock paper from the
 * API's own indexes. Everything stays GET-only, stateless and free of
 * personal data: scores are passed in the query string and are never stored.
 */

import { cefrForBand } from '../data/bands.js';
import {
  EXAM_DELIVERIES,
  EXAM_FORMAT_PROVENANCE,
  EXAM_MODULES,
  EXAM_TEST_DAYS,
  examTestDayConfig,
} from '../data/examFormat.js';
import {
  RAW_SCORE_PROVENANCE,
  RAW_SCORE_SCALES,
  rawScoreResult,
  rawScoreTable,
  rawScoreTables,
} from '../data/rawScores.js';
import { assertBand } from '../lib/band.js';
import { badRequest } from '../lib/errors.js';
import { buildExamReport, buildExamSchedule, parseExamStart } from '../lib/exam.js';
import { buildMockPaper } from '../lib/mockExam.js';
import { getInt, getEnum, getString, requireString, toParams } from '../lib/query.js';

import type { CefrBand, ExamDelivery, ExamModule } from '../types.js';
import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';

const READ_LEVELS = ['a1-a2', 'b1-b2', 'c1-c2'] as const;

/** Read an optional examination-paper parameter with its default. */
function examModule(params: ReturnType<typeof toParams>): ExamModule {
  return getEnum(params, 'module', EXAM_MODULES) ?? 'academic';
}

/** Read an optional delivery-mode parameter with its default. */
function examDelivery(params: ReturnType<typeof toParams>): ExamDelivery {
  return getEnum(params, 'delivery', EXAM_DELIVERIES) ?? 'paper';
}

/** The test-day rulebook, or one filtered row of it. */
function config(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const module = examModule(params);
  const delivery = examDelivery(params);
  const single = getString(params, 'module') !== undefined || getString(params, 'delivery') !== undefined;
  return {
    data: single ? examTestDayConfig(module, delivery) : EXAM_TEST_DAYS,
    meta: {
      mode: single ? 'single' : 'all',
      combinations: EXAM_TEST_DAYS.length,
      note: 'Without module or delivery filters the full matrix of rulebook rows is returned.',
      provenance: EXAM_FORMAT_PROVENANCE,
    },
  };
}

/** The invigilated timeline for one sitting. */
function schedule(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const start = parseExamStart(requireString(params, 'start'));
  const result = buildExamSchedule({
    module: examModule(params),
    delivery: examDelivery(params),
    start,
    breakMinutes: getInt(params, 'breakMinutes', 0, 60, 0),
  });
  return {
    data: result,
    meta: {
      speaking:
        'The Speaking test sits outside the timeline: it is held separately, up to seven days around the written papers.',
      breakNote:
        'The real IELTS has no scheduled break; breakMinutes lets mock centres insert one between sections.',
    },
  };
}

/** The published raw-score conversion tables. */
function tables(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const scale = getEnum(params, 'scale', RAW_SCORE_SCALES);
  return {
    data: scale === undefined ? rawScoreTables() : { scale, rows: rawScoreTable(scale) },
    meta: {
      scales: RAW_SCORE_SCALES,
      questionCount: 40,
      provenance: RAW_SCORE_PROVENANCE,
    },
  };
}

/** One raw mark converted to an indicative band. */
function score(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const scale = getEnum(params, 'scale', RAW_SCORE_SCALES);
  if (scale === undefined) {
    throw badRequest('Parameter "scale" is required.', {
      parameter: 'scale',
      allowed: RAW_SCORE_SCALES.join(','),
    });
  }
  const raw = getInt(params, 'raw', 0, 40, -1);
  if (raw < 0) {
    throw badRequest('Parameter "raw" is required: correct answers, 0 to 40.', { parameter: 'raw' });
  }
  return {
    data: rawScoreResult(scale, raw),
    meta: { provenance: RAW_SCORE_PROVENANCE },
  };
}

/** Read an optional examiner band, when the caller supplies one. */
function optionalBand(params: ReturnType<typeof toParams>, key: string): number | undefined {
  const raw = getString(params, key);
  if (raw === undefined) {
    return undefined;
  }
  return assertBand(Number.parseFloat(raw), key);
}

/** A mock score report: marks in, bands and gap analysis out. */
function report(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const module = examModule(params);
  const listeningRaw = getInt(params, 'listeningRaw', 0, 40, -1);
  const readingRaw = getInt(params, 'readingRaw', 0, 40, -1);
  const writing = optionalBand(params, 'writing');
  const speaking = optionalBand(params, 'speaking');
  if (listeningRaw < 0 && readingRaw < 0 && writing === undefined && speaking === undefined) {
    throw badRequest(
      'Provide at least one score: listeningRaw and readingRaw (correct answers, 0-40) or writing and speaking (bands).',
      { parameter: 'listeningRaw,readingRaw,writing,speaking' },
    );
  }
  const target = optionalBand(params, 'target');
  const result = buildExamReport({
    module,
    ...(listeningRaw < 0 ? {} : { listeningRaw }),
    ...(readingRaw < 0 ? {} : { readingRaw }),
    ...(writing === undefined ? {} : { writing }),
    ...(speaking === undefined ? {} : { speaking }),
    ...(target === undefined ? {} : { target }),
  });
  const complete = result.overall !== null;
  return {
    data: result,
    meta: {
      overall: complete
        ? 'All four components were supplied, so the overall band follows the official rounding rule.'
        : 'The overall band is omitted: every component is needed first.',
      target:
        target === undefined
          ? 'No target requested; add "target" for a gap analysis.'
          : `Target ${target.toFixed(1)} (CEFR ${cefrForBand(target)}).`,
      provenance: RAW_SCORE_PROVENANCE,
    },
  };
}

/** A deterministic mock-paper manifest composed from the API's own datasets. */
function mock(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const level = getEnum(params, 'level', READ_LEVELS);
  const paper = buildMockPaper({
    seed: getString(params, 'seed') ?? 'default',
    module: examModule(params),
    delivery: examDelivery(params),
    ...(level === undefined ? {} : { level: level.toUpperCase() as CefrBand }),
    words: getInt(params, 'words', 0, 20, 8),
  });
  return {
    data: paper,
    meta: {
      determinism:
        'The same seed, module, delivery, level and words values always compose the same paper; the manifest id hashes the canonical inputs.',
      levelNote:
        level === undefined
          ? 'Reading comes from the full-test index; pass "level" to swap it for two graded lessons at that CEFR band.'
          : `Reading was drawn from the graded-reading index at ${level.toUpperCase()}.`,
      content:
        'The manifest carries structure, time budgets and pointers only — no copyrighted passages, recordings or answer keys.',
    },
  };
}

/** Mock exam-centre routes. */
export const examRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/exam/config',
    versioned: true,
    summary:
      'Test-day rulebook: sections, timings, transfer and check time for every module and delivery mode.',
    handler: config,
  },
  {
    method: 'GET',
    path: '/v1/exam/schedule',
    versioned: true,
    summary: 'Invigilated timeline for one sitting: wall-clock segments and a countdown duration.',
    handler: schedule,
  },
  {
    method: 'GET',
    path: '/v1/exam/tables',
    versioned: true,
    summary: 'Published raw-score to band conversion tables for Listening and both Reading papers.',
    handler: tables,
  },
  {
    method: 'GET',
    path: '/v1/exam/score',
    versioned: true,
    summary: 'Convert correct answers (0-40) to an indicative band, with the distance to the next band.',
    handler: score,
  },
  {
    method: 'GET',
    path: '/v1/exam/report',
    versioned: true,
    summary: 'Mock score report: bands per component, overall with the rounding rule, and a gap to a target.',
    handler: report,
  },
  {
    method: 'GET',
    path: '/v1/exam/mock',
    versioned: true,
    summary:
      'Deterministic mock-paper manifest composed from the practice-test, task, topic and vocabulary datasets.',
    handler: mock,
  },
];
