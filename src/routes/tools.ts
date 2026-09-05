/**
 * Text-analysis routes (`/v1/tools`).
 *
 * Deterministic, offline analysers: they read only the request text plus the
 * datasets already published by the API, so their outputs are reproducible and
 * archivable like every other endpoint.
 */

import { analyseEssay, analyseReadability, TASK_MINIMUM_WORDS } from '../lib/analysis.js';
import { badRequest } from '../lib/errors.js';
import { getEnum, getInt, requireString, toParams } from '../lib/query.js';
import { MAX_TEXT_LENGTH, wordsOf } from '../lib/textstats.js';

import type { QueryParams } from '../types.js';
import type { HandlerResult, RouteContext, RouteDefinition } from '../lib/route.js';

/** Writing tasks whose minimum length the essay profile knows. */
const TASKS = ['task1', 'task2'] as const;

/**
 * Read and validate the `text` parameter shared by the analysis tools.
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

/** Flesch readability of arbitrary text, placed against the corpus groups. */
function readability(context: RouteContext): HandlerResult {
  const text = requireText(toParams(context.url));
  return {
    data: analyseReadability(text),
    meta: {
      method:
        'Flesch Reading Ease and Flesch-Kincaid grade from mean sentence length and mean syllables per word; tokens are alphabetic, numerals are excluded.',
      corpusReference: 'Group means come from the practice-test index published at /v1/tests/stats.',
      limits: { maxCharacters: MAX_TEXT_LENGTH },
    },
  };
}

/** Lexical, structural and theme profile of a writing sample. */
function essayProfile(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const text = requireText(params);
  const task = getEnum(params, 'task', TASKS) ?? 'task2';
  const themeLimit = getInt(params, 'limit', 1, 10, 5);
  return {
    data: analyseEssay(text, task, themeLimit),
    meta: {
      method:
        'Surface heuristics only: token diversity, sentence-length spread, Cambridge headword coverage, recurring-theme keywords and fixed thresholds.',
      disclaimer:
        'Hints are teaching heuristics, not scores. They reference the criteria of the analytic descriptors published at /v1/bands/descriptors.',
      taskMinimumWords: TASK_MINIMUM_WORDS[task],
    },
  };
}

/** Text-analysis routes. */
export const toolRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/tools/readability',
    versioned: true,
    summary: 'Flesch Reading Ease, Flesch-Kincaid grade and text statistics for any passage.',
    handler: readability,
  },
  {
    method: 'GET',
    path: '/v1/tools/essay-profile',
    versioned: true,
    summary:
      'Lexical diversity, headword coverage, themes and descriptor-aligned hints for a writing sample.',
    handler: essayProfile,
  },
];
