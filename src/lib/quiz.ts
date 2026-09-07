/**
 * Deterministic definition-recognition practice items.
 *
 * Vocabulary-learning systems re-present the day's headwords as self-test
 * items; the studied reference system
 * (<https://github.com/Iamdacai/ielts-vocab-system>) does the same with
 * flashcard-style prompts. This module generates multiple-choice items in
 * which the learner must recognise which definition belongs to a headword —
 * the cheapest reliable self-test format and the one that needs no external
 * content: the item text is entirely this API's own CC BY 4.0 vocabulary
 * dataset.
 *
 * Items are a pure function of their inputs. The seed is derived from the
 * calendar date (and, at the route layer, from the scope filters), so the
 * same request always yields the same items, options and answer positions on
 * every replica. The correct answer is published with each item because these
 * are study aids, not assessments: a client shows the options, lets the
 * learner answer, then reveals `answer` (or calls `/v1/vocabulary/:word` for
 * the full entry).
 *
 * Distractors are definitions of *other* headwords, preferred from the same
 * part of speech and falling back to any part of speech when a filtered scope
 * is too small. Options are truncated to a fixed width so that long WordNet
 * glosses cannot make the correct answer identifiable by length alone.
 */

import { hashString, mulberry32 } from './rng.js';

import type { Quiz, QuizItem, VocabularyEntry } from '../types.js';

/** Options accepted by {@link buildQuiz}; values are pre-validated. */
export interface QuizOptions {
  /** Calendar date (UTC, ISO-8601) that seeds item selection. */
  date: string;
  /** Number of items requested (1-20). */
  count: number;
  /** Headwords available to draw from, already filtered. */
  entries: readonly VocabularyEntry[];
}

/** Number of definition options per item. */
export const OPTIONS_PER_ITEM = 4;

/** Maximum length of a rendered definition option. */
export const OPTION_MAX_LENGTH = 200;

/** Number of distractor options needed per item. */
const DISTRACTORS_PER_ITEM = OPTIONS_PER_ITEM - 1;

/**
 * The definition text offered for an entry.
 *
 * Prefers the first sense, falling back to the primary definition; returns
 * `null` for entries with no usable text.
 *
 * @param entry - Vocabulary entry.
 */
export function primarySenseText(entry: VocabularyEntry): string | null {
  const sense = entry.senses[0];
  const raw = (sense !== undefined && sense.text.trim().length > 0 ? sense.text : entry.definition)?.trim();
  if (raw === undefined || raw.length === 0) {
    return null;
  }
  if (raw.length <= OPTION_MAX_LENGTH) {
    return raw;
  }
  return `${raw.slice(0, OPTION_MAX_LENGTH)}…`;
}

/**
 * Case-insensitive option-text equality after normalisation.
 *
 * @param left - First text.
 * @param right - Second text.
 */
