/**
 * Mock-exam routes (`/v1/exams`).
 *
 * `/v1/exams` publishes the official four-paper format reference; `/v1/exams/blueprint`
 * composes it into a deterministic, date-seeded mock exam session using the
 * rest of the API: the question-type frequencies from the practice-test
 * index, the Writing and Speaking topic banks, and the raw-score tables.
 */

import { assertBand } from '../lib/band.js';
import { BLUEPRINT_MIN_TARGET, EXAM_MODULES, buildExamBlueprint, buildExamFormat } from '../lib/exam.js';
import { badRequest } from '../lib/errors.js';
import { getEnum, getIsoDate, getString, toParams } from '../lib/query.js';

import type { HandlerResult, RouteContext, RouteDefinition } from '../lib/route.js';

/** Format reference for one or both modules. */
function index(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const module = getEnum(params, 'module', EXAM_MODULES);
  const formats =
    module === undefined
      ? EXAM_MODULES.map((candidate) => buildExamFormat(candidate))
      : [buildExamFormat(module)];
  return {
    data: formats,
    meta: {
      count: formats.length,
      module: module ?? null,
      modules: [...EXAM_MODULES],
      note: 'Format reference compiled from the IELTS partners\u2019 published task descriptions; Reading question splits vary by paper.',
    },
  };
}

/** Deterministic mock-exam blueprint for a date. */
function blueprint(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const module = getEnum(params, 'module', EXAM_MODULES);
  if (module === undefined) {
    throw badRequest('Parameter "module" is required.', {
      parameter: 'module',
      allowed: EXAM_MODULES.join(','),
    });
  }
  const date = getIsoDate(params, 'date', new Date().toISOString().slice(0, 10));

  let target: number | null = null;
  const rawTarget = getString(params, 'target');
  if (rawTarget !== undefined) {
    target = assertBand(Number.parseFloat(rawTarget), 'target');
    if (target < BLUEPRINT_MIN_TARGET) {
      throw badRequest(`Parameter "target" must be at least ${BLUEPRINT_MIN_TARGET}.`, {
        parameter: 'target',
        received: rawTarget,
        min: String(BLUEPRINT_MIN_TARGET),
      });
    }
  }

  const seed = getString(params, 'seed') ?? date;
  return {
    data: buildExamBlueprint({ module, date, seed, target }),
    meta: {
      module,
      date,
      seed,
      target: target ?? null,
      note: 'The blueprint is deterministic: identical module, date, seed and target always produce the identical mock exam.',
    },
  };
}

/** Mock-exam routes. */
export const examRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/exams',
    versioned: true,
    summary: 'Official four-paper format reference: structure, timings and minimum word counts.',
    handler: index,
  },
  {
    method: 'GET',
    path: '/v1/exams/blueprint',
    versioned: true,
    summary:
      'A deterministic, date-seeded full mock-exam blueprint with question-type mix and linked practice.',
    handler: blueprint,
  },
];
