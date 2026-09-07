/**
 * Deterministic quiz and flashcard factory.
 *
 * Multiple-choice items are built by taking the correct definition and drawing
 * three distractors of the same part of speech from the same thematic
 * collection when possible, falling back to the full headword list.  Shuffling
 * is seeded so the same word + seed always yields the same option order -
 * a prerequisite for reproducible experiment replication.
 */

import { collectionForEntry } from './collections.js';
import { seededIndices } from './rng.js';

import type { Flashcard, QuizItem, VocabularyEntry } from '../types.js';

/**
 * Pick `count` distractors for one entry.
 *
 * @param entry - Entry whose correct definition must not appear among distractors.
 * @param pool - Candidate entries to draw from.
 * @param count - How many distractors to return.
 */
export function pickDistractors(
  entry: VocabularyEntry,
  pool: readonly VocabularyEntry[],
  count: number,
): VocabularyEntry[] {
  const candidates = pool.filter(
    (candidate) =>
      candidate.id !== entry.id &&
      candidate.definition !== null &&
      candidate.partOfSpeech === entry.partOfSpeech,
  );
  if (candidates.length < count) {
    return candidates.slice(0, count);
  }
  const seed = `quiz:${entry.id}:${(entry.definition as string).slice(0, 20)}`;
  const indices = seededIndices(seed, candidates.length, count);
  return indices.map((index) => candidates[index] as VocabularyEntry);
}

/**
 * Build one quiz item from a vocabulary entry.
 *
 * @param entry - Entry to quiz.
 * @param dictionary - Full dictionary for distractor sourcing.
 * @param seed - Seed for option shuffling; defaults to the entry id.
 */
export function buildQuizItem(
  entry: VocabularyEntry,
  dictionary: readonly VocabularyEntry[],
  seed?: string,
): QuizItem | null {
  if (entry.definition === null) return null;
  const sameCollection = collectionForEntry(entry.id);
  let pool: readonly VocabularyEntry[] = dictionary;
  if (sameCollection !== null) {
    const filtered = dictionary.filter((candidate) => collectionForEntry(candidate.id) === sameCollection);
    if (filtered.length >= 4) pool = filtered;
  }
  const distractors = pickDistractors(entry, pool, 3);
  if (distractors.length < 3) return null;
  const options = [entry.definition, ...distractors.map((item) => item.definition as string)];
  const shuffleSeed = seed ?? `quiz:shuffle:${entry.id}`;
  // Deterministic Fisher-Yates using mulberry32-style hash.
  const shuffled = [...options];
  let hash = 0x811c9dc5;
  for (let i = 0; i < shuffleSeed.length; i += 1) {
    hash ^= shuffleSeed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    hash = (hash + 0x6d2b79f5) >>> 0;
    let t = hash;
    t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0;
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const j = ((t ^ (t >>> 14)) >>> 0) % (i + 1);
    const tmp = shuffled[i] as string;
    shuffled[i] = shuffled[j] as string;
    shuffled[j] = tmp;
  }
  const answerIndex = shuffled.indexOf(entry.definition);
  return {
    word: entry.word,
    phonetic: entry.phonetic,
    correctDefinition: entry.definition,
    options: shuffled,
    answerIndex,
    collection: sameCollection,
    partOfSpeech: entry.partOfSpeech,
  };
}

/**
 * Build a flashcard from one entry.
 *
 * @param entry - Entry to convert.
 */
export function buildFlashcard(entry: VocabularyEntry): Flashcard {
  const cue =
    entry.senses.length > 1
      ? `${String(entry.senses.length)} senses`
      : ((entry.definition as string | null) ?? entry.word);
  return {
    front: entry.word,
    back: entry.definition ?? entry.word,
    phonetic: entry.phonetic,
    cue,
    collection: collectionForEntry(entry.id),
  };
}

/**
 * Generate a deterministic deck of quiz items.
 *
 * @param entries - Entries to turn into quiz items.
 * @param dictionary - Full dictionary.
 * @param count - How many items to return.
 * @param seed - Seed for sampling.
 */
export function quizDeck(
  entries: readonly VocabularyEntry[],
  dictionary: readonly VocabularyEntry[],
  count: number,
  seed: string,
): QuizItem[] {
  const feasible = entries.filter((entry) => entry.definition !== null);
  if (feasible.length === 0) return [];
  const indices = seededIndices(seed, feasible.length, Math.min(count, feasible.length));
  const deck: QuizItem[] = [];
  for (const index of indices) {
    const entry = feasible[index] as VocabularyEntry;
    const item = buildQuizItem(entry, dictionary, `${seed}:${entry.id}`);
    if (item !== null) deck.push(item);
  }
  return deck;
}
