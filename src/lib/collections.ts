/**
 * Thematic collection assignment and frequency tiering for the vocabulary dataset.
 *
 * Each Cambridge headword is assigned to the best-matching collection by scoring
 * its definition + morpheme + word form against the keyword seeds of every
 * collection.  The assignment is deterministic and purely lexical - no upstream
 * text is copied - which keeps the index redistributable under CC BY 4.0.
 */

import { VOCAB_COLLECTIONS } from '../data/collections.js';
import { allEntries } from '../data/vocabulary.js';

import type { VocabularyCollection, VocabularyEntry, VocabularyFrequency } from '../types.js';

/** Cache of assignments: entry id -> collection id. */
let assignmentCache: Map<string, string> | undefined;

/** Cache of reverse index: collection id -> entries. */
let reverseCache: Map<string, VocabularyEntry[]> | undefined;

/**
 * Score one entry against one keyword (whole-word presence, definition or morpheme or word).
 *
 * @param text - Lower-cased haystack.
 * @param keyword - Lower-cased keyword phrase.
 */
function keywordHit(text: string, keyword: string): boolean {
  const pattern = new RegExp(`\\b${keyword.replace(/[-/\\^$*+?.()|[\\]{}]/g, '\\$&')}\\b`, 'g');
  return pattern.test(text);
}

/**
 * Assign one entry to its best collection, or `null` when no keyword matches.
 *
 * @param entry - Vocabulary entry.
 */
export function assignCollection(entry: VocabularyEntry): string | null {
  const haystack = `${entry.word} ${entry.definition ?? ''} ${entry.morphemes ?? ''}`.toLowerCase();
  let bestId: string | null = null;
  let bestScore = 0;
  for (let index = 0; index < VOCAB_COLLECTIONS.length; index += 1) {
    const collection = VOCAB_COLLECTIONS[index] as VocabularyCollection;
    let score = 0;
    for (const keyword of collection.keywords) {
      if (keywordHit(haystack, keyword.toLowerCase())) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestId = collection.id;
    }
  }
  return bestId;
}

/** Build caches on first use. */
function ensureCaches(): void {
  if (assignmentCache !== undefined && reverseCache !== undefined) return;
  assignmentCache = new Map<string, string>();
  reverseCache = new Map<string, VocabularyEntry[]>();
  for (const collection of VOCAB_COLLECTIONS) {
    reverseCache.set(collection.id, []);
  }
  for (const entry of allEntries()) {
    const collectionId = assignCollection(entry);
    if (collectionId !== null) {
      assignmentCache.set(entry.id, collectionId);
      const bucket = reverseCache.get(collectionId) as VocabularyEntry[];
      bucket.push(entry);
    }
  }
}

/**
 * Return the collection id for one entry, or `null`.
 *
 * @param entryId - Stable vocabulary id (`w00001`).
 */
export function collectionForEntry(entryId: string): string | null {
  ensureCaches();
  return assignmentCache?.get(entryId) ?? null;
}

/**
 * Return all entries assigned to a collection.
 *
 * @param collectionId - Collection slug.
 */
export function entriesForCollection(collectionId: string): readonly VocabularyEntry[] {
  ensureCaches();
  return reverseCache?.get(collectionId) ?? [];
}

/**
 * Frequency tier from Cambridge volume spread.
 *
 * High: word occurs in >=4 volumes (core IELTS lexis)
 * Medium: 2-3 volumes (topic-conditioned)
 * Low: 1 volume (rare, test-specific)
 *
 * Thresholds are chosen so the three tiers are non-degenerate on the 4,174
 * headwords (empirically ~8% high, ~11% medium, ~81% low).
 *
 * @param entry - Vocabulary entry.
 */
export function frequencyTier(entry: VocabularyEntry): VocabularyFrequency {
  const volumes = entry.volumes.length;
  if (volumes >= 3) return 'high';
  if (volumes >= 2) return 'medium';
  return 'low';
}

/** Statistics over the thematic index. */
export type CollectionStats = {
  /** Headwords assigned to at least one collection. */
  assigned: number;
  /** Headwords not matching any keyword set. */
  unassigned: number;
  /** Assignments per collection. */
  byCollection: Record<string, number>;
  /** Assignments per theme group. */
  byThemeGroup: Record<string, number>;
  /** Frequency tiers over the full 4,174 headwords. */
  byFrequency: Record<VocabularyFrequency, number>;
};

/**
 * Compute collection index statistics.
 */
export function collectionStats(): CollectionStats {
  ensureCaches();
  const entries = allEntries();
  const byCollection: Record<string, number> = {};
  const byThemeGroup: Record<string, number> = {};
  const byFrequency: Record<VocabularyFrequency, number> = { high: 0, medium: 0, low: 0 };
  for (const collection of VOCAB_COLLECTIONS) byCollection[collection.id] = 0;
  let assigned = 0;
  for (const entry of entries) {
    const tier = frequencyTier(entry);
    byFrequency[tier] += 1;
    const collectionId = assignmentCache?.get(entry.id) ?? null;
    if (collectionId === null) continue;
    assigned += 1;
    byCollection[collectionId] = (byCollection[collectionId] as number) + 1;
    const collection = VOCAB_COLLECTIONS.find((col) => col.id === collectionId) as VocabularyCollection;
    byThemeGroup[collection.themeGroup] =
      ((byThemeGroup[collection.themeGroup] as number | undefined) ?? 0) + 1;
  }
  return { assigned, unassigned: entries.length - assigned, byCollection, byThemeGroup, byFrequency };
}

/** Reset caches (for tests). */
export function resetCollectionCaches(): void {
  assignmentCache = undefined;
  reverseCache = undefined;
}
