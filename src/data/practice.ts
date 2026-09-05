/**
 * Access to the open practice-corpus index.
 *
 * The upstream practice corpus
 * <https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS> publishes four
 * families of IELTS practice material (102 graded listening lessons, 204
 * listening full tests, 1,232 CEFR-graded reading lessons and 315 advertised
 * reading full tests) as HTML and JSON files. This module exposes the
 * metadata-only index built by `scripts/extract_practice.py`: identifiers,
 * levels, lengths, question counts and item-type frequencies.
 *
 * Only derived metadata is published: the upstream passages, questions and
 * audio are third-party materials and are never redistributed by this API,
 * and the upstream learner workbook is excluded from the index entirely.
 */

import { loadDataset } from '../lib/dataset.js';
import { matchesAny, matchesQuery, paginate, sortBy } from '../lib/search.js';

import type { Page } from '../lib/search.js';
import type { PracticeItem, PracticeItemType, PracticeSeriesFacts, PracticeStats, Skill } from '../types.js';

/** Shape of `data/practice.json`. */
export type PracticeIndex = {
  meta: {
    name: string;
    repository: string;
    commit: string;
    license: string;
    attribution: string;
    note: string;
    tool: string;
  };
  series: PracticeSeriesFacts[];
  items: PracticeItem[];
  stats: PracticeStats;
  itemTypeFacts: Record<string, { aliases: string[]; occurrences: number }>;
};

/** Curated presentation data for the four series (original prose). */
const SERIES_INFO: Record<PracticeSeriesFacts['id'], { name: string; description: string; home: string }> = {
  'listening-102': {
    name: 'Listening 102 graded lessons',
    description:
      'Three levelled lanes of 34 short graded listening lessons each (Basic, Intermediate, Advanced), published with audio.',
    home: 'https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS/tree/main/Listening_102_Basic',
  },
  'listening-204': {
    name: 'Listening 204 full tests',
    description:
      'Full listening tests as section/question JSON files; most carry a normalised variant and a minority a worked-strategy guide.',
    home: 'https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS/tree/main/Listening_204_FullTest',
  },
  'reading-1232': {
    name: 'Reading 1,232 CEFR-graded lessons',
    description:
      'Graded reading lessons across three CEFR bands (A1-A2, B1-B2, C1-C2) with questions, glossary notes and test tactics.',
    home: 'https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS/tree/main/Reading_1232_Basic',
  },
  'reading-315': {
    name: 'Reading 315 full tests',
    description:
      'Full reading tests as section/passage/question JSON files; about a third of the published range is only available in the raw variant.',
    home: 'https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS/tree/main/Reading_315_FullTest',
  },
};

/**
 * Curated item-type taxonomy (original descriptions). The identifiers must
 * match `itemTypeFacts` keys in the dataset — a test guards the join.
 */
const ITEM_TYPE_INFO: readonly { id: string; label: string; skills: Skill[]; description: string }[] = [
  {
    id: 'multiple-choice',
    label: 'Multiple choice',
    skills: ['listening', 'reading'],
    description:
      'Select the letter that completes an answer or a question; some variants accept more than one option.',
  },
  {
    id: 'true-false-notgiven',
    label: 'True / False / Not Given',
    skills: ['reading', 'listening'],
    description: 'Judge whether a statement agrees with, contradicts or is not stated by the passage.',
  },
  {
    id: 'yes-no-notgiven',
    label: 'Yes / No / Not Given',
    skills: ['reading'],
    description: 'Judge whether a statement agrees with, contradicts or is not the writer’s opinion.',
  },
  {
    id: 'matching-headings',
    label: 'Matching headings',
    skills: ['reading'],
    description: 'Choose the heading that summarises each listed paragraph or section.',
  },
  {
    id: 'matching-information',
    label: 'Matching information',
    skills: ['reading', 'listening'],
    description: 'Locate which paragraph, section or speaker carries a given piece of information.',
  },
  {
    id: 'matching-features',
    label: 'Matching features',
    skills: ['reading'],
    description: 'Match statements to a set of options such as people, theories or time periods.',
  },
  {
    id: 'matching-sentence-endings',
    label: 'Matching sentence endings',
    skills: ['reading'],
    description: 'Complete a sentence with the ending that both fits grammatically and agrees with the text.',
  },
  {
    id: 'locating-information',
    label: 'Locating information',
    skills: ['reading'],
    description: 'Identify which paragraph contains each given piece of information.',
  },
  {
    id: 'sentence-completion',
    label: 'Sentence completion',
    skills: ['reading', 'listening'],
    description: 'Fill the gap in a sentence with words taken from the text or a word list.',
  },
  {
    id: 'summary-completion',
    label: 'Summary, note, table, flow-chart completion',
    skills: ['reading'],
    description: 'Complete a summary of the text with words from the passage, optionally from a list.',
  },
  {
    id: 'form-note-completion',
    label: 'Form, note, table, flow-chart, summary completion',
    skills: ['listening'],
    description: 'Fill gaps in a form, note, table or flow chart while listening.',
  },
  {
    id: 'diagram-label-completion',
    label: 'Diagram / map / plan labelling',
    skills: ['listening', 'reading'],
    description: 'Label parts of a diagram, map or plan, usually choosing from the recording or a list.',
  },
  {
    id: 'short-answer-questions',
    label: 'Short-answer questions',
    skills: ['reading', 'listening'],
    description: 'Answer a question with a few words taken directly from the text or recording.',
  },
  {
    id: 'classification',
    label: 'Classification',
    skills: ['reading'],
    description: 'Assign items to one of several categories given in the text.',
  },
];

