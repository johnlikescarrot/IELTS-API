/**
 * Deterministic drill generation from the vocabulary dataset.
 *
 * Two item types are generated from the published glosses alone:
 *
 * - **Definition cloze**: the headword is blanked out of its own Cambridge
 *   gloss and the learner restores it from multiple-choice options. Distractors
 *   are same-part-of-speech headwords that do not occur anywhere in the item
 *   text, so no option can be eliminated by surface overlap with the sentence.
 * - **Word-definition matching**: n words are paired with n shuffled glosses;
 *   gloss texts are unique by construction, so every solution is exact.
 *
 * Every generator is a pure function of `seed` plus the dataset: the same seed
 * yields the same items on every machine and release, which is what makes
 * generated drills usable in experiments and citations.
 */

import { allEntries } from '../data/vocabulary.js';
import { seededIndices, shuffled } from './rng.js';

import type { ClozeItem, MatchingSet, PartOfSpeech, VocabularyEntry } from '../types.js';

/** Word-token scanner, identical to the analysers. */
const TOKEN_PATTERN = /[a-zA-Z][a-zA-Z'’-]*/g;

/** A gloss that contains its own headword and can therefore be blanked. */
export type ClozableGloss = {
  /** The entry being glossed. */
  entry: VocabularyEntry;
  /** Gloss text containing the headword. */
  text: string;
  /** Start offset of the first headword occurrence. */
  start: number;
  /** End offset (exclusive) of that occurrence. */
  end: number;
  /** Whether the primary definition or a later sense carries the match. */
  source: 'definition' | 'sense';
};

/** Options accepted by {@link generateClozeItems}. */
export type ClozeQuery = {
  /** Seed: identical seeds return identical item sets. */
  seed: string;
  /** Requested number of items (clamped to the clozable pool). */
  count: number;
  /** Options per item, including the answer. */
  optionCount: number;
  /** Restrict targets to this part of speech. */
  partOfSpeech?: PartOfSpeech | undefined;
  /** Restrict targets to entries occurring in any of these Cambridge volumes. */
  volumes?: number[] | undefined;
  /** Entry pool override; defaults to the full dataset. */
  entries?: readonly VocabularyEntry[] | undefined;
};

/** Options accepted by {@link generateMatchingSet}. */
export type MatchingQuery = {
  /** Seed: identical seeds return identical sets. */
  seed: string;
  /** Requested number of pairs (clamped to the unique-gloss pool). */
  count: number;
  /** Entry pool override; defaults to the full dataset. */
  entries?: readonly VocabularyEntry[] | undefined;
};

/** Locate the first occurrence of `word` as a whole token inside `text`. */
function firstSelfOccurrence(word: string, text: string): { start: number; end: number } | undefined {
  const needle = word.toLowerCase();
  for (const match of text.matchAll(TOKEN_PATTERN)) {
    if (match[0].toLowerCase() === needle) {
      const start = match.index as number;
      return { start, end: start + match[0].length };
    }
  }
  return undefined;
}

let poolCache: { entries: readonly VocabularyEntry[]; glosses: ClozableGloss[] } | undefined;

/**
 * Drop the cached clozable pool (mirrors {@link clearDatasetCache}).
 */
export function clearDrillCache(): void {
  poolCache = undefined;
}

/**
 * Every gloss that mentions its own headword, in dataset order.
 *
 * The full-dataset result is cached; a custom entry pool is rebuilt on call.
 *
 * @param entries - Entries to scan; defaults to the full dataset.
 */
export function clozableGlosses(entries: readonly VocabularyEntry[] = allEntries()): ClozableGloss[] {
  if (entries === allEntries() && poolCache !== undefined && poolCache.entries === entries) {
    return poolCache.glosses;
  }
  const glosses: ClozableGloss[] = [];
  for (const entry of entries) {
    const candidates: { text: string; source: 'definition' | 'sense' }[] = [];
    if (entry.definition !== null) {
      candidates.push({ text: entry.definition, source: 'definition' });
    }
    for (const sense of entry.senses) {
      candidates.push({ text: sense.text, source: 'sense' });
    }
    for (const candidate of candidates) {
      const span = firstSelfOccurrence(entry.word, candidate.text);
      if (span !== undefined) {
        glosses.push({
          entry,
          text: candidate.text,
          start: span.start,
          end: span.end,
          source: candidate.source,
        });
        break;
      }
    }
  }
  if (entries === allEntries()) {
    poolCache = { entries, glosses };
  }
  return glosses;
}

/**
 * Build one cloze item around a gloss.
 *
 * @param gloss - Clozable gloss holding the target entry.
 * @param query - Generation options (seed, option count, entry universe).
 */
function buildClozeItem(gloss: ClozableGloss, query: ClozeQuery): ClozeItem {
  const entry = gloss.entry;
  const universe = query.entries ?? allEntries();
  const textTokens = new Set<string>();
  for (const match of gloss.text.matchAll(TOKEN_PATTERN)) {
    textTokens.add(match[0].toLowerCase());
  }
  const candidates = universe.filter(
    (candidate) =>
      candidate.id !== entry.id &&
      candidate.partOfSpeech === entry.partOfSpeech &&
      !textTokens.has(candidate.word.toLowerCase()),
  );
  const distractors = shuffled(`${query.seed}:${entry.id}:distractors`, candidates).slice(
    0,
    Math.max(0, query.optionCount - 1),
  );
  const options = shuffled(`${query.seed}:${entry.id}:options`, [
    entry.word,
    ...distractors.map((d) => d.word),
  ]);
  return {
    id: entry.id,
    text: `${gloss.text.slice(0, gloss.start)}_____${gloss.text.slice(gloss.end)}`,
    source: gloss.source,
    options,
    answerIndex: options.indexOf(entry.word),
    answer: entry.word,
    partOfSpeech: entry.partOfSpeech,
    volumes: entry.volumes,
    morphemes: entry.morphemes,
  };
}

/**
 * Generate definition-cloze items.
 *
 * @param query - Generation options.
 * @returns The items plus the size of the pool they were drawn from.
 */
export function generateClozeItems(query: ClozeQuery): { items: ClozeItem[]; pool: number } {
  const entries = query.entries ?? allEntries();
  const pool = clozableGlosses(entries).filter((gloss) => {
    if (query.partOfSpeech !== undefined && gloss.entry.partOfSpeech !== query.partOfSpeech) {
      return false;
    }
    if (
      query.volumes !== undefined &&
      !query.volumes.some((volume) => gloss.entry.volumes.includes(volume))
    ) {
      return false;
    }
    return true;
  });
  const count = Math.min(query.count, pool.length);
  const items = seededIndices(`${query.seed}:cloze:pool`, pool.length, count).map((index) =>
    buildClozeItem(pool[index] as ClozableGloss, query),
  );
  return { items, pool: pool.length };
}

/**
 * Generate a word-definition matching set.
 *
 * @param query - Generation options.
 * @returns The set plus the size of the unique-gloss pool.
 */
export function generateMatchingSet(query: MatchingQuery): { set: MatchingSet; pool: number } {
  const entries = query.entries ?? allEntries();
  const seen = new Set<string>();
  const pool: VocabularyEntry[] = [];
  for (const entry of entries) {
    if (entry.definition === null || seen.has(entry.definition)) {
      continue;
    }
    seen.add(entry.definition);
    pool.push(entry);
  }
  const count = Math.min(query.count, pool.length);
  const selected = seededIndices(`${query.seed}:matching:pool`, pool.length, count).map(
    (index) => pool[index] as VocabularyEntry,
  );
  const ordered = shuffled(
    `${query.seed}:matching:order`,
    selected.map((entry) => ({ id: entry.id, definition: entry.definition as string })),
  );
  return {
    set: {
      words: selected.map((entry) => entry.word),
      definitions: ordered.map((pair) => pair.definition),
      answers: selected.map((entry) => ordered.findIndex((pair) => pair.id === entry.id)),
      ids: selected.map((entry) => entry.id),
    },
    pool: pool.length,
  };
}
