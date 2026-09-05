/**
 * Access to the indexed Oxidaner/ielts collection.
 *
 * The upstream collection <https://github.com/Oxidaner/ielts> is a personal
 * dump of IELTS self-study material organised by skill — roughly five
 * gigabytes of PDFs, listening audio, scanned workbooks and web archives. This
 * module exposes the curated, machine-readable index built by
 * `scripts/extract_oxidaner.py`.
 *
 * Only metadata is published: the upstream files are third-party materials and
 * are never redistributed by this API.
 */

import { loadDataset } from '../lib/dataset.js';
import { matchesQuery, paginate, sortBy } from '../lib/search.js';

import type { Page } from '../lib/search.js';
import type { OxidanerItem, OxidanerStats } from '../types.js';

/** Shape of `data/oxidaner.json`. */
export type OxidanerIndex = {
  meta: {
    name: string;
    repository: string;
    commit: string | null;
    retrieved: string;
    license: string;
    attribution: string;
    note: string;
  };
  stats: OxidanerStats;
  items: OxidanerItem[];
};

let cached: OxidanerIndex | undefined;

/** Return the collection index, loading it on first call. */
export function oxidaner(): OxidanerIndex {
  cached ??= loadDataset<OxidanerIndex>('oxidaner.json');
  return cached;
}

/** Collection-level statistics. */
export function oxidanerStats(): OxidanerStats {
  return oxidaner().stats;
}

/** Collection-level provenance metadata. */
export function oxidanerMeta(): OxidanerIndex['meta'] {
  return oxidaner().meta;
}

/** Every indexed collection item. */
export function oxidanerItems(): readonly OxidanerItem[] {
  return oxidaner().items;
}

/** Distinct values of an indexed facet. */
export function oxidanerFacets(facet: 'skill' | 'category' | 'format'): string[] {
  const values = new Set<string>();
  for (const item of oxidanerItems()) {
    values.add(item[facet]);
  }
  return [...values].sort();
}

/** Options accepted by {@link searchOxidaner}. */
export type OxidanerQuery = {
  /** Free-text search over title and path. */
  query?: string;
  /** Restrict to these skills. */
  skills?: string[];
  /** Restrict to these categories. */
  categories?: string[];
  /** Restrict to these file formats. */
  formats?: string[];
  /** Sort key. */
  sort?: 'title' | 'skill' | 'category' | 'size';
  /** Sort direction. */
  order?: 'asc' | 'desc';
  /** Page size. */
  limit: number;
  /** Offset. */
  offset: number;
};

const OXIDANER_SORT_KEYS: Record<
  NonNullable<OxidanerQuery['sort']>,
  (item: OxidanerItem) => string | number
> = {
  title: (item) => item.title.toLowerCase(),
  skill: (item) => item.skill,
  category: (item) => item.category,
  size: (item) => item.sizeBytes,
};

/**
 * Search, filter and paginate the collection index.
 *
 * @param options - Search options.
 * @returns A page of matching items.
 */
export function searchOxidaner(options: OxidanerQuery): Page<OxidanerItem> {
  const query = options.query ?? '';
  const skills = options.skills;
  const categories = options.categories;
  const formats = options.formats;
  const filtered = oxidanerItems().filter((item) => {
    if (query.length > 0 && !matchesQuery([item.title, item.path, item.skill, item.category], query)) {
      return false;
    }
    if (skills !== undefined && skills.length > 0 && !skills.includes(item.skill)) {
      return false;
    }
    if (categories !== undefined && categories.length > 0 && !categories.includes(item.category)) {
      return false;
    }
    if (formats !== undefined && formats.length > 0 && !formats.includes(item.format)) {
      return false;
    }
    return true;
  });
  const sortKey = OXIDANER_SORT_KEYS[options.sort ?? 'title'];
  const order = options.order ?? 'asc';
  const sorted = sortBy(filtered, sortKey, order);
  return paginate(sorted, options.limit, options.offset);
}
