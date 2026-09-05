/**
 * Deterministic vocabulary-quiz generation.
 *
 * The quiz is built from the Cambridge IELTS 1-22 vocabulary dataset itself:
 * each item shows a headword and asks for its gloss (or the reverse), with
 * three distractors sampled from the same candidate pool. Every random choice
 * is drawn from the seeded generator in `rng.ts`, so a quiz is fully
 * reproducible from its seed — an important property when a study or a paper
 * reports quiz results and someone must be able to regenerate the exact
 * stimulus set years later.
 */

import { badRequest } from './errors.js';
import { hashString, mulberry32, seededIndices } from './rng.js';

import type { QuizDirection, QuizItem, VocabularyQuiz } from '../types.js';

/** One usable candidate for quiz generation (a subset of a vocabulary entry). */
export type QuizCandidate = {
  /** Dataset identifier of the entry. */
  id: string;
  /** Headword. */
  word: string;
  /** Gloss used as the correct definition. */
  definition: string;
};

/** Options accepted by {@link generateVocabularyQuiz}. */
export type QuizOptions = {
  /** Item direction: show the word or show the gloss. */
  direction: QuizDirection;
  /** Number of items to generate. */
  count: number;
  /** Seed string; identical seeds yield identical quizzes. */
  seed: string;
};

/** Number of distractors per item. */
const DISTRACTORS = 3;

/**
 * Fisher-Yates shuffle driven by a seeded generator (returns a copy).
 *
 * @param items - Items to shuffle.
 * @param random - Seeded source of `[0, 1)` values.
 */
function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let index = out.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    const left = out[index] as T;
    const right = out[swap] as T;
    out[index] = right;
    out[swap] = left;
  }
  return out;
}

/**
 * Generate a seeded multiple-choice quiz from a candidate pool.
 *
 * @param candidates - Pool to draw targets and distractors from; every
 *   distinct target needs three other candidates to build distractors from.
 * @param options - Direction, item count and seed.
 * @throws {HttpError} `400` when the pool is too small for the requested count.
 */
export function generateVocabularyQuiz(
  candidates: readonly QuizCandidate[],
  options: QuizOptions,
): VocabularyQuiz {
  const { direction, count, seed } = options;
  const poolSize = candidates.length;
  const required = count + DISTRACTORS;
  if (poolSize < required) {
    throw badRequest(
      `The filters selected ${poolSize} usable entries; ${required} are needed for ${count} questions with ${DISTRACTORS} distractors each.`,
      { parameter: 'count', hint: 'Lower "count" or widen the "pos" filter.' },
    );
  }
  const targets = seededIndices(`${seed}|targets`, poolSize, count);
  const items: QuizItem[] = targets.map((targetIndex, position) => {
    const target = candidates[targetIndex] as QuizCandidate;
    // `seededIndices` draws from a pool of size n-1 and the shift maps the
    // missing slot back onto "every index except the target", so distractors
    // can never collide with the correct answer.
    const distractorIndices = seededIndices(`${seed}|d${position}`, poolSize - 1, DISTRACTORS).map((index) =>
      index < targetIndex ? index : index + 1,
    );
    const correct = direction === 'word-to-meaning' ? target.definition : target.word;
    const distractors = distractorIndices.map((index) => {
      const candidate = candidates[index] as QuizCandidate;
      return direction === 'word-to-meaning' ? candidate.definition : candidate.word;
    });
    const prompt =
      direction === 'word-to-meaning'
        ? `Which option best matches “${target.word}”?`
        : `Which word matches this definition: “${target.definition}”`;
    const shuffled = shuffle([correct, ...distractors], mulberry32(hashString(`${seed}|s${position}`)));
    return {
      id: `q${position + 1}`,
      wordId: target.id,
      word: target.word,
      prompt,
      options: shuffled,
      answerIndex: shuffled.indexOf(correct),
    };
  });
  return { kind: 'vocabulary-definitions', direction, seed, count: items.length, items };
}
