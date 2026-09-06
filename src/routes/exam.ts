/**
 * Test-specification routes (`/v1/exam`).
 *
 * The timing, question counts and sitting order of the four papers, published
 * per module so that a mock-exam centre can drive an invigilation clock from
 * the API instead of from a wiki page.
 */

import {
  ALL_EXAM_PAPERS,
  EXAM_MODULES,
  examStructure,
  findExamPaper,
  papersForModule,
  WRITTEN_MINUTES,
} from '../data/examStructure.js';
import { getEnum, toParams } from '../lib/query.js';
import { notFound } from '../lib/errors.js';

import type { HandlerResult, RouteContext, RouteDefinition } from '../lib/route.js';

/** Shared provenance for every response in this family. */
const SOURCE =
  'The published IELTS test specification (British Council, IDP: IELTS Australia and Cambridge Assessment English). Timings are fixed for every test day.';

/** The test specification for one module. */
function structure(context: RouteContext): HandlerResult {
  const module = getEnum(toParams(context.url), 'module', EXAM_MODULES) ?? 'academic';
  return {
    data: examStructure(module),
    meta: {
      source: SOURCE,
      modules: EXAM_MODULES,
      note: 'Listening and Speaking are identical across the two modules; Reading and Writing Task 1 are not.',
    },
  };
}

/** Every paper, optionally filtered by module. */
function papers(context: RouteContext): HandlerResult {
  const module = getEnum(toParams(context.url), 'module', EXAM_MODULES);
  const rows = module === undefined ? [...ALL_EXAM_PAPERS] : papersForModule(module);
  return {
    data: rows,
    meta: {
      total: rows.length,
      module: module ?? null,
      source: SOURCE,
      writtenMinutes: WRITTEN_MINUTES,
    },
  };
}

/** One paper by identifier. */
function paper(context: RouteContext): HandlerResult {
  const id = context.params['id'] as string;
  const found = findExamPaper(id);
  if (found === undefined) {
    throw notFound(`No paper is identified by "${id}".`, {
      id,
      allowed: ALL_EXAM_PAPERS.map((entry) => entry.id).join(','),
    });
  }
  return {
    data: found,
    meta: {
      source: SOURCE,
      scoring:
        found.marking === 'objective'
          ? 'Marked out of 40; convert the raw score at /v1/scores/raw.'
          : 'Marked against the analytic descriptors published at /v1/bands/descriptors.',
    },
  };
}

/** Test-specification routes. */
export const examRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/exam',
    versioned: true,
    summary: 'Test specification for one module: papers, timings, question counts and sitting order.',
    handler: structure,
  },
  {
    method: 'GET',
    path: '/v1/exam/papers',
    versioned: true,
    summary: 'Every paper with its parts, timings and marking method.',
    handler: papers,
  },
  {
    method: 'GET',
    path: '/v1/exam/papers/:id',
    versioned: true,
    summary: 'One paper of the test specification.',
    handler: paper,
  },
];
