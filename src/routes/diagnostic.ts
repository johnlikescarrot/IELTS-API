/**
 * Vocabulary diagnostic routes (`/v1/diagnostic`).
 *
 * Stateless placement quizzes sampled from the Cambridge headword dataset:
 * `/v1/diagnostic/quiz` builds a quiz from a seed, and
 * `/v1/diagnostic/evaluate` rebuilds the same quiz from the seed to grade a
 * submitted answer string. No session is stored; the seed *is* the session.
 */

import {
  DEFAULT_QUESTIONS,
  DEFAULT_SEED,
  DIAGNOSTIC_FORMATS,
  EXCELLENT_THRESHOLD,
  MAX_QUESTIONS,
  MIN_QUESTIONS,
  PASS_THRESHOLD,
  buildQuiz,
  evaluateQuiz,
} from '../lib/diagnostic.js';
import { getInt, getString, requireString, toParams } from '../lib/query.js';
import { parseList } from '../lib/search.js';

import type { DiagnosticFormat } from '../lib/diagnostic.js';
import type { HandlerResult, RouteContext, RouteDefinition } from '../lib/route.js';

/** Answer encoding shared by the quiz and the evaluation endpoints. */
const ANSWER_FORMAT =
  'Comma-separated answers in question order: letters A-D for choice questions, headwords for spelling.';

/** Read the requested formats, defaulting to every format. */
function readFormats(params: ReturnType<typeof toParams>): DiagnosticFormat[] {
  const formats = parseList(getString(params, 'formats'), 'formats', DIAGNOSTIC_FORMATS) as
    | DiagnosticFormat[]
    | undefined;
  return formats ?? [...DIAGNOSTIC_FORMATS];
}

/** Build a deterministic quiz from the vocabulary dataset. */
function quiz(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const seed = getString(params, 'seed') ?? DEFAULT_SEED;
  const count = getInt(params, 'count', MIN_QUESTIONS, MAX_QUESTIONS, DEFAULT_QUESTIONS);
  const built = buildQuiz({ seed, count, formats: readFormats(params) });
  return {
    data: built,
    meta: {
      method:
        'Entries are sampled with a seeded generator, formats follow largest-remainder shares (35/35/30), and options are seeded distractors.',
      answers: 'The quiz carries no answers; submit them to /v1/diagnostic/evaluate.',
      answerFormat: ANSWER_FORMAT,
      determinism: 'Identical seeds, counts and formats yield byte-identical quizzes.',
    },
  };
}

/** Grade submitted answers against the quiz rebuilt from the seed. */
function evaluate(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const seed = getString(params, 'seed') ?? DEFAULT_SEED;
  const count = getInt(params, 'count', MIN_QUESTIONS, MAX_QUESTIONS, DEFAULT_QUESTIONS);
  const answers = requireString(params, 'answers')
    .split(',')
    .map((answer) => answer.trim());
  const report = evaluateQuiz({ seed, count, formats: readFormats(params), answers });
  return {
    data: report,
    meta: {
      method:
        'Choice answers are graded by option text and spelling by normalised headword; uncertainty is the 95% Wilson score interval.',
      thresholds: { pass: PASS_THRESHOLD, excellent: EXCELLENT_THRESHOLD },
      answerFormat: ANSWER_FORMAT,
    },
  };
}

/** Vocabulary diagnostic routes. */
export const diagnosticRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/diagnostic/quiz',
    versioned: true,
    summary: 'Build a deterministic vocabulary quiz from the Cambridge headword dataset.',
    handler: quiz,
  },
  {
    method: 'GET',
    path: '/v1/diagnostic/evaluate',
    versioned: true,
    summary: 'Grade answers against the seeded quiz, with a Wilson interval and a rating.',
    handler: evaluate,
  },
];
