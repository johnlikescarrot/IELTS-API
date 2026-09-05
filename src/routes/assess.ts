/**
 * Writing-assessment route (`/v1/assess`).
 *
 * The assessment engine of `src/lib/assess.ts` exposed over HTTP. GET-only,
 * deterministic, auditable: identical requests produce byte-identical
 * estimates, so an assessment can be archived and cited like any dataset
 * response.
 */

import { assessWriting, ASSESSMENT_RULES } from '../lib/assess.js';
import { badRequest } from '../lib/errors.js';
import { getEnum, requireString, toParams } from '../lib/query.js';
import { MAX_TEXT_LENGTH, wordsOf } from '../lib/textstats.js';

import type { QueryParams } from '../types.js';
import type { HandlerResult, RouteContext, RouteDefinition } from '../lib/route.js';

/** Writing tasks the assessor knows. */
const TASKS = ['task1', 'task2'] as const;

/**
 * Read and validate the `text` parameter.
 *
 * @param params - Query parameters.
 */
function requireText(params: QueryParams): string {
  const text = requireString(params, 'text');
  if (text.length > MAX_TEXT_LENGTH) {
    throw badRequest(`Parameter "text" must be at most ${MAX_TEXT_LENGTH} characters.`, {
      parameter: 'text',
      received: String(text.length),
      limit: String(MAX_TEXT_LENGTH),
    });
  }
  if (wordsOf(text).length === 0) {
    throw badRequest('Parameter "text" contains no analysable words; alphabetic tokens are required.', {
      parameter: 'text',
      received: text.slice(0, 50),
    });
  }
  return text;
}

/** Heuristic band estimate for a writing sample, with every rule that fired. */
function writing(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const text = requireText(params);
  const task = getEnum(params, 'task', TASKS) ?? 'task2';
  return {
    data: assessWriting(text, task),
    meta: {
      method:
        'Surface heuristics only: every criterion starts at a published baseline of 6.5 and moves in half-band steps through a fixed rule list; the response names each rule, observation and effect.',
      disclaimer:
        'Teaching signal, not an official score. Criteria reference the analytic descriptors at /v1/bands/descriptors; corpus placement references /v1/tests/stats.',
      rulesAvailable: ASSESSMENT_RULES.length,
      taskMinimumWords: task === 'task1' ? 150 : 250,
      limits: { maxCharacters: MAX_TEXT_LENGTH },
    },
  };
}

/** Writing-assessment routes. */
export const assessRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/assess/writing',
    versioned: true,
    summary:
      'Heuristic band estimate for a writing sample: four criteria, an overall estimate with IELTS rounding, and every rule that fired.',
    handler: writing,
  },
];
