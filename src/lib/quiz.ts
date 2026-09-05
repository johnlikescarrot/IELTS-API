/**
 * Seeded vocabulary quiz generation.
 *
 * The quiz engine turns the Cambridge IELTS 1-22 vocabulary dataset into
 * deterministic, reproducible practice items. Every part of an item — the
 * sampled headwords, the distractors and the option order — is drawn from a
 * seeded PRNG, so a quiz can be cited by its seed: `generateQuiz` for one
 * seed returns the identical items on every replica and every release, and a
 * quiz archived as JSON can be re-derived years later for study.
 *
 * Three drill formats are supported:
 *
 * - `word-to-definition`  — choose the correct gloss for a headword;
 * - `definition-to-word`  — choose the headword a gloss describes;
 * - `spelling`            — complete the masked headword from its gloss.
 *
 * Distractors always share the part of speech of the correct answer, and are
 * drawn from the whole dataset (not only the filtered pool) so that option
 * plausibility never depends on request filters.
 */

import { allEntries } from '../data/vocabulary.js';
import { hashString, mulberry32, seededIndices } from './rng.js';

import type { PartOfSpeech, QuizItem, QuizMode } from '../types.js';
import type { VocabularyEntry } from '../types.js';

/** Number of options in multiple-choice quiz items. */
const OPTION_COUNT = 4;

/** A request accepted by {@link generateQuiz}. */
export type QuizSpec = {
  /** Seed: identical specs return identical quizzes. */
  seed: string;
  /** How many items to generate (clamped to the size of the pool). */
  count: number;
  /** Drill format. */
  mode: QuizMode;
  /** Restrict sampled headwords to these Cambridge IELTS volumes. */
  volumes?: number[];
  /** Restrict sampled headwords to these parts of speech. */
  partsOfSpeech?: PartOfSpeech[];
};

/** Quiz drill formats. */
export const QUIZ_MODES: readonly QuizMode[] = ['word-to-definition', 'definition-to-word', 'spelling'];

/** Mask every non-space character except the first one. */
function maskWord(word: string): string {
  return word.charAt(0) + word.replace(/\S/g, '•').slice(1);
}

/**
 * Entries eligible for quizzing: every entry carries a definition, which the
 * quiz dataset-integrity test asserts (and the extraction pipeline enforces).
 */
function quizPool(spec: QuizSpec): VocabularyEntry[] {
  const volumes = spec.volumes;
  const partsOfSpeech = spec.partsOfSpeech;
  return allEntries().filter(
    (entry) =>
      (volumes === undefined || entry.volumes.some((volume) => volumes.includes(volume))) &&
      (partsOfSpeech === undefined || partsOfSpeech.includes(entry.partOfSpeech)),
  );
}

/**
 * Generate a deterministic quiz.
 *
 * @param spec - Quiz specification.
 * @returns One item per requested question; fewer when the pool is smaller.
 */
export function generateQuiz(spec: QuizSpec): QuizItem[] {
  const pool = quizPool(spec);
  const count = Math.min(spec.count, pool.length);
  const random = mulberry32(hashString(spec.seed));
  return seededIndices(spec.seed, pool.length, count).map((index, position) => {
    const entry = pool[index] as VocabularyEntry;
    const definition = entry.definition as string;
    const id = `${spec.seed}:${position}:${entry.id}`;
    if (spec.mode === 'spelling') {
      return {
        id,
        wordId: entry.id,
        mode: spec.mode,
        prompt: `Spell the headword from its meaning — ${maskWord(entry.word)}: ${definition}`,
        options: [],
        answer: entry.word,
        answerIndex: null,
        explanation: definition,
      };
    }
    const toDefinition = spec.mode === 'word-to-definition';
    const distractorPool = allEntries().filter(
      (candidate) => candidate.partOfSpeech === entry.partOfSpeech && candidate.id !== entry.id,
    );
    const distractors = seededIndices(`${spec.seed}:distractors:${position}`, distractorPool.length, 3).map(
      (distractorIndex) => distractorPool[distractorIndex] as VocabularyEntry,
    );
    const optionText = (candidate: VocabularyEntry): string =>
      toDefinition ? (candidate.definition as string) : candidate.word;
    const texts = [entry, ...distractors].slice(0, OPTION_COUNT).map(optionText);
    const keyed = texts.map((text, order) => ({ text, order, key: random() }));
    keyed.sort((a, b) => a.key - b.key);
    return {
      id,
      wordId: entry.id,
      mode: spec.mode,
      prompt: toDefinition ? `Which definition matches “${entry.word}”?` : definition,
      options: keyed.map((choice) => choice.text),
      answerIndex: keyed.findIndex((choice) => choice.order === 0),
      answer: texts[0] as string,
      explanation: definition,
    };
  });
}
