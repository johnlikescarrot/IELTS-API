/**
 * Cross-dataset search.
 *
 * One query against every dataset the API publishes. Matching is deliberately
 * simple and fully documented: case-insensitive, score 4 for an exact match on
 * the primary field, 3 for a prefix, 2 for a substring of the primary field
 * and 1 for a substring of any secondary field. Hits are ordered by score and
 * then by their stable identifier, so identical queries always return
 * byte-identical responses.
 */

import { corpusItems } from '../data/corpus.js';
import { RESPONSE_FRAMEWORKS } from '../data/frameworks.js';
import { materialsItems } from '../data/materials.js';
import { practiceItems } from '../data/practiceTests.js';
import { QUESTION_TYPES } from '../data/questionTypes.js';
import { RESOURCES } from '../data/resources.js';
import { TASK_TYPES } from '../data/tasks.js';
import { EXAM_THEMES } from '../data/themes.js';
import { SPEAKING_TOPICS, WRITING_TOPICS } from '../data/topics.js';
import { allEntries } from '../data/vocabulary.js';

import type { DatasetSearch, SearchDatasetId, SearchHit } from '../types.js';

/** Maximum snippet length; longer fields are clipped with an ellipsis. */
export const MAX_SNIPPET_LENGTH = 140;

/**
 * Score one item against the query.
 *
 * @param primary - Field that names the item (word, prompt, title).
 * @param secondaries - Additional fields consulted at the lowest score; `null`
 *   and `undefined` entries are skipped.
 * @param query - Needle, already lower-cased and trimmed.
 * @returns 0 for no match, 1-4 for a match (higher is stronger).
 */
export function scoreFields(
  primary: string,
  secondaries: readonly (string | null | undefined)[],
  query: string,
): number {
  const field = primary.toLowerCase();
  if (field === query) {
    return 4;
  }
  if (field.startsWith(query)) {
    return 3;
  }
  if (field.includes(query)) {
    return 2;
  }
  for (const secondary of secondaries) {
    if (secondary === null || secondary === undefined) {
      continue;
    }
    if (secondary.toLowerCase().includes(query)) {
      return 1;
    }
  }
  return 0;
}

/**
 * Clip text to a single-line snippet.
 *
 * @param text - Raw text, possibly `null`.
 * @returns A single line of at most {@link MAX_SNIPPET_LENGTH} characters, or `null`.
 */
export function snippetOf(text: string | null | undefined): string | null {
  if (text === null || text === undefined) {
    return null;
  }
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length === 0) {
    return null;
  }
  return flat.length > MAX_SNIPPET_LENGTH ? `${flat.slice(0, MAX_SNIPPET_LENGTH - 1).trimEnd()}…` : flat;
}

/**
 * The snippet of the first usable field.
 *
 * @param values - Candidate fields, any of which may be `null` or empty.
 * @returns The clipped snippet of the first non-empty value, or `null`.
 */
export function firstSnippet(values: readonly (string | null | undefined)[]): string | null {
  for (const value of values) {
    const snippet = snippetOf(value);
    if (snippet !== null) {
      return snippet;
    }
  }
  return null;
}

/** One searchable dataset: how it is labelled and how its items become hits. */
interface SearchAdapter {
  /** Dataset identifier used in the `datasets` parameter. */
  id: SearchDatasetId;
  /** Human-readable name. */
  label: string;
  /** Browse endpoint of the dataset. */
  endpoint: string;
  /** Produce every hit for the query (unscored items are excluded). */
  search: (query: string) => SearchHit[];
}

/** Build one hit; returns `null` when the item does not match. */
function hit(
  dataset: SearchDatasetId,
  ref: string,
  title: string,
  secondaries: readonly (string | null | undefined)[],
  url: string,
  query: string,
): SearchHit | null {
  const score = scoreFields(title, secondaries, query);
  if (score === 0) {
    return null;
  }
  return {
    ref,
    dataset,
    title,
    snippet: firstSnippet(secondaries),
    url,
    score,
    field: score > 1 ? 'primary' : 'secondary',
  };
}

/** Keep only matching items and collect their hits. */
function collect<T>(items: readonly T[], build: (item: T) => SearchHit | null): SearchHit[] {
  const hits: SearchHit[] = [];
  for (const item of items) {
    const built = build(item);
    if (built !== null) {
      hits.push(built);
    }
  }
  return hits;
}

