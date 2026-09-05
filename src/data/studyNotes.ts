/**
 * Access to the indexed self-study notes collection.
 *
 * The upstream collection <https://github.com/Oxidaner/ielts> is a personal
 * IELTS self-study archive: 2,385 blobs in five skill folders (writing,
 * speaking, listening, reading and exam experience). This module exposes the
 * machine-readable index built by `scripts/extract_study_notes.py`, which
 * classifies every file by skill, category and format and counts the
 * speaking question bank shipped inside the collection.
 *
 * Only metadata is published: the upstream files are third-party materials
 * and are never redistributed by this API.
 */

import { loadDataset } from '../lib/dataset.js';
import { matchesQuery, paginate, sortBy } from '../lib/search.js';

import type { Page } from '../lib/search.js';
import type { StudyNoteItem, StudyNotesStats } from '../types.js';

/** Shape of `data/study-notes.json`. */
export type StudyNotesIndex = {
  meta: {
    name: string;
    repository: string;
    commit: string | null;
    license: string;
    attribution: string;
    note: string;
  };
  stats: StudyNotesStats;
  items: StudyNoteItem[];
};

let cached: StudyNotesIndex | undefined;

/** Return the study-notes index, loading it on first call. */
export function studyNotes(): StudyNotesIndex {
  cached ??= loadDataset<StudyNotesIndex>('study-notes.json');
  return cached;
}

/** Collection-level statistics. */
export function studyNotesStats(): StudyNotesStats {
  return studyNotes().stats;
}

/** Collection-level provenance metadata. */
export function studyNotesMeta(): StudyNotesIndex['meta'] {
  return studyNotes().meta;
}

/** Every indexed file. */
export function studyNoteItems(): readonly StudyNoteItem[] {
  return studyNotes().items;
}

/** Skills covered by the collection. */
export const STUDY_SKILLS = ['general', 'listening', 'reading', 'speaking', 'writing'] as const;

/** Distinct values of an indexed facet. */
export function studyNoteFacets(facet: 'skill' | 'category' | 'format'): string[] {
  const values = new Set<string>();
  for (const item of studyNoteItems()) {
    values.add(item[facet]);
  }
  return [...values].sort();
}

/** Options accepted by {@link searchStudyNotes}. */
export type StudyNotesQuery = {
  /** Free-text search over title and path. */
  query?: string;
  /** Restrict to these skills. */
  skills?: string[];
  /** Restrict to these categories. */
  categories?: string[];
  /** Restrict to these file formats. */
  formats?: string[];
  /** Sort key. */
  sort?: 'title' | 'skill' | 'category' | 'size' | 'path';
  /** Sort direction. */
  order?: 'asc' | 'desc';
  /** Page size. */
  limit: number;
  /** Offset. */
  offset: number;
};

const STUDY_SORT_KEYS: Record<
  NonNullable<StudyNotesQuery['sort']>,
  (item: StudyNoteItem) => string | number
> = {
  title: (item) => item.title.toLowerCase(),
  skill: (item) => item.skill,
  category: (item) => item.category,
  size: (item) => item.sizeBytes,
  path: (item) => item.path,
};

/**
 * Search, filter and paginate the study-notes index.
 *
 * @param options - Search options.
 * @returns A page of matching items.
 */
export function searchStudyNotes(options: StudyNotesQuery): Page<StudyNoteItem> {
  const query = options.query ?? '';
  const skills = options.skills;
  const categories = options.categories;
  const formats = options.formats;
  const filtered = studyNoteItems().filter((item) => {
    if (query.length > 0 && !matchesQuery([item.title, item.path, item.category, item.skill], query)) {
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
  const sortKey = STUDY_SORT_KEYS[options.sort ?? 'title'];
  const order = options.order ?? 'asc';
  const sorted = sortBy(filtered, sortKey, order);
  return paginate(sorted, options.limit, options.offset);
}
