/**
 * Access to the indexed study-materials collection.
 *
 * The upstream collection <https://github.com/Oxidaner/ielts> aggregates the
 * material a candidate actually collects while preparing: past-paper recall
 * banks, question banks, scenario vocabulary, essay templates, idea banks,
 * method notes, mock-practice packages and saved reading-passage websites.
 * This module exposes the machine-readable index built by
 * `scripts/extract_materials.py`.
 *
 * Only metadata is published: the upstream files are third-party materials and
 * are never redistributed by this API.
 */

import { loadDataset } from '../lib/dataset.js';
import { paginate, matchesQuery, sortBy } from '../lib/search.js';

import type { Page } from '../lib/search.js';
import type { MaterialsItem, MaterialsStats } from '../types.js';

/** Shape of `data/materials.json`. */
export type MaterialsIndex = {
  meta: {
    name: string;
    repository: string;
    commit: string | null;
    license: string;
    attribution: string;
    note: string;
  };
  stats: MaterialsStats;
  items: MaterialsItem[];
};

let cached: MaterialsIndex | undefined;

/** Return the materials index, loading it on first call. */
export function materials(): MaterialsIndex {
  cached ??= loadDataset<MaterialsIndex>('materials.json');
  return cached;
}

/** Collection-level statistics. */
export function materialsStats(): MaterialsStats {
  return materials().stats;
}

/** Collection-level provenance metadata. */
export function materialsMeta(): MaterialsIndex['meta'] {
  return materials().meta;
}

/** Every indexed materials item. */
export function materialsItems(): readonly MaterialsItem[] {
  return materials().items;
}

/** Distinct values of an indexed facet. */
export function materialsFacets(facet: 'category' | 'skill' | 'format'): string[] {
  const values = new Set<string>();
  for (const item of materialsItems()) {
    values.add(item[facet]);
  }
  return [...values].sort();
}

/** Options accepted by {@link searchMaterials}. */
export type MaterialsQuery = {
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

const MATERIALS_SORT_KEYS: Record<
  NonNullable<MaterialsQuery['sort']>,
  (item: MaterialsItem) => string | number
> = {
  title: (item) => item.title.toLowerCase(),
  category: (item) => item.category,
  skill: (item) => item.skill,
  size: (item) => item.sizeBytes,
};

/**
 * Search, filter and paginate the materials index.
 *
 * @param options - Search options.
 * @returns A page of matching items.
 */
export function searchMaterials(options: MaterialsQuery): Page<MaterialsItem> {
  const query = options.query ?? '';
  const categories = options.categories;
  const skills = options.skills;
  const formats = options.formats;
  const filtered = materialsItems().filter((item) => {
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
  const sortKey = MATERIALS_SORT_KEYS[options.sort ?? 'title'];
  const order = options.order ?? 'asc';
  const sorted = sortBy(filtered, sortKey, order);
  return paginate(sorted, options.limit, options.offset);
}
