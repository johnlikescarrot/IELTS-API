/**
 * Access to the Cambridge IELTS test-structure index.
 *
 * The upstream collection <https://github.com/wanli4473/yysd-testcenter> is
 * the content library of an online mock-exam centre: 222 self-grading HTML
 * pages re-typesetting the Cambridge IELTS 3-21 Academic tests, each with a
 * structured test object, plus two editorial taxonomies that tag every
 * question group with a type, a topic scene and a difficulty. This module
 * exposes the machine-readable index built by `scripts/extract_cambridge.py`.
 *
 * Only derived, non-substitutive metadata and statistics are published: no
 * passage, question, answer key, prompt text, image or audio is redistributed.
 */

import { loadDataset } from '../lib/dataset.js';
import { matchesFilter, matchesQuery, paginate, sortBy } from '../lib/search.js';

import type { Page } from '../lib/search.js';
import type {
  CambridgeDifficulty,
  CambridgeSkill,
  CambridgeStats,
  CambridgeTest,
  CambridgeVolume,
  QuestionTypeId,
} from '../types.js';

/** Shape of `data/cambridge.json`. */
export type CambridgeIndex = {
  meta: {
    name: string;
    repository: string;
    commit: string | null;
    license: string;
    attribution: string;
    note: string;
    scenes: Record<'listening' | 'reading', string[]>;
    difficulties: CambridgeDifficulty[];
  };
  stats: CambridgeStats;
  volumes: CambridgeVolume[];
  items: CambridgeTest[];
};

/** Skills covered by the index, in report order. */
export const CAMBRIDGE_SKILLS: readonly CambridgeSkill[] = ['listening', 'reading', 'writing'];

/** Editorial difficulty labels, easiest first. */
export const CAMBRIDGE_DIFFICULTIES: readonly CambridgeDifficulty[] = ['easy', 'medium', 'hard'];

let cached: CambridgeIndex | undefined;

/** Return the index, loading it on first call. */
export function cambridgeIndex(): CambridgeIndex {
  cached ??= loadDataset<CambridgeIndex>('cambridge.json');
  return cached;
}

/** Index-level provenance metadata. */
export function cambridgeMeta(): CambridgeIndex['meta'] {
  return cambridgeIndex().meta;
}

/** Aggregate statistics over the index. */
export function cambridgeStats(): CambridgeStats {
  return cambridgeIndex().stats;
}

/** Every indexed test. */
export function cambridgeTests(): readonly CambridgeTest[] {
  return cambridgeIndex().items;
}

/** The per-volume table. */
export function cambridgeVolumes(): readonly CambridgeVolume[] {
  return cambridgeIndex().volumes;
}

/**
 * Look up one test by identifier.
 *
 * @param id - Case-insensitive identifier (`cam-10-t1-reading`).
 */
export function findCambridgeTest(id: string): CambridgeTest | undefined {
  const needle = id.trim().toLowerCase();
  return cambridgeTests().find((item) => item.id === needle);
}

/** One volume row by number, if present. */
export function findCambridgeVolume(volume: number): CambridgeVolume | undefined {
  return cambridgeVolumes().find((row) => row.volume === volume);
}

/** Question types that actually occur in the index, most frequent first. */
export function cambridgeQuestionTypes(): QuestionTypeId[] {
  return Object.keys(cambridgeStats().questionTypes) as QuestionTypeId[];
}

/** Scene slugs that occur in the index, across both skills, sorted. */
export function cambridgeScenes(): string[] {
  const { scenes } = cambridgeMeta();
  return [...new Set([...scenes.listening, ...scenes.reading])].sort();
}

/** Writing task families that occur in the index. */
export function cambridgeTaskFamilies(task: 'task1' | 'task2'): string[] {
  const { writing } = cambridgeStats();
  return Object.keys(task === 'task1' ? writing.task1Families : writing.task2Families).sort();
}

/** Options accepted by {@link searchCambridgeTests}. */
export type CambridgeQuery = {
  /** Free-text search over identifier, passage titles and source path. */
  query?: string;
  /** Restrict to these skills. */
  skills?: CambridgeSkill[];
  /** Restrict to these volumes. */
  volumes?: number[];
  /** Restrict to this test number. */
  test?: number;
  /** Keep only tests containing every one of these question types. */
  types?: QuestionTypeId[];
  /** Keep only tests with at least one passage or section in one of these scenes. */
  scenes?: string[];
  /** Keep only tests with at least one group of this difficulty. */
  difficulty?: CambridgeDifficulty;
  /** Keep only writing tests whose Task 1 belongs to this family. */
  task1Family?: string;
  /** Keep only writing tests whose Task 2 belongs to this family. */
  task2Family?: string;
  /** Minimum mean Flesch Reading Ease (reading tests only). */
  minReadingEase?: number;
  /** Maximum mean Flesch Reading Ease (reading tests only). */
  maxReadingEase?: number;
  /** Sort key. */
  sort?: 'id' | 'volume' | 'reading-ease' | 'audio' | 'questions';
  /** Sort direction. */
  order?: 'asc' | 'desc';
  /** Page size. */
  limit: number;
  /** Offset. */
  offset: number;
};

/** Mean Flesch Reading Ease of a reading test, or `null` for other skills. */
export function meanReadingEase(item: CambridgeTest): number | null {
  if (item.skill !== 'reading') {
    return null;
  }
  const scores = item.passages
    .map((passage) => passage.readability?.fleschReadingEase)
    .filter((score): score is number => score !== undefined);
  if (scores.length === 0) {
    return null;
  }
  return Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100) / 100;
}

