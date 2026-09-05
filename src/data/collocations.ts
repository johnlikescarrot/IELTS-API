/**
 * Access to the Speaking argumentative collocation bank.
 *
 * The bank is mined by `scripts/extract_collocations.py` from Part I of the
 * methodology note in the self-study collection
 * <https://github.com/Oxidaner/ielts>: 245 English collocations and sentence
 * frames, each tagged with the argumentative dimension it serves (personality
 * types, emotional value, money, time, past-versus-present comparisons,
 * either-or questions, specific groups, transferable skills, tradition,
 * nature and nurture, culture), a sub-group, a polarity and the Chinese gloss
 * published upstream. Part II of the note (model answers) is not extracted.
 */

import { loadDataset } from '../lib/dataset.js';
import { matchesQuery, paginate, sortBy } from '../lib/search.js';
import { seededIndices } from '../lib/rng.js';

import type { Page } from '../lib/search.js';
import type { CollocationDimensionInfo, CollocationEntry, CollocationStats } from '../types.js';

/** Shape of `data/collocations.json`. */
export type CollocationBank = {
  meta: {
    name: string;
    source: string;
    sourceUrl: string;
    repository: string;
    commit: string | null;
    license: string;
    attribution: string;
    note: string;
    extraction: string;
  };
  dimensions: Omit<CollocationDimensionInfo, 'phrases'>[];
  stats: CollocationStats;
  items: CollocationEntry[];
};

let cached: CollocationBank | undefined;

/** Return the collocation bank, loading it on first call. */
export function collocations(): CollocationBank {
  cached ??= loadDataset<CollocationBank>('collocations.json');
  return cached;
}

/** Bank-level provenance metadata. */
export function collocationsMeta(): CollocationBank['meta'] {
  return collocations().meta;
}

/** Bank-level statistics. */
export function collocationsStats(): CollocationStats {
  return collocations().stats;
}

/** Every bank entry. */
export function collocationItems(): readonly CollocationEntry[] {
  return collocations().items;
}

/** Polarity values used by the bank. */
export const COLLOCATION_POLARITIES = ['negative', 'neutral', 'positive'] as const;

/** Entry kinds used by the bank. */
export const COLLOCATION_KINDS = ['collocation', 'frame'] as const;

/** The dimension catalogue, annotated with live phrase counts. */
export function collocationDimensions(): CollocationDimensionInfo[] {
  const items = collocationItems();
  return collocations().dimensions.map((dimension) => ({
    ...dimension,
    phrases: items.filter((item) => item.dimension === dimension.id).length,
  }));
}

/** Distinct dimension identifiers that hold at least one phrase. */
export function observedDimensions(): string[] {
  return Object.keys(collocationsStats().byDimension).sort();
}

/** Distinct sub-groups inside a dimension, or across the whole bank. */
export function observedGroups(dimension?: string): string[] {
  const values = new Set<string>();
  for (const item of collocationItems()) {
    if (dimension === undefined || item.dimension === dimension) {
      values.add(item.group);
    }
  }
  return [...values].sort();
}

/** Options accepted by {@link searchCollocations}. */
export type CollocationQuery = {
  /** Free-text search over the phrase, its gloss and its group. */
  query?: string;
  /** Restrict to these dimensions. */
  dimensions?: string[];
  /** Restrict to these sub-groups. */
  groups?: string[];
  /** Restrict to these polarities. */
  polarities?: string[];
  /** Restrict to these kinds. */
  kinds?: string[];
  /** Sort key. */
  sort?: 'phrase' | 'dimension' | 'polarity';
  /** Sort direction. */
  order?: 'asc' | 'desc';
  /** Page size. */
  limit: number;
  /** Offset. */
  offset: number;
};

const COLLOCATION_SORT_KEYS: Record<
  NonNullable<CollocationQuery['sort']>,
  (item: CollocationEntry) => string | number
> = {
  phrase: (item) => item.phrase.toLowerCase(),
  dimension: (item) => item.dimension,
  polarity: (item) => item.polarity,
};

/**
 * Search, filter and paginate the collocation bank.
 *
 * @param options - Search options.
 * @returns A page of matching entries.
 */
export function searchCollocations(options: CollocationQuery): Page<CollocationEntry> {
  const query = options.query ?? '';
  const dimensions = options.dimensions;
  const groups = options.groups;
  const polarities = options.polarities;
  const kinds = options.kinds;
  const filtered = collocationItems().filter((item) => {
    if (query.length > 0 && !matchesQuery([item.phrase, item.gloss, item.group], query)) {
      return false;
    }
    if (dimensions !== undefined && dimensions.length > 0 && !dimensions.includes(item.dimension)) {
      return false;
    }
    if (groups !== undefined && groups.length > 0 && !groups.includes(item.group)) {
      return false;
    }
    if (polarities !== undefined && polarities.length > 0 && !polarities.includes(item.polarity)) {
      return false;
    }
    if (kinds !== undefined && kinds.length > 0 && !kinds.includes(item.kind)) {
      return false;
    }
    return true;
  });
  const sortKey = COLLOCATION_SORT_KEYS[options.sort ?? 'phrase'];
  const order = options.order ?? 'asc';
  const sorted = sortBy(filtered, sortKey, order);
  return paginate(sorted, options.limit, options.offset);
}

/**
 * Deterministically choose a page of random entries for a seed.
 *
 * @param seed - Seed string (e.g. an ISO date).
 * @param count - How many entries to return.
 */
export function randomCollocations(seed: string, count: number): CollocationEntry[] {
  const items = collocationItems();
  return seededIndices(seed, items.length, count).map((index) => items[index] as CollocationEntry);
}
