/**
 * Access to the Cambridge IELTS 1-22 vocabulary dataset.
 *
 * The dataset is derived from `1-22yas.xlsx` in the open research corpus
 * <https://github.com/zhengyishiming/IELTS>: one worksheet per Cambridge IELTS
 * volume, each holding the volume's word list with phonetic transcription,
 * gloss and morpheme hints. See `scripts/extract_vocabulary.py` for the
 * reproducible extraction pipeline.
 */

import { loadDataset } from '../lib/dataset.js';
import { paginate, matchesQuery, sortBy } from '../lib/search.js';
import { seededIndices } from '../lib/rng.js';

import type { Page } from '../lib/search.js';
import type { PartOfSpeech, VocabularyEntry, VocabularyMeta } from '../types.js';

/** Shape of `data/vocabulary.json`. */
export type VocabularyDataset = {
  meta: VocabularyMeta;
  entries: VocabularyEntry[];
};

/** Parts of speech present in the dataset. */
export const PARTS_OF_SPEECH: readonly PartOfSpeech[] = [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'pronoun',
  'preposition',
  'conjunction',
  'other',
];

let cached: VocabularyDataset | undefined;

/**
 * Return the vocabulary dataset, loading it on first call.
 */
export function vocabulary(): VocabularyDataset {
  cached ??= loadDataset<VocabularyDataset>('vocabulary.json');
  return cached;
}

/**
 * Return every vocabulary entry.
 */
export function allEntries(): readonly VocabularyEntry[] {
  return vocabulary().entries;
}

/** Options accepted by {@link searchVocabulary}. */
export type VocabularyQuery = {
  /** Free-text search over headword, definition and morphemes. */
  query?: string;
  /** Restrict to these Cambridge IELTS volumes (1-22). */
  volumes?: number[];
  /** Restrict to these parts of speech. */
  partsOfSpeech?: PartOfSpeech[];
  /** How the free-text query is matched. */
  match?: 'contains' | 'prefix' | 'exact';
  /** Sort key. */
  sort?: 'word' | 'length' | 'volumes' | 'senses';
  /** Sort direction. */
  order?: 'asc' | 'desc';
  /** Page size. */
  limit: number;
  /** Offset. */
  offset: number;
};

/** Test one entry against a free-text query. */
function matchesText(entry: VocabularyEntry, query: string, match: 'contains' | 'prefix' | 'exact'): boolean {
  if (match === 'exact') {
    return entry.word.toLowerCase() === query.toLowerCase();
  }
  if (match === 'prefix') {
    return entry.word.toLowerCase().startsWith(query.toLowerCase());
  }
  return matchesQuery([entry.word, entry.definition, entry.morphemes], query);
}

const SORT_KEYS: Record<NonNullable<VocabularyQuery['sort']>, (entry: VocabularyEntry) => string | number> = {
  word: (entry) => entry.word.toLowerCase(),
  length: (entry) => entry.word.length,
  volumes: (entry) => entry.volumes.length,
  senses: (entry) => entry.senses.length,
};

/**
 * Search, filter and paginate the vocabulary dataset.
 *
 * @param options - Search options.
 * @returns A page of matching entries.
 */
export function searchVocabulary(options: VocabularyQuery): Page<VocabularyEntry> {
  const query = options.query ?? '';
  const match = options.match ?? 'contains';
  const partsOfSpeech = options.partsOfSpeech;
  const volumes = options.volumes;
  const filtered = allEntries().filter((entry) => {
    if (query.length > 0 && !matchesText(entry, query, match)) {
      return false;
    }
    if (
      partsOfSpeech !== undefined &&
      partsOfSpeech.length > 0 &&
      !partsOfSpeech.includes(entry.partOfSpeech)
    ) {
      return false;
    }
    if (
      volumes !== undefined &&
      volumes.length > 0 &&
      !entry.volumes.some((volume) => volumes.includes(volume))
    ) {
      return false;
    }
    return true;
  });
  const sortKey = SORT_KEYS[options.sort ?? 'word'];
  const order = options.order ?? 'asc';
  const sorted = options.sort === undefined && order === 'asc' ? filtered : sortBy(filtered, sortKey, order);
  return paginate(sorted, options.limit, options.offset);
}

/**
 * Look up a headword (case-insensitive).
 *
 * @param word - Headword to find.
 */
export function findWord(word: string): VocabularyEntry | undefined {
  const needle = word.trim().toLowerCase();
  return allEntries().find((entry) => entry.word.toLowerCase() === needle);
}

/**
 * Deterministically choose a page of random entries for a seed.
 *
 * @param seed - Seed string (e.g. an ISO date).
 * @param count - How many entries to return.
 */
export function randomEntries(seed: string, count: number): VocabularyEntry[] {
  const entries = allEntries();
  return seededIndices(seed, entries.length, count).map((index) => entries[index] as VocabularyEntry);
}

