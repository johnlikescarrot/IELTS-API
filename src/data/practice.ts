/** Read-only queries over the committed, metadata-only practice snapshot. */
import { loadDataset } from '../lib/dataset.js';
import { matchesQuery, paginate } from '../lib/search.js';
import { seededIndices } from '../lib/rng.js';
import type { Page } from '../lib/search.js';
import type {
  PracticeCatalog,
  PracticeCollection,
  PracticeCollectionId,
  PracticeItem,
  PracticeLevel,
  PracticeStats,
} from '../types.js';

function catalog(): PracticeCatalog {
  return loadDataset<PracticeCatalog>('practice.json');
}

/** Export an isolated copy; callers cannot mutate the cached research snapshot. */
export function practiceCatalog(): PracticeCatalog {
  return structuredClone(catalog());
}

/** Exact snapshot, rights limitations, methodology and payload checksum. */
export function practiceMeta(): PracticeCatalog['meta'] {
  return structuredClone(catalog().meta);
}

/** Observed structural counts; these are not learning outcomes. */
export function practiceStats(): PracticeStats {
  return structuredClone(catalog().stats);
}

/** Collection definitions and their documented, rather than observed, counts. */
export function practiceCollections(): PracticeCollection[] {
  return structuredClone(catalog().collections);
}

/** Filters shared by search and seeded sampling. */
export type PracticeFilter = {
  collection?: PracticeCollectionId;
  skill?: PracticeItem['skill'];
  level?: PracticeLevel;
  complete?: boolean;
  query?: string;
};

function filteredItems(filter: PracticeFilter): PracticeItem[] {
  const query = filter.query ?? '';
  return catalog().items.filter((item) => {
    if (filter.collection !== undefined && item.collection !== filter.collection) return false;
    if (filter.skill !== undefined && item.skill !== filter.skill) return false;
    if (filter.level !== undefined && item.level !== filter.level) return false;
    if (filter.complete !== undefined && item.structurallyComplete !== filter.complete) return false;
    return query.length === 0 || matchesQuery([item.id, item.sourcePath, item.skill, item.level], query);
  });
}

/** Search in stable path-derived ID order and return a detached page. */
export function searchPractice(
  options: PracticeFilter & { limit: number; offset: number },
): Page<PracticeItem> {
  return structuredClone(paginate(filteredItems(options), options.limit, options.offset));
}

/** Find a path-derived ID, returning undefined when the unit is absent. */
export function findPracticeItem(id: string): PracticeItem | undefined {
  return structuredClone(catalog().items.find((item) => item.id === id));
}

/**
 * Sample without replacement using FNV-1a + mulberry32 + partial Fisher-Yates.
 * Pin the snapshot digest as well as the seed. Results are in stable ID order;
 * the result is capped at the matching population, not padded with duplicates.
 */
export function samplePractice(seed: string, count: number, filter: PracticeFilter = {}): PracticeItem[] {
  const items = filteredItems(filter);
  return structuredClone(seededIndices(seed, items.length, count).map((index) => items[index]!));
}
