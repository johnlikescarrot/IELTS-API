/**
 * Access to the indexed open IELTS practice corpus.
 *
 * The upstream corpus <https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS>
 * is a large, homogeneous pool of CEFR-levelled IELTS practice material: 1,232
 * levelled reading lessons, 314 full reading tests, 204 full listening tests,
 * 102 basic listening lessons and their audio. This module exposes the curated,
 * machine-readable index built by `scripts/extract_practice.py`.
 *
 * Only metadata is published: the upstream files are third-party materials and
 * are never redistributed by this API. The research contribution is the index
 * itself, which records that this corpus is essentially all IELTS-relevant.
 */

import { loadDataset } from '../lib/dataset.js';
import { paginate, matchesQuery, matchesFilter, sortBy } from '../lib/search.js';

import type { Page } from '../lib/search.js';
import type { PracticeItem, PracticeLevel, PracticeModule, PracticeStats } from '../types.js';

/** Shape of `data/practice.json`. */
export type PracticeIndex = {
  meta: {
    name: string;
    repository: string;
    commit: string | null;
    license: string;
    attribution: string;
    note: string;
  };
  stats: PracticeStats;
  items: PracticeItem[];
};

/** Practice modules in the index. */
export const PRACTICE_MODULES: readonly PracticeModule[] = [
  'reading-band',
  'reading-full-test',
  'listening-full-test',
  'listening-basic',
];

let cached: PracticeIndex | undefined;

/** Return the practice index, loading it on first call. */
export function practice(): PracticeIndex {
  cached ??= loadDataset<PracticeIndex>('practice.json');
  return cached;
}

/** Practice-corpus statistics. */
export function practiceStats(): PracticeStats {
  return practice().stats;
}

/** Practice-corpus provenance metadata. */
export function practiceMeta(): PracticeIndex['meta'] {
  return practice().meta;
}

/** Every indexed practice item. */
export function practiceItems(): readonly PracticeItem[] {
  return practice().items;
}

/** Distinct values of an indexed facet. */
export function practiceFacets(facet: 'module' | 'level' | 'format'): string[] {
  const values = new Set<string>();
  for (const item of practiceItems()) {
    if (facet === 'module') {
      values.add(item.module);
    } else if (facet === 'level') {
      if (item.level !== null) {
        values.add(item.level);
      }
    } else {
      values.add(item.format);
    }
  }
  return [...values].sort();
}

/** Options accepted by {@link searchPractice}. */
export type PracticeQuery = {
  /** Free-text search over title and path. */
  query?: string;
  /** Restrict to these modules. */
  modules?: PracticeModule[];
  /** Restrict to these levels. */
  levels?: PracticeLevel[];
  /** Restrict to these file formats. */
  formats?: string[];
  /** Sort key. */
  sort?: 'title' | 'module' | 'level' | 'size';
  /** Sort direction. */
  order?: 'asc' | 'desc';
  /** Page size. */
  limit: number;
  /** Offset. */
  offset: number;
};

const PRACTICE_SORT_KEYS: Record<
  NonNullable<PracticeQuery['sort']>,
  (item: PracticeItem) => string | number
> = {
  title: (item) => item.title.toLowerCase(),
  module: (item) => item.module,
  level: (item) => item.level ?? '',
  size: (item) => item.sizeBytes ?? 0,
};

/**
 * Search, filter and paginate the practice index.
 *
 * @param options - Search options.
 * @returns A page of matching items.
 */
export function searchPractice(options: PracticeQuery): Page<PracticeItem> {
  const query = options.query ?? '';
  const modules = options.modules;
  const levels = options.levels;
  const formats = options.formats;
  const filtered = practiceItems().filter((item) => {
    if (query.length > 0 && !matchesQuery([item.title, item.path, item.module], query)) {
      return false;
    }
    if (!matchesFilter(item.module, modules)) {
      return false;
    }
    if (!matchesFilter(item.level, levels)) {
      return false;
    }
    if (formats !== undefined && formats.length > 0 && !formats.includes(item.format)) {
      return false;
    }
    return true;
  });
  const sortKey = PRACTICE_SORT_KEYS[options.sort ?? 'title'];
  const order = options.order ?? 'asc';
  const sorted = sortBy(filtered, sortKey, order);
  return paginate(sorted, options.limit, options.offset);
}
