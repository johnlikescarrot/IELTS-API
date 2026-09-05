/**
 * Access to the practice-test structure and readability index.
 *
 * The upstream collection <https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS>
 * publishes 315 full reading tests, 204 full listening tests and 1,232
 * CEFR-graded reading lessons behind a paid login. Part of that material is
 * scraped third-party content, so this API redistributes none of it: the index
 * built by `scripts/extract_practice_tests.py` holds derived metadata only -
 * structure, normalised question types, provenance and passage-level
 * readability statistics.
 */

import { loadDataset } from '../lib/dataset.js';
import { matchesFilter, matchesQuery, paginate, sortBy } from '../lib/search.js';

import type { Page } from '../lib/search.js';
import type {
  CefrBand,
  PracticeCollection,
  PracticeItem,
  PracticeStats,
  QuestionTypeId,
  ReadabilityStats,
} from '../types.js';

/** Shape of `data/practice-tests.json`. */
export type PracticeIndex = {
  meta: {
    name: string;
    repository: string;
    commit: string | null;
    license: string;
    attribution: string;
    note: string;
    collections: Record<string, string>;
    upstreamDirectories: Record<string, number>;
  };
  stats: PracticeStats;
  items: PracticeItem[];
};

/** Collections exposed by `/v1/tests`. */
export const PRACTICE_COLLECTIONS: readonly PracticeCollection[] = [
  'reading-full-test',
  'listening-full-test',
  'graded-reading',
];

/** Skills covered by the indexed collections. */
export const PRACTICE_SKILLS = ['reading', 'listening'] as const;

/** CEFR bands used by the graded reading collection. */
export const CEFR_BANDS: readonly CefrBand[] = ['A1-A2', 'B1-B2', 'C1-C2'];

let cached: PracticeIndex | undefined;

/** Return the practice-test index, loading it on first call. */
export function practiceIndex(): PracticeIndex {
  cached ??= loadDataset<PracticeIndex>('practice-tests.json');
  return cached;
}

/** Index-level provenance metadata. */
export function practiceMeta(): PracticeIndex['meta'] {
  return practiceIndex().meta;
}

/** Aggregate statistics over the index. */
export function practiceStats(): PracticeStats {
  return practiceIndex().stats;
}

/** Every indexed item. */
export function practiceItems(): readonly PracticeItem[] {
  return practiceIndex().items;
}

/**
 * Look up one item by identifier.
 *
 * @param id - Case-insensitive item identifier (`rft-001`).
 */
export function findPracticeItem(id: string): PracticeItem | undefined {
  const needle = id.trim().toLowerCase();
  return practiceItems().find((item) => item.id === needle);
}

/** Question types that actually occur in the index, in taxonomy order. */
export function observedQuestionTypes(): QuestionTypeId[] {
  return Object.keys(practiceStats().questionTypes) as QuestionTypeId[];
}

/** Options accepted by {@link searchPracticeItems}. */
export type PracticeQuery = {
  /** Free-text search over title, identifier and source path. */
  query?: string;
  /** Restrict to these collections. */
  collections?: PracticeCollection[];
  /** Restrict to these skills. */
  skills?: ('reading' | 'listening')[];
  /** Restrict to these CEFR bands. */
  levels?: CefrBand[];
  /** Keep only items containing every one of these question types. */
  types?: QuestionTypeId[];
  /** Minimum number of questions. */
  minQuestions?: number;
  /** Maximum number of questions. */
  maxQuestions?: number;
  /** Minimum Flesch Reading Ease (drops items without readability data). */
  minReadingEase?: number;
  /** Maximum Flesch Reading Ease (drops items without readability data). */
  maxReadingEase?: number;
  /** Keep only items that ship an audio recording. */
  withAudio?: boolean;
  /** Sort key. */
  sort?: 'id' | 'title' | 'questions' | 'words' | 'reading-ease' | 'grade';
  /** Sort direction. */
  order?: 'asc' | 'desc';
  /** Page size. */
  limit: number;
  /** Offset. */
  offset: number;
};

/** Sort keys defined for every item. */
const ITEM_SORT_KEYS = {
  id: (item: PracticeItem) => item.id,
  title: (item: PracticeItem) => item.title.toLowerCase(),
  questions: (item: PracticeItem) => item.questions,
} as const;

/** Sort keys defined only for items with a written passage. */
const READABILITY_SORT_KEYS = {
  words: (stats: ReadabilityStats) => stats.words,
  'reading-ease': (stats: ReadabilityStats) => stats.fleschReadingEase,
  grade: (stats: ReadabilityStats) => stats.fleschKincaidGrade,
} as const;

/**
 * Search, filter and paginate the practice-test index.
 *
 * @param options - Search options.
 * @returns A page of matching items.
 */
export function searchPracticeItems(options: PracticeQuery): Page<PracticeItem> {
  const query = options.query ?? '';
  const filtered = practiceItems().filter((item) => {
    if (query.length > 0 && !matchesQuery([item.title, item.id, item.sourcePath], query)) {
      return false;
    }
    if (!matchesFilter(item.collection, options.collections)) {
      return false;
    }
    if (!matchesFilter(item.skill, options.skills)) {
      return false;
    }
    if (options.levels !== undefined && options.levels.length > 0) {
      if (item.level === null || !options.levels.includes(item.level)) {
        return false;
      }
    }
    if (options.types !== undefined && options.types.length > 0) {
      if (!options.types.every((type) => item.questionTypes.includes(type))) {
        return false;
      }
    }
    if (options.minQuestions !== undefined && item.questions < options.minQuestions) {
      return false;
    }
    if (options.maxQuestions !== undefined && item.questions > options.maxQuestions) {
      return false;
    }
    if (options.minReadingEase !== undefined) {
      if (item.readability === null || item.readability.fleschReadingEase < options.minReadingEase) {
        return false;
      }
    }
    if (options.maxReadingEase !== undefined) {
      if (item.readability === null || item.readability.fleschReadingEase > options.maxReadingEase) {
        return false;
      }
    }
    if (options.withAudio === true && !item.assets.audio) {
      return false;
    }
    return true;
  });
  const sort = options.sort ?? 'id';
  const order = options.order ?? 'asc';
  if (sort === 'id' || sort === 'title' || sort === 'questions') {
    return paginate(sortBy(filtered, ITEM_SORT_KEYS[sort], order), options.limit, options.offset);
  }
  // Readability is undefined for listening items and for very short passages;
  // those items keep their identifier order and always sort last.
  const key = READABILITY_SORT_KEYS[sort];
  const rated = filtered.filter((item) => item.readability !== null);
  const unrated = filtered.filter((item) => item.readability === null);
  const sorted = sortBy(rated, (item) => key(item.readability as ReadabilityStats), order);
  return paginate([...sorted, ...unrated], options.limit, options.offset);
}

/** Facet values available for filtering, derived from the index. */
export function practiceFacets(): Record<string, readonly string[]> {
  return {
    collection: PRACTICE_COLLECTIONS,
    skill: PRACTICE_SKILLS,
    level: CEFR_BANDS,
    type: observedQuestionTypes(),
  };
}
