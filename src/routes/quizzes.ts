/**
 * Quiz generation routes (`/v1/quizzes`).
 *
 * The quiz endpoint is a generator, not a dataset: items are composed at
 * request time from the Cambridge IELTS vocabulary dataset and a seed, so the
 * same request always yields the same items. Distractors are drawn from the
 * same filtered pool as the targets, which keeps difficulty homogeneous.
 */

import { PARTS_OF_SPEECH, searchVocabulary } from '../data/vocabulary.js';
import { generateVocabularyQuiz } from '../lib/quiz.js';
import { parseList } from '../lib/search.js';
import { getEnum, getInt, getString, toParams } from '../lib/query.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';
import type { PartOfSpeech, QuizDirection } from '../types.js';

const DIRECTIONS: readonly QuizDirection[] = ['word-to-meaning', 'meaning-to-word'];

/** How many candidate entries the generator is allowed to see. */
const CANDIDATE_POOL_LIMIT = 5000;

/** Generate a seeded vocabulary quiz. */
function vocabulary(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const count = getInt(params, 'count', 1, 25, 10);
  const seed = getString(params, 'seed') ?? String(Date.now());
  const direction = getEnum(params, 'direction', DIRECTIONS) ?? 'word-to-meaning';
  const posTokens = parseList(getString(params, 'pos'), 'pos', PARTS_OF_SPEECH);

  const pool = searchVocabulary({
    limit: CANDIDATE_POOL_LIMIT,
    offset: 0,
    ...(posTokens === undefined ? {} : { partsOfSpeech: posTokens as PartOfSpeech[] }),
  });
  const candidates = pool.items.map((entry) => ({
    id: entry.id,
    word: entry.word,
    // The dataset guarantees a gloss on every entry (RESEARCH.md §3); CI
    // re-derives the file and fails if that ever stops being true.
    definition: entry.definition as string,
  }));
  const quiz = generateVocabularyQuiz(candidates, { direction, count, seed });
  return {
    data: quiz,
    meta: {
      count: quiz.count,
      seed,
      direction: quiz.direction,
      candidates: candidates.length,
      reproducibility: 'same seed and filters yield the same items',
    },
  };
}

/** Quiz routes. */
export const quizRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/quizzes/vocabulary',
    versioned: true,
    summary: 'Deterministic seeded multiple-choice quiz built from the vocabulary dataset.',
    handler: vocabulary,
  },
];