/** Total recovered audio of a listening test in seconds, or `null` for other skills. */
export function totalAudioSeconds(item: CambridgeTest): number | null {
  if (item.skill !== 'listening') {
    return null;
  }
  const timed = item.sections
    .map((section) => section.audioSeconds)
    .filter((value): value is number => value !== null);
  if (timed.length === 0) {
    return null;
  }
  return Math.round(timed.reduce((sum, value) => sum + value, 0) * 10) / 10;
}

/** Scenes named by a test's passages or sections. */
function scenesOf(item: CambridgeTest): string[] {
  if (item.skill === 'reading') {
    return item.passages.map((passage) => passage.scene).filter((scene): scene is string => scene !== null);
  }
  if (item.skill === 'listening') {
    return item.sections.map((section) => section.scene).filter((scene): scene is string => scene !== null);
  }
  return [];
}

/** Searchable text fields of a test. */
function textOf(item: CambridgeTest): (string | null)[] {
  const titles = item.skill === 'reading' ? item.passages.map((passage) => passage.title) : [];
  return [item.id, item.sourcePath, ...titles];
}

/** Sort keys defined for every test. */
const SORT_KEYS: Record<NonNullable<CambridgeQuery['sort']>, (item: CambridgeTest) => number | string> = {
  id: (item) => item.id,
  volume: (item) => item.volume * 100 + item.test * 10 + CAMBRIDGE_SKILLS.indexOf(item.skill),
  questions: (item) => item.questions ?? -1,
  'reading-ease': (item) => meanReadingEase(item) ?? Number.NEGATIVE_INFINITY,
  audio: (item) => totalAudioSeconds(item) ?? Number.NEGATIVE_INFINITY,
};

/**
 * Search, filter and paginate the index.
 *
 * @param options - Search options.
 * @returns A page of matching tests.
 */
export function searchCambridgeTests(options: CambridgeQuery): Page<CambridgeTest> {
  const query = options.query ?? '';
  const filtered = cambridgeTests().filter((item) => {
    if (query.length > 0 && !matchesQuery(textOf(item), query)) {
      return false;
    }
    if (!matchesFilter(item.skill, options.skills) || !matchesFilter(item.volume, options.volumes)) {
      return false;
    }
    if (options.test !== undefined && item.test !== options.test) {
      return false;
    }
    if (options.types !== undefined && options.types.length > 0) {
      if (!('questionTypes' in item) || !options.types.every((type) => item.questionTypes.includes(type))) {
        return false;
      }
    }
    if (options.scenes !== undefined && options.scenes.length > 0) {
      const scenes = scenesOf(item);
      if (!options.scenes.some((scene) => scenes.includes(scene))) {
        return false;
      }
    }
    if (options.difficulty !== undefined) {
      if (!('groups' in item) || !item.groups.some((group) => group.difficulty === options.difficulty)) {
        return false;
      }
    }
    if (
      options.task1Family !== undefined &&
      (item.skill !== 'writing' || item.task1.family !== options.task1Family)
    ) {
      return false;
    }
    if (
      options.task2Family !== undefined &&
      (item.skill !== 'writing' || item.task2.family !== options.task2Family)
    ) {
      return false;
    }
    if (options.minReadingEase !== undefined || options.maxReadingEase !== undefined) {
      const ease = meanReadingEase(item);
      if (ease === null) {
        return false;
      }
      if (options.minReadingEase !== undefined && ease < options.minReadingEase) {
        return false;
      }
      if (options.maxReadingEase !== undefined && ease > options.maxReadingEase) {
        return false;
      }
    }
    return true;
  });
  const sorted = sortBy(filtered, SORT_KEYS[options.sort ?? 'volume'], options.order ?? 'asc');
  return paginate(sorted, options.limit, options.offset);
}

/**
 * Question-type frequency table over the Cambridge tests, comparable with the
 * one the practice-test index publishes.
 *
 * @param skill - Optional skill filter.
 */
export function cambridgeTypeFrequencies(
  skill?: 'reading' | 'listening',
): { id: QuestionTypeId; questions: number; share: number; groups: number; meanGroupSize: number }[] {
  const questions = new Map<QuestionTypeId, number>();
  const groups = new Map<QuestionTypeId, number>();
  let total = 0;
  for (const item of cambridgeTests()) {
    if (item.skill === 'writing' || (skill !== undefined && item.skill !== skill)) {
      continue;
    }
    for (const group of item.groups) {
      questions.set(group.questionType, (questions.get(group.questionType) ?? 0) + group.count);
      groups.set(group.questionType, (groups.get(group.questionType) ?? 0) + 1);
      total += group.count;
    }
  }
  return [...questions.entries()]
    .map(([id, count]) => {
      const groupCount = groups.get(id) as number;
      return {
        id,
        questions: count,
        share: Math.round((count / total) * 10_000) / 10_000,
        groups: groupCount,
        meanGroupSize: Math.round((count / groupCount) * 100) / 100,
      };
    })
    .sort((left, right) => right.questions - left.questions);
}

/** Facet values available for filtering, derived from the index. */
export function cambridgeFacets(): Record<string, readonly string[]> {
  return {
    skill: CAMBRIDGE_SKILLS,
    type: cambridgeQuestionTypes(),
    scene: cambridgeScenes(),
    difficulty: CAMBRIDGE_DIFFICULTIES,
    task1Family: cambridgeTaskFamilies('task1'),
    task2Family: cambridgeTaskFamilies('task2'),
  };
}