let cached: PracticeIndex | undefined;

/** Return the practice index, loading it on first call. */
export function practice(): PracticeIndex {
  cached ??= loadDataset<PracticeIndex>('practice.json');
  return cached;
}

/** Practice-corpus provenance metadata. */
export function practiceMeta(): PracticeIndex['meta'] {
  return practice().meta;
}

/** Practice-corpus statistics. */
export function practiceStats(): PracticeStats {
  return practice().stats;
}

/** Every indexed practice item. */
export function practiceItems(): readonly PracticeItem[] {
  return practice().items;
}

/** Series facts joined with the curated name, description and home URL. */
export type PracticeSeriesInfo = PracticeSeriesFacts & { name: string; description: string; home: string };

/** All four series rows, presentation data included. */
export function practiceSeries(): PracticeSeriesInfo[] {
  return practice().series.map((facts) => {
    const info = SERIES_INFO[facts.id] as { name: string; description: string; home: string };
    return { ...facts, ...info };
  });
}

/** Distinct values of an indexed practice facet. */
export function practiceFacets(facet: 'series' | 'level' | 'type'): string[] {
  if (facet === 'series') {
    return [...new Set(practiceItems().map((item) => item.series))].sort();
  }
  if (facet === 'level') {
    const levels = practiceItems().map((item) => item.level);
    return [...new Set(levels.filter((level): level is string => level !== null))].sort();
  }
  const types = practiceItems().flatMap((item) => item.types);
  return [...new Set(types)].sort();
}

/** The item-type taxonomy joined with occurrence data from the dataset. */
export function practiceItemTypes(): PracticeItemType[] {
  const facts = practice().itemTypeFacts;
  return ITEM_TYPE_INFO.map((info) => {
    const fact = facts[info.id] as { aliases: string[]; occurrences: number };
    return { ...info, aliases: fact.aliases, occurrences: fact.occurrences };
  });
}

/** Options accepted by {@link searchPractice}. */
export type PracticeQuery = {
  /** Free-text search over identifier and upstream path. */
  query?: string;
  /** Restrict to these series. */
  series?: string[];
  /** Restrict to these levels. */
  levels?: string[];
  /** Match items carrying any of these normalised type labels. */
  types?: string[];
  /** Restrict to one skill. */
  skill?: Skill;
  /** Restrict to one kind. */
  kind?: PracticeItem['kind'];
  /** Sort key. */
  sort?: 'id' | 'series' | 'level' | 'number' | 'questions' | 'words';
  /** Sort direction. */
  order?: 'asc' | 'desc';
  /** Page size. */
  limit: number;
  /** Offset. */
  offset: number;
};

const PRACTICE_SORT_KEYS: Record<
  NonNullable<PracticeQuery['sort']>,
  (item: PracticeItem) => string | number
> = {
  id: (item) => item.id,
  series: (item) => item.series,
  level: (item) => item.level ?? '',
  number: (item) => item.number,
  questions: (item) => item.questions ?? 0,
  words: (item) => item.words ?? 0,
};

/**
 * Search, filter and paginate the practice index.
 *
 * @param options - Search options.
 * @returns A page of matching items.
 */
export function searchPractice(options: PracticeQuery): Page<PracticeItem> {
  const query = options.query ?? '';
  const filtered = practiceItems().filter((item) => {
    if (query.length > 0 && !matchesQuery([item.id, item.upstreamPath, item.level, item.series], query)) {
      return false;
    }
    if (!matchesFilterValue(item.series, options.series)) {
      return false;
    }
    if (!matchesFilterValue(item.level, options.levels)) {
      return false;
    }
    if (!matchesAny(item.types, options.types)) {
      return false;
    }
    if (options.skill !== undefined && item.skill !== options.skill) {
      return false;
    }
    if (options.kind !== undefined && item.kind !== options.kind) {
      return false;
    }
    return true;
  });
  const sortKey = PRACTICE_SORT_KEYS[options.sort ?? 'id'];
  const sorted = sortBy(filtered, sortKey, options.order ?? 'asc');
  return paginate(sorted, options.limit, options.offset);
}

/** `true` when the item value passes the (possibly empty) filter. */
function matchesFilterValue(value: string | null, filter: readonly string[] | undefined): boolean {
  if (filter === undefined || filter.length === 0) {
    return true;
  }
  return value !== null && filter.includes(value);
}

/**
 * Look up one indexed practice item by identifier (case-insensitive).
 *
 * @param id - Item identifier, e.g. `reading_a1_a2_001` or `listening-204-test-1`.
 */
export function findPracticeItem(id: string): PracticeItem | undefined {
  const needle = id.toLowerCase();
  return practiceItems().find((item) => item.id.toLowerCase() === needle);
}
