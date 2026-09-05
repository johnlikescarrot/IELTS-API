/**
 * Access to the original CEFR-levelled Reading item bank.
 *
 * The items are original work authored for the IELTS API, calibrated to the
 * CEFR reading levels and the Academic Reading question-type taxonomy that
 * recur in open IELTS preparation practice corpora (see `data/reading.json`).
 * No third-party passage or question is reproduced.
 */

import { loadDataset } from '../lib/dataset.js';
import { paginate, matchesQuery, matchesFilter, sortBy } from '../lib/search.js';
import { seededIndices } from '../lib/rng.js';

import type { Page } from '../lib/search.js';
import type { ReadingItem, ReadingLevel, ReadingMeta, ReadingQuestionType, ReadingStats } from '../types.js';

/** Shape of `data/reading.json`. */
export type ReadingDataset = {
  meta: ReadingMeta;
  items: ReadingItem[];
};

/** CEFR levels present in the item bank. */
export const READING_LEVELS: readonly ReadingLevel[] = ['A1-A2', 'B1-B2', 'C1-C2'];

/** Question types present in the item bank and served by the API. */
export const READING_QUESTION_TYPES: readonly ReadingQuestionType[] = [
  'multiple-choice',
  'true-false-not-given',
  'yes-no-not-given',
  'matching-information',
  'matching-headings',
  'summary-completion',
  'sentence-completion',
  'diagram-labelling',
  'short-answer',
];

let cached: ReadingDataset | undefined;

/** Return the reading dataset, loading it on first call. */
export function reading(): ReadingDataset {
  cached ??= loadDataset<ReadingDataset>('reading.json');
  return cached;
}

/** Dataset-level provenance metadata. */
export function readingMeta(): ReadingMeta {
  return reading().meta;
}

/** Every reading item. */
export function readingItems(): readonly ReadingItem[] {
  return reading().items;
}

/** Aggregate statistics for the item bank. */
export function readingStats(): ReadingStats {
  const byLevel: Record<ReadingLevel, number> = { 'A1-A2': 0, 'B1-B2': 0, 'C1-C2': 0 };
  const byTopic: Record<string, number> = {};
  let questions = 0;
  for (const item of readingItems()) {
    byLevel[item.level] += 1;
    byTopic[item.topic] = (byTopic[item.topic] ?? 0) + 1;
    questions += item.questions.length;
  }
  return { items: readingItems().length, questions, byLevel, byTopic };
}

/** Distinct topic values in the item bank. */
export function readingTopics(): string[] {
  return [...new Set(readingItems().map((item) => item.topic))].sort();
}

/** Look up one reading item by identifier. */
export function findReadingItem(id: string): ReadingItem | undefined {
  return readingItems().find((item) => item.id === id);
}

/** Options accepted by {@link searchReading}. */
export type ReadingQuery = {
  /** Free-text search over title, topic, passage and question text. */
  query?: string;
  /** Restrict to these CEFR levels. */
  levels?: ReadingLevel[];
  /** Restrict to these topics. */
  topics?: string[];
  /** Restrict to items containing at least one of these question types. */
  questionTypes?: ReadingQuestionType[];
  /** Sort key. */
  sort?: 'level' | 'title' | 'topic' | 'wordCount';
  /** Sort direction. */
  order?: 'asc' | 'desc';
  /** Page size. */
  limit: number;
  /** Offset. */
  offset: number;
};

const LEVEL_ORDER: Record<ReadingLevel, number> = { 'A1-A2': 0, 'B1-B2': 1, 'C1-C2': 2 };

const READING_SORT_KEYS: Record<NonNullable<ReadingQuery['sort']>, (item: ReadingItem) => string | number> = {
  title: (item) => item.title.toLowerCase(),
  topic: (item) => item.topic,
  level: (item) => LEVEL_ORDER[item.level],
  wordCount: (item) => item.wordCount,
};

/** Index of question types covering a given item. */
function questionTypesOf(item: ReadingItem): ReadingQuestionType[] {
  return [...new Set(item.questions.map((question) => question.type))];
}

/**
 * Search, filter and paginate the reading item bank.
 *
 * @param options - Search options.
 * @returns A page of matching items.
 */
export function searchReading(options: ReadingQuery): Page<ReadingItem> {
  const query = options.query ?? '';
  const levels = options.levels;
  const topics = options.topics;
  const questionTypes = options.questionTypes;
  const filtered = readingItems().filter((item) => {
    if (query.length > 0) {
      const haystack = [
        item.title,
        item.topic,
        item.passage,
        ...item.questions.flatMap((q) => [q.text, q.explanation]),
      ];
      if (!matchesQuery(haystack, query)) {
        return false;
      }
    }
    if (!matchesFilter(item.level, levels)) {
      return false;
    }
    if (!matchesFilter(item.topic, topics)) {
      return false;
    }
    if (
      questionTypes !== undefined &&
      questionTypes.length > 0 &&
      !questionTypes.every((type) => questionTypesOf(item).includes(type))
    ) {
      return false;
    }
    return true;
  });
  const sortKey = READING_SORT_KEYS[options.sort ?? 'level'];
  const order = options.order ?? 'asc';
  const sorted = sortBy(filtered, sortKey, order);
  return paginate(sorted, options.limit, options.offset);
}

/**
 * Return a deterministic sample of reading items.
 *
 * @param seed - Seed controlling the sample.
 * @param count - Number of items to return.
 * @param level - Optional CEFR level to restrict the pool to.
 */
export function randomReadingItems(seed: string, count: number, level?: ReadingLevel): ReadingItem[] {
  const items = level === undefined ? readingItems() : readingItems().filter((item) => item.level === level);
  return seededIndices(seed, items.length, count).map((index) => items[index] as ReadingItem);
}
