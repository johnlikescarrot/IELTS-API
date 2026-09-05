/**
 * Access to the indexed IELTS cohort assignment archive.
 *
 * The upstream collection <https://github.com/msneloy/IELTS> preserves the
 * homework writing of a 2022 IELTS preparation cohort: one folder per
 * assignment day, holding the candidates' submitted responses next to the
 * prompt images their teacher assigned. This module exposes the machine-
 * readable index built by `scripts/extract_assignments.py`.
 *
 * Only derived metadata and surface statistics are published: no essay, answer
 * key or prompt is redistributed, and learner names are pseudonymised.
 */

import { loadDataset } from '../lib/dataset.js';
import { matchesQuery, paginate, sortBy } from '../lib/search.js';

import type { Page } from '../lib/search.js';
import type { AssignmentCollectionStats, AssignmentItem, AssignmentTask } from '../types.js';

/** Shape of `data/assignments.json`. */
export type AssignmentIndex = {
  meta: {
    name: string;
    repository: string;
    commit: string | null;
    license: string;
    attribution: string;
    note: string;
  };
  stats: AssignmentCollectionStats;
  items: AssignmentItem[];
};

let cached: AssignmentIndex | undefined;

/** Return the assignment index, loading it on first call. */
export function assignments(): AssignmentIndex {
  cached ??= loadDataset<AssignmentIndex>('assignments.json');
  return cached;
}

/** Collection-level statistics. */
export function assignmentStats(): AssignmentCollectionStats {
  return assignments().stats;
}

/** Collection-level provenance metadata. */
export function assignmentMeta(): AssignmentIndex['meta'] {
  return assignments().meta;
}

/** Every indexed assignment document. */
export function assignmentItems(): readonly AssignmentItem[] {
  return assignments().items;
}

/** Distinct values of an indexed facet; documents without the facet (a `null`
 *  task) contribute nothing. */
export function assignmentFacets(facet: 'genre' | 'learner' | 'task' | 'kind'): string[] {
  const values = new Set<string>();
  for (const item of assignmentItems()) {
    const value = item[facet];
    if (value !== null) {
      values.add(String(value));
    }
  }
  return [...values].sort();
}

/** Options accepted by {@link searchAssignments}. */
export type AssignmentQuery = {
  /** Free-text search over title, identifier and upstream path. */
  query?: string;
  /** Restrict to these writing tasks (`task1`, `task2`). */
  tasks?: AssignmentTask[];
  /** Restrict to these genres. */
  genres?: string[];
  /** Restrict to these learner labels. */
  learners?: string[];
  /** Restrict to these kinds (`submission`, `instructor`). */
  kinds?: string[];
  /** Earliest assignment date, inclusive. */
  from?: string;
  /** Latest assignment date, inclusive. */
  to?: string;
  /** Sort key. */
  sort?: 'date' | 'genre' | 'learner' | 'words' | 'readingEase';
  /** Sort direction. */
  order?: 'asc' | 'desc';
  /** Page size. */
  limit: number;
  /** Offset. */
  offset: number;
};

const ASSIGNMENT_SORT_KEYS: Record<
  NonNullable<AssignmentQuery['sort']>,
  (item: AssignmentItem) => string | number
> = {
  date: (item) => item.date,
  genre: (item) => item.genre,
  learner: (item) => item.learner,
  words: (item) => item.stats.words,
  readingEase: (item) => item.stats.fleschReadingEase,
};

/**
 * Search, filter and paginate the assignment index.
 *
 * @param options - Search options.
 * @returns A page of matching documents.
 */
export function searchAssignments(options: AssignmentQuery): Page<AssignmentItem> {
  const query = options.query ?? '';
  const filtered = assignmentItems().filter((item) => {
    if (query.length > 0 && !matchesQuery([item.title, item.id, item.upstream.path, item.genre], query)) {
      return false;
    }
    if (options.tasks !== undefined && options.tasks.length > 0) {
      if (item.task === null || !options.tasks.includes(item.task)) {
        return false;
      }
    }
    if (options.genres !== undefined && options.genres.length > 0) {
      if (!options.genres.includes(item.genre)) {
        return false;
      }
    }
    if (options.learners !== undefined && options.learners.length > 0) {
      if (!options.learners.includes(item.learner)) {
        return false;
      }
    }
    if (options.kinds !== undefined && options.kinds.length > 0) {
      if (!options.kinds.includes(item.kind)) {
        return false;
      }
    }
    if (options.from !== undefined && item.date < options.from) {
      return false;
    }
    if (options.to !== undefined && item.date > options.to) {
      return false;
    }
    return true;
  });
  const sortKey = ASSIGNMENT_SORT_KEYS[options.sort ?? 'date'];
  const sorted = sortBy(filtered, sortKey, options.order ?? 'asc');
  return paginate(sorted, options.limit, options.offset);
}
