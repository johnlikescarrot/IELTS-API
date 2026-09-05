/** Metadata-only reading/listening discovery and reproducible sampling. */

import { createHash } from 'node:crypto';

import { loadDataset } from '../lib/dataset.js';
import { badRequest } from '../lib/errors.js';
import { seededIndices } from '../lib/rng.js';
import { matchesQuery, paginate } from '../lib/search.js';
import { PRACTICE_SAMPLING_ALGORITHM } from './practice-source.js';

import type { Page } from '../lib/search.js';
import type {
  PracticeAudioStatus,
  PracticeCollection,
  PracticeCollectionId,
  PracticeIndex,
  PracticeItem,
  PracticeLevel,
  PracticeManifest,
  PracticeMode,
  PracticeSkill,
} from '../types.js';

/** Load, verify and freeze a dataset once per dataset-cache lifetime. */
function practiceIndex(): PracticeIndex {
  const index = loadDataset<PracticeIndex>('practice.json');
  if (!Object.isFrozen(index)) {
    const hash = createHash('sha256').update(JSON.stringify(index.items)).digest('hex');
    if (hash !== index.integrity.value)
      throw new Error('Practice metadata checksum mismatch. Regenerate data/practice.json.');
    for (const item of index.items) Object.freeze(item);
    for (const collection of index.collections) {
      Object.freeze(collection.levels);
      Object.freeze(collection);
    }
    for (const counts of Object.values(index.stats)) Object.freeze(counts);
    Object.freeze(index.items);
    Object.freeze(index.collections);
    Object.freeze(index.stats);
    Object.freeze(index.source);
    Object.freeze(index.rights);
    Object.freeze(index.integrity);
    Object.freeze(index);
  }
  return index;
}

/** Public provenance, rights, integrity and statistics, without the item array. */
export function practiceManifest(): PracticeManifest {
  const index = practiceIndex();
  return {
    schemaVersion: index.schemaVersion,
    source: index.source,
    rights: index.rights,
    integrity: index.integrity,
    collections: index.collections,
    stats: index.stats,
  };
}

/** The four collections, with measured and advertised item counts kept separate. */
export function practiceCollections(): readonly PracticeCollection[] {
  return practiceIndex().collections;
}

/** Filters shared by practice search and seeded sampling; filters intersect. */
export type PracticeFilters = {
  /** Case-insensitive substring search over ID, generic title and source path. */
  query?: string | undefined;
  skill?: PracticeSkill | undefined;
  collection?: PracticeCollectionId | undefined;
  level?: PracticeLevel | undefined;
  mode?: PracticeMode | undefined;
  audio?: PracticeAudioStatus | undefined;
};

function filteredItems(options: PracticeFilters): PracticeItem[] {
  return practiceIndex().items.filter(
    (item) =>
      matchesQuery([item.id, item.title, item.path], options.query ?? '') &&
      (options.skill === undefined || item.skill === options.skill) &&
      (options.collection === undefined || item.collection === options.collection) &&
      (options.level === undefined || item.level === options.level) &&
      (options.mode === undefined || item.mode === options.mode) &&
      (options.audio === undefined || item.audio === options.audio),
  );
}

/** Search and paginate in stable, locale-independent ID order. */
export function searchPractice(
  options: PracticeFilters & { limit: number; offset: number },
): Page<PracticeItem> {
  return paginate(filteredItems(options), options.limit, options.offset);
}

/** Look up one path-derived ID; absent source items are never synthesised. */
export function findPracticeItem(id: string): PracticeItem | undefined {
  return practiceIndex().items.find((item) => item.id === id);
}

/** A replayable sample plus the effective sampling population and algorithm. */
export type PracticeSample = {
  items: PracticeItem[];
  seed: string;
  requested: number;
  population: number;
  samplingAlgorithm: string;
};

/**
 * Sample without replacement from a filtered, ID-sorted population. A non-empty
 * seed is required. Returns at most the population size, with no invented items.
 * Replay requires the same seed, filters, count, dataset and algorithm version.
 */
export function samplePractice(options: PracticeFilters & { seed: string; count: number }): PracticeSample {
  const seed = options.seed.trim();
  const length = [...seed].length;
  if (length === 0 || length > 256) {
    throw badRequest('Parameter "seed" must contain 1-256 characters after trimming.', { parameter: 'seed' });
  }
  if (!Number.isInteger(options.count) || options.count < 1 || options.count > 50) {
    throw badRequest('Parameter "count" must be an integer between 1 and 50.', { parameter: 'count' });
  }
  const population = filteredItems(options);
  const indices = seededIndices(seed, population.length, options.count);
  return {
    items: indices.map((index) => population[index] as PracticeItem),
    seed,
    requested: options.count,
    population: population.length,
    samplingAlgorithm: PRACTICE_SAMPLING_ALGORITHM,
  };
}
