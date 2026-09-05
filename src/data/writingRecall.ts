/**
 * Access to the recalled writing-task index.
 *
 * The upstream collection <https://github.com/Oxidaner/ielts> bundles
 * crowd-recalled ("jijing") Writing Task 2 prompts from computer-delivered
 * IELTS sessions between 2024-12-01 and 2025-01-31, annotated by a preparer
 * with question type, theme and difficulty. Recalled prompts are oral history
 * about the test, not an official release: the derivation keeps the short
 * factual record (prompt text, normalised type, theme, difficulty,
 * recurrence) and redistributes none of the upstream model answers or scoring
 * annotations. `scripts/extract_writing_recall.py` performs the derivation.
 */

import { loadDataset } from '../lib/dataset.js';
import { matchesQuery, paginate, sortBy } from '../lib/search.js';

import type { Page } from '../lib/search.js';
import type { RecallFamily, RecallType, RecalledPrompt } from '../types.js';

/** Shape of `data/writing-recall.json`. */
export type WritingRecallIndex = {
  meta: {
    name: string;
    repository: string;
    upstreamPath: string;
    columns: string[];
    license: string;
    attribution: string;
    note: string;
    cleaning: string;
  };
  stats: {
    rows: number;
    prompts: number;
    repeatedPrompts: number;
    withDifficulty: number;
    withSecondaryTheme: number;
    skippedRows: number;
    byType: Record<RecallType, number>;
    byRawType: Record<string, number>;
    byFamily: Record<RecallFamily, number>;
    byTheme: Record<string, number>;
    byDifficulty: Record<string, number>;
  };
  prompts: RecalledPrompt[];
};

/** The parsed dataset. */
function index(): WritingRecallIndex {
  return loadDataset<WritingRecallIndex>('writing-recall.json');
}

/** Normalised recalled question types accepted by the filter. */
export const RECALL_TYPES: readonly RecallType[] = [
  'agree-disagree',
  'positive-negative',
  'advantage-disadvantage',
  'discuss-both-views',
  'two-part',
];

/** Essay families a recalled prompt can belong to. */
export const RECALL_FAMILIES: readonly RecallFamily[] = [
  'opinion',
  'discussion',
  'advantages-disadvantages',
  'two-part',
];

/** Thematic labels observed in the source sheet, verbatim. */
export const RECALL_THEMES: readonly string[] = [...Object.keys(index().stats.byTheme)];

/** Summary statistics of the recall index. */
export function recallStats(): WritingRecallIndex['stats'] {
  return index().stats;
}

/** Provenance metadata of the recall index. */
export function recallMeta(): WritingRecallIndex['meta'] {
  return index().meta;
}

/**
 * Return recalled prompts, optionally filtered.
 *
 * @param options - Type, family, theme and free-text filters.
 */
export function findRecalledPrompts(options: {
  type?: RecallType | undefined;
  family?: RecallFamily | undefined;
  theme?: string | undefined;
  query?: string | undefined;
}): RecalledPrompt[] {
  const { type, family, theme, query = '' } = options;
  return index().prompts.filter((prompt) => {
    if (type !== undefined && prompt.type !== type) {
      return false;
    }
    if (family !== undefined && prompt.family !== family) {
      return false;
    }
    if (theme !== undefined && prompt.theme !== theme) {
      return false;
    }
    return query.length === 0 || matchesQuery([prompt.prompt, prompt.themeGloss], query);
  });
}

/**
 * Return one page of the recalled prompts.
 *
 * @param options - Filter, sort and pagination options.
 */
export function recalledPromptsPage(options: {
  type?: RecallType | undefined;
  family?: RecallFamily | undefined;
  theme?: string | undefined;
  query?: string | undefined;
  sort?: 'id' | 'difficulty' | 'occurrences' | undefined;
  order?: 'asc' | 'desc' | undefined;
  limit: number;
  offset: number;
}): Page<RecalledPrompt> {
  const { sort = 'id', order = 'asc' } = options;
  const filtered = findRecalledPrompts(options);
  const sorted = sortBy(
    filtered,
    (prompt) =>
      sort === 'difficulty' ? prompt.difficulty : sort === 'occurrences' ? prompt.occurrences : prompt.id,
    order,
  );
  return paginate(sorted, options.limit, options.offset);
}

/**
 * Find one recalled prompt by identifier.
 *
 * @param id - Prompt identifier.
 */
export function findRecalledPrompt(id: string): RecalledPrompt | undefined {
  return index().prompts.find((prompt) => prompt.id === id);
}
