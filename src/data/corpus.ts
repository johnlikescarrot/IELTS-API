/**
 * Access to the indexed research corpus.
 *
 * The upstream corpus <https://github.com/zhengyishiming/IELTS> is a flat dump
 * of 404 files, of which roughly a fifth is IELTS or English-learning material;
 * the remainder covers semiconductors, music and cryptocurrency. This module
 * exposes the curated, machine-readable index built by
 * `scripts/extract_corpus.py`.
 *
 * Only metadata is published: the upstream files are third-party materials and
 * are never redistributed by this API.
 */

import { loadDataset } from '../lib/dataset.js';
import { paginate, matchesQuery, sortBy } from '../lib/search.js';

import type { Page } from '../lib/search.js';
import type { CorpusItem, CorpusStats } from '../types.js';

/** Shape of `data/corpus.json`. */
export type CorpusIndex = {
  meta: {
    name: string;
    repository: string;
    commit: string | null;
    license: string;
    attribution: string;
    note: string;
  };
  stats: CorpusStats;
  items: CorpusItem[];
};

let cached: CorpusIndex | undefined;

/** Return the corpus index, loading it on first call. */
export function corpus(): CorpusIndex {
  cached ??= loadDataset<CorpusIndex>('corpus.json');
  return cached;
}

/** Corpus-level statistics. */
export function corpusStats(): CorpusStats {
  return corpus().stats;
}

/** Corpus-level provenance metadata. */
export function corpusMeta(): CorpusIndex['meta'] {
  return corpus().meta;
}

/** Every indexed corpus item. */
export function corpusItems(): readonly CorpusItem[] {
  return corpus().items;
}

/** Distinct values of an indexed facet. */
export function corpusFacets(facet: 'category' | 'skill' | 'format'): string[] {
  const values = new Set<string>();
  for (const item of corpusItems()) {
    values.add(item[facet]);
  }
  return [...values].sort();
}

/** Options accepted by {@link searchCorpus}. */
export type CorpusQuery = {
  /** Free-text search over title and path. */
  query?: string;
  /** Restrict to these categories. */
  categories?: string[];
  /** Restrict to these skills. */
  skills?: string[];
  /** Restrict to these file formats. */
  formats?: string[];
  /** Sort key. */
  sort?: 'title' | 'category' | 'skill' | 'size';
  /** Sort direction. */
  order?: 'asc' | 'desc';
  /** Page size. */
  limit: number;
  /** Offset. */
  offset: number;
};

const CORPUS_SORT_KEYS: Record<NonNullable<CorpusQuery['sort']>, (item: CorpusItem) => string | number> = {
  title: (item) => item.title.toLowerCase(),
  category: (item) => item.category,
  skill: (item) => item.skill,
  size: (item) => item.sizeBytes,
};

/**
 * Search, filter and paginate the corpus index.
 *
 * @param options - Search options.
 * @returns A page of matching items.
 */
export function searchCorpus(options: CorpusQuery): Page<CorpusItem> {
  const query = options.query ?? '';
  const categories = options.categories;
  const skills = options.skills;
  const formats = options.formats;
  const filtered = corpusItems().filter((item) => {
    if (query.length > 0 && !matchesQuery([item.title, item.path, item.category, item.skill], query)) {
      return false;
    }
    if (categories !== undefined && categories.length > 0 && !categories.includes(item.category)) {
      return false;
    }
    if (skills !== undefined && skills.length > 0 && !skills.includes(item.skill)) {
      return false;
    }
    if (formats !== undefined && formats.length > 0 && !formats.includes(item.format)) {
      return false;
    }
    return true;
  });
  const sortKey = CORPUS_SORT_KEYS[options.sort ?? 'title'];
  const order = options.order ?? 'asc';
  const sorted = sortBy(filtered, sortKey, order);
  return paginate(sorted, options.limit, options.offset);
}
