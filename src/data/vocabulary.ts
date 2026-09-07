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
import type { PartOfSpeech, VocabularyEntry, VocabularyFrequency, VocabularyMeta } from '../types.js';

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
/** Options accepted by {@link searchVocabulary}. */
export type VocabularyQuery = {
  /** Free-text search over headword, definition and morphemes. */
  query?: string;
  /** Restrict to these Cambridge IELTS volumes (1-22). */
  volumes?: number[];
  /** Restrict to these parts of speech. */
  partsOfSpeech?: PartOfSpeech[];
  /** Restrict to these frequency tiers. */
  frequencies?: VocabularyFrequency[];
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
  const frequencies = options.frequencies;
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
    if (frequencies !== undefined) {
      let tier: VocabularyFrequency;
      if (entry.volumes.length >= 3) tier = 'high';
      else if (entry.volumes.length >= 2) tier = 'medium';
      else tier = 'low';
      if (!frequencies.includes(tier)) return false;
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