/** The searchable datasets, in registry order. */
export const SEARCH_ADAPTERS: readonly SearchAdapter[] = [
  {
    id: 'vocabulary',
    label: 'Cambridge IELTS 1-22 vocabulary',
    endpoint: '/v1/vocabulary',
    search: (query) =>
      collect(allEntries(), (entry) =>
        hit(
          'vocabulary',
          entry.id,
          entry.word,
          [entry.definition, entry.senses.map((sense) => sense.text).join(' ')],
          `/v1/vocabulary/${encodeURIComponent(entry.word)}`,
          query,
        ),
      ),
  },
  {
    id: 'writing-topics',
    label: 'Writing Task 2 prompts',
    endpoint: '/v1/topics/writing',
    search: (query) =>
      collect(WRITING_TOPICS, (topic) =>
        hit(
          'writing-topics',
          topic.id,
          topic.prompt,
          [topic.category, topic.questionType],
          '/v1/topics/writing',
          query,
        ),
      ),
  },
  {
    id: 'speaking-topics',
    label: 'Speaking items',
    endpoint: '/v1/topics/speaking',
    search: (query) =>
      collect(SPEAKING_TOPICS, (topic) =>
        hit(
          'speaking-topics',
          topic.id,
          topic.questions.join(' '),
          [topic.topic],
          '/v1/topics/speaking',
          query,
        ),
      ),
  },
  {
    id: 'task-types',
    label: 'Writing Task 1 families',
    endpoint: '/v1/tasks/writing',
    search: (query) =>
      collect(TASK_TYPES, (task) =>
        hit('task-types', task.id, task.name, [task.description], '/v1/tasks/writing', query),
      ),
  },
  {
    id: 'question-types',
    label: 'Question-type taxonomy',
    endpoint: '/v1/question-types',
    search: (query) =>
      collect(QUESTION_TYPES, (type) =>
        hit(
          'question-types',
          type.id,
          type.name,
          [type.description, type.assesses],
          `/v1/question-types/${type.id}`,
          query,
        ),
      ),
  },
  {
    id: 'frameworks',
    label: 'Response frameworks',
    endpoint: '/v1/frameworks',
    search: (query) =>
      collect(RESPONSE_FRAMEWORKS, (framework) =>
        hit(
          'frameworks',
          framework.id,
          framework.name,
          [framework.summary],
          `/v1/frameworks/${framework.id}`,
          query,
        ),
      ),
  },
  {
    id: 'themes',
    label: 'Recurring exam themes',
    endpoint: '/v1/topics/themes',
    search: (query) =>
      collect(EXAM_THEMES, (theme) =>
        hit('themes', theme.id, theme.name, [theme.group, ...theme.keywords], '/v1/topics/themes', query),
      ),
  },
  {
    id: 'resources',
    label: 'Free preparation resources',
    endpoint: '/v1/resources',
    search: (query) =>
      collect(RESOURCES, (resource) =>
        hit(
          'resources',
          resource.id,
          resource.name,
          [resource.provider, resource.description],
          '/v1/resources',
          query,
        ),
      ),
  },
  {
    id: 'corpus',
    label: 'Research corpus index',
    endpoint: '/v1/corpus/items',
    search: (query) =>
      collect(corpusItems(), (item) =>
        hit('corpus', item.id, item.title, [item.path, item.category, item.skill], '/v1/corpus/items', query),
      ),
  },
  {
    id: 'materials',
    label: 'Study-materials index',
    endpoint: '/v1/materials/items',
    search: (query) =>
      collect(materialsItems(), (item) =>
        hit(
          'materials',
          item.id,
          item.title,
          [item.path, item.category, item.skill],
          '/v1/materials/items',
          query,
        ),
      ),
  },
  {
    id: 'tests',
    label: 'Practice-test index',
    endpoint: '/v1/tests/items',
    search: (query) =>
      collect(practiceItems(), (item) =>
        hit('tests', item.id, item.title, [item.id, item.collection], `/v1/tests/${item.id}`, query),
      ),
  },
];

/** Identifiers of every searchable dataset, in registry order. */
export const SEARCH_DATASET_IDS: readonly SearchDatasetId[] = SEARCH_ADAPTERS.map((adapter) => adapter.id);

/** Outcome of a cross-dataset search. */
export type SearchReport = {
  /** The query as executed (trimmed, original case). */
  query: string;
  /** Total hits across every searched dataset. */
  matches: number;
  /** Per-dataset outcomes, keyed by dataset identifier. */
  datasets: Partial<Record<SearchDatasetId, DatasetSearch>>;
};

/**
 * Run a cross-dataset search.
 *
 * @param query - Needle, already trimmed; matching is case-insensitive.
 * @param datasetIds - Datasets to search; `undefined` searches all of them.
 * @param limit - Maximum hits returned per dataset.
 */
export function runSearch(
  query: string,
  datasetIds: readonly SearchDatasetId[] | undefined,
  limit: number,
): SearchReport {
  const needle = query.toLowerCase();
  const adapters = SEARCH_ADAPTERS.filter(
    (adapter) => datasetIds === undefined || datasetIds.includes(adapter.id),
  );
  const datasets: Partial<Record<SearchDatasetId, DatasetSearch>> = {};
  let matches = 0;
  for (const adapter of adapters) {
    const hits = adapter
      .search(needle)
      .sort((left, right) => right.score - left.score || left.ref.localeCompare(right.ref));
    matches += hits.length;
    datasets[adapter.id] = {
      label: adapter.label,
      endpoint: adapter.endpoint,
      total: hits.length,
      items: hits.slice(0, limit),
    };
  }
  return { query, matches, datasets };
}
