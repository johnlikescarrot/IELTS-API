/**
 * Common-mistakes service: browsing plus seeded error-correction quizzes.
 */

import { MISTAKES, type Mistake, type MistakeCategory } from '../data/mistakes.js';
import { NotFoundError } from '../lib/errors.js';
import { createRng, sample, shuffled } from '../lib/random.js';

export const MISTAKE_CATEGORIES: readonly MistakeCategory[] = [
  'articles',
  'prepositions',
  'subject-verb-agreement',
  'word-choice',
  'countable-uncountable',
  'punctuation',
  'register',
  'cohesion'
];

export function listMistakes(category?: MistakeCategory | undefined): readonly Mistake[] {
  if (category === undefined) {
    return MISTAKES;
  }
  return MISTAKES.filter((mistake) => mistake.category === category);
}

export function getMistake(id: string): Mistake {
  const mistake = MISTAKES.find((item) => item.id === id);
  if (mistake === undefined) {
    throw new NotFoundError('Mistake', id);
  }
  return mistake;
}

export interface QuizItem {
  readonly id: string;
  readonly category: MistakeCategory;
  readonly sentence: string;
  readonly options: readonly string[];
  readonly answerIndex: number;
  readonly explanation: string;
  readonly impacts: readonly string[];
}

export interface QuizOptions {
  readonly count: number;
  readonly seed?: string | undefined;
}

export function buildQuiz(options: QuizOptions): readonly QuizItem[] {
  const rng = createRng(options.seed);
  const chosen = sample(MISTAKES, options.count, rng);
  return chosen.map((mistake) => {
    const distractors = sample(
      MISTAKES.filter((other) => other.id !== mistake.id),
      3,
      rng
    ).map((other) => other.correct);
    const optionsForQuestion = shuffled([mistake.correct, ...distractors], rng);
    const answerIndex = optionsForQuestion.indexOf(mistake.correct);
    return {
      id: mistake.id,
      category: mistake.category,
      sentence: mistake.wrong,
      options: optionsForQuestion,
      answerIndex,
      explanation: mistake.explanation,
      impacts: mistake.impacts
    };
  });
}
