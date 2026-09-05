/**
 * Access to the indexed learner-writing and sample-task collection.
 *
 * The upstream collection <https://github.com/msneloy/IELTS> is the public
 * archive of an IELTS preparation group: twelve official-style Academic
 * Reading sample-task sheets, one per task family, and seven dated classroom
 * sessions (August 2022) of authentic learner writing — Task 1 reports and
 * Task 2 essays — with the chart images they describe, one grammar exercise
 * and one prompt set. The remainder of the repository is third-party
 * copyrighted material (Cambridge books and cassettes, grammar and
 * practice-test audio) and is deliberately not indexed item-by-item.
 *
 * This module exposes the curated, machine-readable index built by
 * `scripts/extract_samples.py`. Only metadata is published: no upstream file
 * is redistributed by this API.
 */

import { loadDataset } from '../lib/dataset.js';
import { matchesQuery, paginate, sortBy } from '../lib/search.js';

import type { Page } from '../lib/search.js';
import type { QuestionTypeId, SampleItem, SamplesStats } from '../types.js';

/** Shape of `data/samples.json`. */
export type SamplesIndex = {
  meta: {
    name: string;
    repository: string;
    commit: string | null;
    license: string;
    attribution: string;
    note: string;
  };
  stats: SamplesStats;
  items: SampleItem[];
};

let cached: SamplesIndex | undefined;

/** Return the samples index, loading it on first call. */
export function samples(): SamplesIndex {
  cached ??= loadDataset<SamplesIndex>('samples.json');
  return cached;
}

/** Collection-level statistics. */
export function samplesStats(): SamplesStats {
  return samples().stats;
}

/** Collection-level provenance metadata. */
export function samplesMeta(): SamplesIndex['meta'] {
  return samples().meta;
}

/** Every indexed learner-writing file and reading sample task. */
export function samplesItems(): readonly SampleItem[] {
  return samples().items;
}

/** Find one indexed item by its stable identifier. */
export function findSample(id: string): SampleItem | undefined {
  return samplesItems().find((item) => item.id === id);
}

/** Item fields that can be listed as facet values or used as filters. */
export type SampleFacet =
  'collection' | 'kind' | 'skill' | 'format' | 'session' | 'author' | 'taskFamily' | 'questionType';

/** Distinct non-null values of an indexed facet, sorted. */
export function samplesFacets(facet: SampleFacet): string[] {
  const values = new Set<string>();
  for (const item of samplesItems()) {
    const value = item[facet];
    if (value !== null) {
      values.add(value);
    }
  }
  return [...values].sort();
}

/** Options accepted by {@link searchSamples}. */
export type SamplesQuery = {
  /** Free-text search over title, path, task family, session and author. */
  query?: string;
  /** Restrict to these collections (`learner-writing`, `reading-sample`). */
  collections?: string[];
  /** Restrict to these kinds (`essay`, `prompt`, `exercise`, ...). */
  kinds?: string[];
  /** Restrict to these skills. */
  skills?: string[];
  /** Restrict to these file formats. */
  formats?: string[];
  /** Restrict to these classroom session dates (ISO). */
  sessions?: string[];
  /** Restrict to these authors, as published upstream. */
  authors?: string[];
  /** Restrict to these task families (`/v1/tasks/writing` ids, `task-2`). */
  tasks?: string[];
  /** Restrict to these canonical question types. */
  types?: string[];
  /** Sort key. */
  sort?: 'id' | 'title' | 'session' | 'size';
  /** Sort direction. */
  order?: 'asc' | 'desc';
  /** Page size. */
  limit: number;
  /** Offset. */
  offset: number;
};

const SAMPLE_SORT_KEYS: Record<NonNullable<SamplesQuery['sort']>, (item: SampleItem) => string | number> = {
  id: (item) => item.id,
  title: (item) => item.title.toLowerCase(),
  session: (item) => item.session ?? '',
  size: (item) => item.sizeBytes,
};

/**
 * Search, filter and paginate the samples index.
 *
 * @param options - Search options.
 * @returns A page of matching items.
 */
export function searchSamples(options: SamplesQuery): Page<SampleItem> {
  const query = options.query ?? '';
  const filtered = samplesItems().filter((item) => {
    if (
      query.length > 0 &&
      !matchesQuery(
        [item.title, item.path, item.kind, item.taskFamily, item.session, item.author, item.questionType],
        query,
      )
    ) {
      return false;
    }
    if (!matchesFilterValue(item.collection, options.collections)) {
      return false;
    }
    if (!matchesFilterValue(item.kind, options.kinds)) {
      return false;
    }
    if (!matchesFilterValue(item.skill, options.skills)) {
      return false;
    }
    if (!matchesFilterValue(item.format, options.formats)) {
      return false;
    }
    if (!matchesFilterValue(item.session, options.sessions)) {
      return false;
    }
    if (!matchesFilterValue(item.author, options.authors)) {
      return false;
    }
    if (!matchesFilterValue(item.taskFamily, options.tasks)) {
      return false;
    }
    if (!matchesFilterValue(item.questionType, options.types)) {
      return false;
    }
    return true;
  });
  const sortKey = SAMPLE_SORT_KEYS[options.sort ?? 'id'];
  const order = options.order ?? 'asc';
  const sorted = sortBy(filtered, sortKey, order);
  return paginate(sorted, options.limit, options.offset);
}

/** `null`-aware membership test used by every nullable filter above. */
function matchesFilterValue(
  value: string | QuestionTypeId | null,
  filter: readonly string[] | undefined,
): boolean {
  return filter === undefined || filter.length === 0 || (value !== null && filter.includes(value));
}
