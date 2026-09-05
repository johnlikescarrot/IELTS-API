/**
 * Vocabulary quiz routes (`/v1/quiz`).
 *
 * The generator is fully deterministic for a given seed, so a quiz can be
 * shared as a seed string, archived as JSON and re-derived in a study:
 * `ielts-api /v1/quiz?seed=study-2026-05` answers the same everywhere,
 * forever. Distractors always share the part of speech of the correct answer.
 */

import { generateQuiz, QUIZ_MODES } from '../lib/quiz.js';
import { getEnum, getInt, getString, toParams } from '../lib/query.js';
import { parseList } from '../lib/search.js';
import { badRequest } from '../lib/errors.js';
import { PARTS_OF_SPEECH } from '../data/vocabulary.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';
import type { QuizMode, PartOfSpeech } from '../types.js';

const ANSWER_MODES = ['include', 'omit'] as const;

/** Parse a comma-separated list of Cambridge IELTS volume numbers (1-22). */
function parseVolumes(raw: string | undefined): number[] | undefined {
  const tokens = parseList(raw, 'volume');
  if (tokens === undefined) {
    return undefined;
  }
  return tokens.map((token) => {
    const volume = /^\d{1,2}$/.test(token) ? Number.parseInt(token, 10) : Number.NaN;
    if (!Number.isInteger(volume) || volume < 1 || volume > 22) {
      throw badRequest('Parameter "volume" must list volumes between 1 and 22.', {
        parameter: 'volume',
        received: token,
      });
    }
    return volume;
  });
}

/** Generate a deterministic quiz. */
function quiz(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const seed = getString(params, 'seed') ?? 'ielts-api-default';
  const count = getInt(params, 'count', 1, 25, 10);
  const mode = (getEnum(params, 'mode', QUIZ_MODES) ?? 'word-to-definition') as QuizMode;
  const answers = getEnum(params, 'answers', ANSWER_MODES) ?? 'include';
  const volumes = parseVolumes(getString(params, 'volume'));
  const posTokens = parseList(getString(params, 'pos'), 'pos', PARTS_OF_SPEECH);
  const items = generateQuiz({
    seed,
    count,
    mode,
    ...(volumes === undefined ? {} : { volumes }),
    ...(posTokens === undefined ? {} : { partsOfSpeech: posTokens as PartOfSpeech[] }),
  });
  const withKey = answers === 'include';
  const data = items.map((item) =>
    withKey ? item : { ...item, answer: null, answerIndex: null, explanation: null },
  );
  return {
    data,
    meta: {
      count: data.length,
      requested: count,
      seed,
      mode,
      answers,
      volume: volumes ?? null,
      pos: posTokens ?? null,
      dataset: 'cambridge-ielts-1-22-vocabulary',
    },
  };
}

/** Quiz routes. */
export const quizRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/quiz',
    versioned: true,
    summary: 'Deterministic seeded vocabulary quizzes (definition matching and spelling).',
    handler: quiz,
  },
];
