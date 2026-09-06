/**
 * Mock-exam route (`/v1/mock/exam`).
 *
 * Composes a complete four-skill mock exam deterministically from a seed:
 * identical requests return identical exams on every replica, so an exam can
 * be cited, cached and re-sat. The exam references indexed practice items and
 * dataset entries by identifier; nothing upstream is redistributed.
 */

import { TASK_MODULES } from '../data/tasks.js';
import { getEnum, getString, toParams } from '../lib/query.js';
import { buildMockExam } from '../lib/mock.js';

import type { HandlerResult, RouteContext, RouteDefinition } from '../lib/route.js';
import type { IeltsModule } from '../types.js';

/** Compose a deterministic four-skill mock exam. */
function exam(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const seed = getString(params, 'seed') ?? new Date().toISOString().slice(0, 10);
  const module = (getEnum(params, 'module', TASK_MODULES) ?? 'academic') as IeltsModule;
  const composed = buildMockExam({ seed, module });
  return {
    data: composed,
    meta: {
      method:
        'Every pick is a seeded draw over the published datasets: one audio-backed Listening full test, one ' +
        'Reading full test, one Writing Task 1 family and Task 2 prompt, and one Speaking topic per part. ' +
        'Identical seeds return identical exams; the default seed is the current UTC date.',
      scoring:
        'After sitting the exam, convert the objective papers with /v1/scores/raw/convert and build the ' +
        'full report with /v1/scores/mock-report.',
      sources: [
        'practice-test index (/v1/tests/items)',
        'task banks (/v1/topics/writing, /v1/topics/speaking, /v1/tasks/writing)',
      ],
    },
  };
}

/** Mock-exam routes. */
export const mockRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/mock/exam',
    versioned: true,
    summary: 'Deterministically assemble a complete four-skill mock exam from a seed.',
    handler: exam,
  },
];
