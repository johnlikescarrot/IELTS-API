/**
 * Deterministic vocabulary quiz composition.
 *
 * The quiz composer turns the Cambridge IELTS headword list into a
 * self-marking multiple-choice quiz: each item tests one headword, distractors
 * are drawn from headwords of the same part of speech when the pool allows,
 * and the presentation order of the options is shuffled — all deterministically
 * from the caller-supplied seed, so the same seed always rebuilds the same
 * quiz on every replica. The design mirrors the review-and-test loop of
 * stateful vocabulary trainers (notably `Iamdacai/ielts-vocab-system`, whose
 * new-word, review-word and progress endpoints this re-expresses without
 * accounts, clocks or serverside state), with the spaced-repetition schedule
 * at `/v1/study/srs` deciding *when* each quiz should be sat.
 *
 * Two directions are supported. `word-to-definition` shows the headword (with
 * its transcription) and asks for the definition; `definition-to-word` shows
 * the definition and asks for the headword. Only entries that carry a
 * definition can appear in a quiz, in either direction.
 */

import { allEntries } from '../data/vocabulary.js';
import { hashString, mulberry32, seededIndices } from './rng.js';

import type { PartOfSpeech, QuizItem, VocabularyEntry, VocabularyQuiz } from '../types.js';

/** Smallest number of options a quiz item accepts. */
export const MIN_QUIZ_CHOICES = 2;

/** Largest number of options a quiz item accepts. */
export const MAX_QUIZ_CHOICES = 5;

/** Largest number of items one quiz accepts. */
export const MAX_QUIZ_COUNT = 20;

/** Options accepted by {@link buildQuiz}. */
export interface QuizOptions {
  /** Seed the whole quiz is derived from. */
  seed: string;
  /** How many items to compose. */
  count: number;
  /** Options per item, including the correct answer. */
  choices: number;
  /** Quiz direction. */
  direction: 'word-to-definition' | 'definition-to-word';
}

/**
 * Headwords eligible for quizzes, optionally restricted to Cambridge volumes
 * and parts of speech. Entries without a definition are removed by
 * {@link buildQuiz}, which accepts any pool.
 *
 * @param volumes - Restrict to these Cambridge IELTS volumes, when supplied.
 * @param partsOfSpeech - Restrict to these parts of speech, when supplied.
 */
export function quizPool(
  volumes?: readonly number[],
  partsOfSpeech?: readonly PartOfSpeech[],
): VocabularyEntry[] {
  return allEntries().filter((entry) => {
    if (volumes !== undefined && volumes.length > 0 && !entry.volumes.some((v) => volumes.includes(v))) {
      return false;
    }
    if (
      partsOfSpeech !== undefined &&
      partsOfSpeech.length > 0 &&
      !partsOfSpeech.includes(entry.partOfSpeech)
    ) {
      return false;
    }
    return true;
  });
}

/**
 * Deterministically shuffle values with a seed.
 *
 * Fisher-Yates driven by `mulberry32`, so the permutation is a pure function
 * of the seed and the input order.
 *
 * @param seed - Seed string.
 * @param values - Values to permute.
 */
export function seededShuffle<T>(seed: string, values: readonly T[]): T[] {
  const shuffled = [...values];
  const random = mulberry32(hashString(seed));
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    const left = shuffled[index] as T;
    const right = shuffled[swap] as T;
    shuffled[index] = right;
    shuffled[swap] = left;
  }
  return shuffled;
}

/** Render an item stem and its correct answer for one entry and direction. */
function stemFor(
  entry: VocabularyEntry,
  direction: QuizOptions['direction'],
): { stem: string; answer: string } {
  if (direction === 'definition-to-word') {
    return { stem: entry.definition as string, answer: entry.word };
  }
  const transcription = entry.phonetic === null ? '' : ` ${entry.phonetic}`;
  return { stem: `${entry.word}${transcription}`, answer: entry.definition as string };
}

/** Render one distractor option for an entry and direction. */
function optionFor(entry: VocabularyEntry, direction: QuizOptions['direction']): string {
  return direction === 'definition-to-word' ? entry.word : (entry.definition as string);
}

/**
 * Compose one quiz item for a pool entry.
 *
 * Distractors prefer headwords that share the stem's part of speech — same-POS
 * foils are harder than random ones — and spill over to the rest of the pool
 * only when the POS cohort is too small. Every draw is seeded, so the item is
 * a pure function of the pool, the options and the item position.
 *
 * @param pool - Eligible entries.
 * @param stemIndex - Index of the tested entry in the pool.
 * @param position - 1-based item position, part of the seed.
 * @param options - Quiz options.
 */
function composeItem(
  pool: readonly VocabularyEntry[],
  stemIndex: number,
  position: number,
  options: QuizOptions,
): QuizItem {
  const entry = pool[stemIndex] as VocabularyEntry;
  const { stem, answer } = stemFor(entry, options.direction);
  const foils = pool.filter((_candidate, index) => index !== stemIndex);
  const samePos = foils.filter((candidate) => candidate.partOfSpeech === entry.partOfSpeech);
  const others = foils.filter((candidate) => candidate.partOfSpeech !== entry.partOfSpeech);
  const ordered = [...samePos, ...others];
  const picks = seededIndices(`${options.seed}|q${position}|foils`, ordered.length, options.choices - 1);
  const distractors = picks.map((index) => optionFor(ordered[index] as VocabularyEntry, options.direction));
  const presented = seededShuffle(`${options.seed}|q${position}|order`, [answer, ...distractors]);
  return {
    id: `q${String(position).padStart(2, '0')}`,
    word: entry.word,
    phonetic: entry.phonetic,
    partOfSpeech: entry.partOfSpeech,
    stem,
    options: presented,
    answerIndex: presented.indexOf(answer),
    volumes: entry.volumes,
  };
}

/**
 * Compose a deterministic multiple-choice quiz from a pool of entries.
 *
 * Entries without a definition cannot form a question and are removed first;
 * `count` and `choices` are then clamped to the eligible pool, so a narrow
 * filter never fails — it yields a shorter quiz, and the response says how
 * large the pool was.
 *
 * @param pool - Candidate entries; must hold at least one defined entry.
 * @param options - Quiz options.
 */
export function buildQuiz(pool: readonly VocabularyEntry[], options: QuizOptions): VocabularyQuiz {
  const eligible = pool.filter((entry) => entry.definition !== null);
  const count = Math.min(options.count, eligible.length);
  const choices = Math.min(options.choices, eligible.length);
  const effective: QuizOptions = { ...options, count, choices };
  const stems = seededIndices(`${options.seed}|stems`, eligible.length, count);
  const items = stems.map((stemIndex, position) => composeItem(eligible, stemIndex, position + 1, effective));
  return {
    items,
    key: Object.fromEntries(items.map((item) => [item.id, item.answerIndex])),
    pool: eligible.length,
  };
}