/** One headword that recurs across several Cambridge IELTS volumes. */
export type RecurrenceRow = {
  /** Stable dataset identifier (`w00001`). */
  id: string;
  /** Headword. */
  word: string;
  /** Cambridge IELTS volumes listing the word, ascending. */
  volumes: number[];
  /** Number of volumes listing the word. */
  count: number;
};

/** One bucket of the recurrence distribution. */
export type RecurrenceBucket = {
  /** Number of volumes a headword is listed in. */
  volumes: number;
  /** Headwords with exactly that recurrence. */
  words: number;
  /** Share of the dataset, in percent, rounded to two decimals. */
  share: number;
};

/** Cross-volume recurrence analysis of the vocabulary dataset. */
export type RecurrenceAnalysis = {
  /** Unique headwords in the dataset. */
  totalWords: number;
  /** Headwords listed in two or more volumes. */
  recurringWords: number;
  /** Largest recurrence observed. */
  maxRecurrence: number;
  /** Headword count per recurrence, ascending. */
  distribution: RecurrenceBucket[];
  /** Every recurring headword, most recurrent first. */
  recurring: RecurrenceRow[];
};

/**
 * Analyse how headwords recur across the Cambridge IELTS volumes.
 *
 * Recurrence is the number of volumes (out of 1-22) whose published word list
 * contains the headword. The volume lists are editorial selections, not token
 * counts, so recurrence measures editorial repetition across exam volumes —
 * a sparse but genuinely exam-specific frequency signal.
 */
export function recurrenceAnalysis(): RecurrenceAnalysis {
  const entries = allEntries();
  const buckets = new Map<number, number>();
  const recurring: RecurrenceRow[] = [];
  let maxRecurrence = 0;

  for (const entry of entries) {
    const count = entry.volumes.length;
    buckets.set(count, (buckets.get(count) ?? 0) + 1);
    maxRecurrence = Math.max(maxRecurrence, count);
    if (count >= 2) {
      recurring.push({ id: entry.id, word: entry.word, volumes: [...entry.volumes], count });
    }
  }

  const total = entries.length;
  const distribution = [...buckets.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([volumes, words]) => ({
      volumes,
      words,
      share: Math.round((words / total) * 10000) / 100,
    }));
  recurring.sort((left, right) => right.count - left.count || left.word.localeCompare(right.word));

  return {
    totalWords: total,
    recurringWords: recurring.length,
    maxRecurrence,
    distribution,
    recurring,
  };
}

/** Aggregate statistics about the vocabulary dataset. */
export type VocabularyStats = {
  /** Number of unique headwords. */
  words: number;
  /** Number of word occurrences across all volumes. */
  occurrences: number;
  /** Cambridge IELTS volumes covered. */
  volumes: number;
  /** Entries per part of speech. */
  byPartOfSpeech: Record<string, number>;
  /** Entries per Cambridge IELTS volume. */
  byVolume: Record<string, number>;
  /** Entries that carry a phonetic transcription. */
  withPhonetics: number;
  /** Entries that carry morpheme hints. */
  withMorphemes: number;
  /** Entries with more than one sense. */
  polysemous: number;
  /** Mean number of senses per entry. */
  meanSenses: number;
  /** Mean headword length in characters. */
  meanWordLength: number;
};

/**
 * Compute aggregate statistics over the vocabulary dataset.
 */
export function vocabularyStats(): VocabularyStats {
  const entries = allEntries();
  const byPartOfSpeech: Record<string, number> = {};
  const byVolume: Record<string, number> = {};
  let withPhonetics = 0;
  let withMorphemes = 0;
  let polysemous = 0;
  let senses = 0;
  let letters = 0;

  for (const entry of entries) {
    byPartOfSpeech[entry.partOfSpeech] = (byPartOfSpeech[entry.partOfSpeech] ?? 0) + 1;
    for (const volume of entry.volumes) {
      byVolume[String(volume)] = (byVolume[String(volume)] ?? 0) + 1;
    }
    if (entry.phonetic !== null) {
      withPhonetics += 1;
    }
    if (entry.morphemes !== null) {
      withMorphemes += 1;
    }
    if (entry.senses.length > 1) {
      polysemous += 1;
    }
    senses += entry.senses.length;
    letters += entry.word.length;
  }

  const total = entries.length;
  const divisor = Math.max(1, total);
  return {
    words: total,
    occurrences: vocabulary().meta.occurrences,
    volumes: vocabulary().meta.volumes,
    byPartOfSpeech,
    byVolume,
    withPhonetics,
    withMorphemes,
    polysemous,
    meanSenses: Math.round((senses / divisor) * 100) / 100,
    meanWordLength: Math.round((letters / divisor) * 100) / 100,
  };
}