export function sameText(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

/**
 * A deterministic full permutation of `0..population - 1`.
 *
 * Unlike a fixed-length sample, a full shuffle lets the caller walk the whole
 * pool in seeded order, so duplicate texts are skipped without ever leaving a
 * valid distractor unused.
 *
 * @param population - Size of the pool.
 * @param seed - Determinism seed.
 */
export function seededOrder(population: number, seed: string): number[] {
  const random = mulberry32(hashString(seed));
  const order = Array.from({ length: population }, (_unused, index) => index);
  for (let position = order.length - 1; position > 0; position -= 1) {
    const swap = Math.floor(random() * (position + 1));
    const left = order[position] as number;
    const right = order[swap] as number;
    order[position] = right;
    order[swap] = left;
  }
  return order;
}

/**
 * Deterministically pick distractor definitions for one item.
 *
 * Same-part-of-speech headwords are walked first in seeded order, then any
 * remaining slots are filled from the full scope (still in seeded order).
 * Texts already used are skipped so that no item ever offers the same
 * definition twice.
 *
 * @param entries - Scope the distractors are drawn from.
 * @param target - The headword the item asks about.
 * @param seed - Determinism seed for the item.
 * @returns The distractor texts and how the pool behaved.
 */
export function pickDistractors(
  entries: readonly VocabularyEntry[],
  target: VocabularyEntry,
  seed: string,
): { texts: string[]; crossPosFallback: boolean; reduced: boolean } {
  const correct = primarySenseText(target) as string;
  const samePos: VocabularyEntry[] = [];
  const anyPos: VocabularyEntry[] = [];
  for (const entry of entries) {
    if (entry.id === target.id) {
      continue;
    }
    const text = primarySenseText(entry);
    if (text === null || sameText(text, correct)) {
      continue;
    }
    anyPos.push(entry);
    if (entry.partOfSpeech === target.partOfSpeech) {
      samePos.push(entry);
    }
  }

  const texts: string[] = [];
  const used = new Set<string>([correct.trim().toLowerCase()]);
  let crossPosFallback = false;

  function take(pool: readonly VocabularyEntry[], salt: string): void {
    for (const index of seededOrder(pool.length, `${seed}:${salt}`)) {
      if (texts.length >= DISTRACTORS_PER_ITEM) {
        return;
      }
      const entry = pool[index] as VocabularyEntry;
      const text = primarySenseText(entry) as string;
      if (used.has(text.trim().toLowerCase())) {
        continue;
      }
      texts.push(text);
      used.add(text.trim().toLowerCase());
      if (entry.partOfSpeech !== target.partOfSpeech) {
        crossPosFallback = true;
      }
    }
  }

  take(samePos, 'pos');
  take(anyPos, 'any');
  return { texts, crossPosFallback, reduced: texts.length < DISTRACTORS_PER_ITEM };
}

/**
 * Shuffle the options of one item with a per-item seeded generator.
 *
 * @param options - Option texts, correct answer first.
 * @param seed - Determinism seed for the item.
 * @returns The shuffled options and the index of the correct answer.
 */
export function shuffleOptions(
  options: readonly string[],
  seed: string,
): { options: string[]; answer: number } {
  const shuffled = [...options];
  const random = mulberry32(hashString(`${seed}:options`));
  for (let position = shuffled.length - 1; position > 0; position -= 1) {
    const swap = Math.floor(random() * (position + 1));
    const left = shuffled[position] as string;
    const right = shuffled[swap] as string;
    shuffled[position] = right;
    shuffled[swap] = left;
  }
  return { options: shuffled, answer: shuffled.indexOf(options[0] as string) };
}

/**
 * Build a deterministic practice set for a calendar date.
 *
 * @param options - Quiz options, all pre-validated by the route.
 * @returns The practice set.
 */
export function buildQuiz(options: QuizOptions): Quiz {
  const seed = `ielts-api:quiz:${options.date}`;
  const usable = options.entries.filter((entry) => primarySenseText(entry) !== null);
  const order = seededOrder(usable.length, seed);
  const items: QuizItem[] = [];
  let crossPosFallback = false;
  let reduced = false;

  for (let position = 0; position < order.length && items.length < options.count; position += 1) {
    const target = usable[order[position] as number] as VocabularyEntry;
    const correct = primarySenseText(target) as string;
    const distractors = pickDistractors(usable, target, seed);
    crossPosFallback ||= distractors.crossPosFallback;
    reduced ||= distractors.reduced;
    const { options: shuffled, answer } = shuffleOptions([correct, ...distractors.texts], seed);
    items.push({
      id: target.id,
      word: target.word,
      pos: target.partOfSpeech,
      prompt: `Which definition matches the headword "${target.word}"?`,
      options: shuffled,
      answer,
    });
  }

  return {
    date: options.date,
    count: options.count,
    items,
    scope: { headwords: options.entries.length },
    optionsPerItem: OPTIONS_PER_ITEM,
    crossPosFallback,
    reduced,
  };
}
