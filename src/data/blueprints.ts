/**
 * Access to the Cambridge test-blueprint index.
 *
 * The upstream platform <https://github.com/wanli4473/yysd-testcenter> ships
 * two hand-annotated taxonomy files that label every question group of
 * Cambridge IELTS volumes 5-21 with a task family, a subject scene and, for
 * most groups, a difficulty rating. `scripts/extract_blueprints.py` normalises
 * those annotations onto the canonical question-type taxonomy and translates
 * the Chinese labels; this module serves the result.
 *
 * Only the annotation is published. No passage text, question wording, answer
 * key or audio is redistributed: the papers are copyright Cambridge University
 * Press & Assessment.
 */

import { loadDataset } from '../lib/dataset.js';
import { matchesFilter, matchesQuery, paginate, sortBy } from '../lib/search.js';

import type { Page } from '../lib/search.js';
import type {
  BlueprintDifficulty,
  BlueprintGroup,
  BlueprintScene,
  BlueprintStats,
  BlueprintTest,
  BlueprintType,
  BlueprintVolume,
} from '../types.js';

/** Provenance record for one upstream annotation file. */
export type BlueprintSource = {
  /** Path within the upstream repository. */
  path: string;
  /** Receptive paper the file annotates. */
  skill: string;
  /** Git blob SHA-1 of the file indexed. */
  sha1: string;
  /** Question groups the file contains. */
  groups: number;
  /** Permalink to the file. */
  url: string;
};

/** Shape of `data/blueprints.json`. */
export type BlueprintIndex = {
  meta: {
    name: string;
    repository: string;
    license: string;
    attribution: string;
    note: string;
    sources: BlueprintSource[];
  };
  stats: BlueprintStats;
  types: BlueprintType[];
  scenes: BlueprintScene[];
  volumes: BlueprintVolume[];
  tests: BlueprintTest[];
  groups: BlueprintGroup[];
};

let cached: BlueprintIndex | undefined;

/** Return the blueprint index, loading it on first call. */
export function blueprints(): BlueprintIndex {
  cached ??= loadDataset<BlueprintIndex>('blueprints.json');
  return cached;
}

/** Index-level statistics. */
export function blueprintStats(): BlueprintStats {
  return blueprints().stats;
}

/** Provenance metadata. */
export function blueprintMeta(): BlueprintIndex['meta'] {
  return blueprints().meta;
}

/** Every annotated question group. */
export function blueprintGroups(): readonly BlueprintGroup[] {
  return blueprints().groups;
}

/** Every annotated paper. */
export function blueprintTests(): readonly BlueprintTest[] {
  return blueprints().tests;
}

/** The question-type table. */
export function blueprintTypes(): readonly BlueprintType[] {
  return blueprints().types;
}

/** The scene table. */
export function blueprintScenes(): readonly BlueprintScene[] {
  return blueprints().scenes;
}

/** The volume table. */
export function blueprintVolumes(): readonly BlueprintVolume[] {
  return blueprints().volumes;
}

/** Look up one paper by identifier. */
export function findBlueprintTest(id: string): BlueprintTest | undefined {
  const needle = id.toLowerCase();
  return blueprintTests().find((test) => test.id.toLowerCase() === needle);
}

/** Look up one question group by identifier. */
export function findBlueprintGroup(id: string): BlueprintGroup | undefined {
  const needle = id.toLowerCase();
  return blueprintGroups().find((group) => group.id.toLowerCase() === needle);
}

/** Every group belonging to a paper, in question order. */
export function groupsOfTest(testId: string): BlueprintGroup[] {
  const needle = testId.toLowerCase();
  return blueprintGroups().filter((group) => group.testId.toLowerCase() === needle);
}

/** Distinct values of an indexed facet. */
export function blueprintFacets(facet: 'skill' | 'questionType' | 'scene' | 'difficulty'): string[] {
  const values = new Set<string>();
  for (const group of blueprintGroups()) {
    const value = group[facet];
    if (value !== null) {
      values.add(value);
    }
  }
  return [...values].sort();
}

/** Options accepted by {@link searchBlueprintGroups}. */
export type BlueprintQuery = {
  /** Free-text search over identifiers and labels. */
  query?: string;
  /** Restrict to these skills. */
  skills?: string[];
  /** Restrict to these canonical question types. */
  questionTypes?: string[];
  /** Restrict to these scenes. */
  scenes?: string[];
  /** Restrict to these difficulty ratings. */
  difficulties?: string[];
  /** Restrict to these Cambridge volumes. */
  volumes?: number[];
  /** Restrict to this section or passage number. */
  part?: number;
  /** Sort key. */
  sort?: 'id' | 'volume' | 'questions' | 'difficulty' | 'questionType';
  /** Sort direction. */
  order?: 'asc' | 'desc';
  /** Page size. */
  limit: number;
  /** Offset. */
  offset: number;
};

/** Rank used when sorting by difficulty; unrated groups sort last. */
const DIFFICULTY_RANK: Record<BlueprintDifficulty, number> = { easy: 1, medium: 2, hard: 3 };

const SORT_KEYS: Record<NonNullable<BlueprintQuery['sort']>, (group: BlueprintGroup) => string | number> = {
  id: (group) => group.id,
  volume: (group) => group.volume * 1000 + group.test * 100 + group.firstQuestion,
  questions: (group) => group.questions,
  difficulty: (group) => (group.difficulty === null ? 4 : DIFFICULTY_RANK[group.difficulty]),
  questionType: (group) => group.questionType,
};

/**
 * Search, filter and paginate the annotated question groups.
 *
 * @param options - Search options.
 * @returns A page of matching groups.
 */
export function searchBlueprintGroups(options: BlueprintQuery): Page<BlueprintGroup> {
  const query = options.query ?? '';
  const filtered = blueprintGroups().filter((group) => {
    if (
      query.length > 0 &&
      !matchesQuery([group.id, group.questionType, group.sceneLabel, group.questionTypeLabel], query)
    ) {
      return false;
    }
    if (!matchesFilter(group.skill as string, options.skills)) {
      return false;
    }
    if (!matchesFilter(group.questionType as string, options.questionTypes)) {
      return false;
    }
    if (options.scenes !== undefined && options.scenes.length > 0) {
      if (group.scene === null || !options.scenes.includes(group.scene)) {
        return false;
      }
    }
    if (options.difficulties !== undefined && options.difficulties.length > 0) {
      if (group.difficulty === null || !options.difficulties.includes(group.difficulty)) {
        return false;
      }
    }
    if (!matchesFilter(group.volume, options.volumes)) {
      return false;
    }
    if (options.part !== undefined && group.part !== options.part) {
      return false;
    }
    return true;
  });
  const sorted = sortBy(filtered, SORT_KEYS[options.sort ?? 'volume'], options.order ?? 'asc');
  return paginate(sorted, options.limit, options.offset);
}
