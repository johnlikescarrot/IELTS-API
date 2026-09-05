/**
 * Access to the exam-season recall index.
 *
 * The upstream collection <https://github.com/Oxidaner/ielts> is a self-study
 * archive of Chinese IELTS exam recall (机经) material: a seasonal speaking
 * bank, recalled reading passages grouped by recurrence tier, and recalled
 * listening tests with answer keys. This module exposes the curated,
 * machine-readable structure index built by `scripts/extract_exam_recall.py`.
 *
 * Only structure and metadata are published: titles, counts, categories and
 * provenance. No cue-card wording, question text, passage, transcript, audio
 * or answer value from the upstream collection is redistributed by this API.
 */

import { loadDataset } from '../lib/dataset.js';
import { paginate, matchesQuery, sortBy } from '../lib/search.js';

import type { Page } from '../lib/search.js';
import type { RecallItem, RecallKind, RecallSkill, RecallStats, RecallStatus, RecallTier } from '../types.js';

/** Shape of `data/exam-recall.json`. */
export type RecallIndex = {
  meta: {
    name: string;
    repository: string;
    commit: string | null;
    license: string;
    attribution: string;
    note: string;
  };
  stats: RecallStats;
  items: RecallItem[];
};

/** Facets available on the recall index. */
export type RecallFacet = 'kind' | 'skill' | 'collection' | 'tier' | 'category' | 'status' | 'season';

let cached: RecallIndex | undefined;

/** Return the recall index, loading it on first call. */
export function recall(): RecallIndex {
  cached ??= loadDataset<RecallIndex>('exam-recall.json');
  return cached;
}

/** Recall-level statistics. */
export function recallStats(): RecallStats {
  return recall().stats;
}

/** Recall-level provenance metadata. */
export function recallMeta(): RecallIndex['meta'] {
  return recall().meta;
}

/** Every indexed recall item. */
export function recallItems(): readonly RecallItem[] {
  return recall().items;
}

/** Kinds that occur in the index, in stable order. */
export const RECALL_KINDS: readonly RecallKind[] = [
  'speaking-topic',
  'speaking-cue-card',
  'reading-article',
  'listening-test',
];

/** Skills that occur in the index, in stable order. */
export const RECALL_SKILLS: readonly RecallSkill[] = ['speaking', 'reading', 'listening'];

/** Cue-card categories that occur in the index, in stable order. */
export const RECALL_CATEGORIES: readonly string[] = ['people', 'objects', 'events', 'places'];

/** Cue-card statuses that occur in the index, in stable order. */
export const RECALL_STATUSES: readonly RecallStatus[] = ['new', 'retained'];

/** Recurrence tiers that occur in the index, in stable order. */
export const RECALL_TIERS: readonly RecallTier[] = ['high', 'next', 'background'];

/** Parts that occur in the index, in stable order. */
export const RECALL_PARTS: readonly number[] = [1, 2, 3];

function facetValues(selector: (item: RecallItem) => string | null): string[] {
  const values = new Set<string>();
  for (const item of recallItems()) {
    const value = selector(item);
    if (value !== null) {
      values.add(value);
    }
  }
  return [...values].sort();
}

/** Distinct values of an indexed facet, sorted. */
export function recallFacets(facet: RecallFacet): string[] {
  switch (facet) {
    case 'kind':
      return facetValues((item) => item.kind);
    case 'skill':
      return facetValues((item) => item.skill);
    case 'tier':
      return facetValues((item) => item.tier);
    case 'category':
      return facetValues((item) => item.category);
    case 'status':
      return facetValues((item) => item.status);
    case 'season':
      return facetValues((item) => item.season);
    case 'collection':
      return facetValues((item) => item.collection);
  }
}

/** Every collection identifier in the index, in stable order. */
export function recallCollections(): string[] {
  return recallFacets('collection');
}

/** Look up one recall item by identifier (case-insensitive, trimmed). */
export function findRecallItem(id: string): RecallItem | undefined {
  const needle = id.trim().toLowerCase();
  return recallItems().find((item) => item.id === needle);
}

/** Options accepted by {@link searchRecallItems}. */
export type RecallQuery = {
  /** Free-text search over titles and identifiers. */
  query?: string;
  /** Restrict to these kinds. */
  kinds?: RecallKind[];
  /** Restrict to these skills. */
  skills?: RecallSkill[];
  /** Restrict to these collections. */
  collections?: string[];
  /** Restrict to these recurrence tiers. */
  tiers?: RecallTier[];
  /** Restrict to these cue-card categories. */
  categories?: string[];
  /** Restrict to these cue-card statuses. */
  statuses?: RecallStatus[];
  /** Restrict to these seasons. */
  seasons?: string[];
  /** Restrict to these parts. */
  parts?: number[];
  /** Sort key. */
  sort?: 'id' | 'title' | 'questions' | 'part';
  /** Sort direction. */
  order?: 'asc' | 'desc';
  /** Page size. */
  limit: number;
  /** Offset. */
  offset: number;
};

const RECALL_SORT_KEYS: Record<NonNullable<RecallQuery['sort']>, (item: RecallItem) => string | number> = {
  id: (item) => item.id,
  title: (item) => item.title.toLowerCase(),
  questions: (item) => item.questions ?? -1,
  part: (item) => item.part ?? 0,
};

/**
 * Search, filter and paginate the recall index.
 *
 * @param options - Search options.
 * @returns A page of matching items.
 */
export function searchRecallItems(options: RecallQuery): Page<RecallItem> {
  const query = options.query ?? '';
  const filtered = recallItems().filter((item) => {
    if (query.length > 0 && !matchesQuery([item.title, item.titleEn, item.titleZh, item.id], query)) {
      return false;
    }
    if (options.kinds !== undefined && options.kinds.length > 0 && !options.kinds.includes(item.kind)) {
      return false;
    }
    if (options.skills !== undefined && options.skills.length > 0 && !options.skills.includes(item.skill)) {
      return false;
    }
    if (
      options.collections !== undefined &&
      options.collections.length > 0 &&
      !options.collections.includes(item.collection)
    ) {
      return false;
    }
    if (
      options.tiers !== undefined &&
      options.tiers.length > 0 &&
      (item.tier === null || !options.tiers.includes(item.tier))
    ) {
      return false;
    }
    if (
      options.categories !== undefined &&
      options.categories.length > 0 &&
      (item.category === null || !options.categories.includes(item.category))
    ) {
      return false;
    }
    if (
      options.statuses !== undefined &&
      options.statuses.length > 0 &&
      (item.status === null || !options.statuses.includes(item.status))
    ) {
      return false;
    }
    if (
      options.seasons !== undefined &&
      options.seasons.length > 0 &&
      (item.season === null || !options.seasons.includes(item.season))
    ) {
      return false;
    }
    if (
      options.parts !== undefined &&
      options.parts.length > 0 &&
      (item.part === null || !options.parts.includes(item.part))
    ) {
      return false;
    }
    return true;
  });
  const sortKey = RECALL_SORT_KEYS[options.sort ?? 'id'];
  const order = options.order ?? 'asc';
  const sorted = sortBy(filtered, sortKey, order);
  return paginate(sorted, options.limit, options.offset);
}
