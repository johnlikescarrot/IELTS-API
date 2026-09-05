/**
 * Access to the mock-exam test-centre index.
 *
 * The upstream platform <https://github.com/wanli4473/yysd-testcenter> (the
 * YYSD IELTS online mock-exam test center) runs self-marking Cambridge IELTS
 * papers behind a timed exam shell, annotates almost every Cambridge 5-21
 * listening section and reading passage with question-type, scene and
 * difficulty tags, and embeds a production raw-score-to-band calibration into
 * every exam page. This module exposes the machine-readable index built by
 * `scripts/extract_testcenter.py`.
 *
 * Only derived metadata is published: the upstream repository declares no
 * licence, so no exam HTML, question text, answer key, audio or vocabulary
 * entry is redistributed.
 */

import { loadDataset } from '../lib/dataset.js';
import { matchesFilter, matchesQuery, paginate, sortBy } from '../lib/search.js';

import type { Page } from '../lib/search.js';
import type {
  TestcenterCatalogItem,
  TestcenterDifficulty,
  TestcenterGroup,
  TestcenterPaper,
  TestcenterScene,
  TestcenterScoringRow,
  TestcenterScoringTable,
  TestcenterStats,
  TestcenterVolumeRow,
} from '../types.js';

/** Canonical paper facets, in catalog-report order. */
export const TESTCENTER_PAPERS: readonly TestcenterPaper[] = [
  'listening',
  'reading',
  'writing',
  'full-mock',
  'vocabulary',
  'drill',
];

/** The papers the hand-curated taxonomies tag. */
export const TESTCENTER_TAGGED_PAPERS: readonly ('listening' | 'reading')[] = ['listening', 'reading'];

/** Difficulty vocabulary of the taxonomies. */
export const TESTCENTER_DIFFICULTIES: readonly TestcenterDifficulty[] = ['easy', 'medium', 'hard'];

/** Shape of `data/testcenter.json`. */
export type TestcenterIndex = {
  meta: {
    name: string;
    repository: string;
    liveSite: string;
    commit: string | null;
    manifestGenerated: string;
    sources: Record<string, { path: string; sha1: string | null; sourceUrl: string }>;
    license: string;
    attribution: string;
    note: string;
  };
  stats: TestcenterStats;
  catalog: TestcenterCatalogItem[];
  volumes: TestcenterVolumeRow[];
  groups: TestcenterGroup[];
  scenes: Record<'listening' | 'reading', TestcenterScene[]>;
  scoring: {
    source: { path: string; sha1: string | null; sourceUrl: string };
    provenance: string;
    note: string;
    listening: TestcenterScoringTable;
    reading: TestcenterScoringTable;
  };
  timing: {
    note: string;
    papers: Record<'listening' | 'reading' | 'writing' | 'fullMock', number | null>;
    minutesPerQuestion: Record<'listening' | 'reading', number>;
  };
};

let cached: TestcenterIndex | undefined;

/** Return the test-centre index, loading it on first call. */
export function testcenter(): TestcenterIndex {
  cached ??= loadDataset<TestcenterIndex>('testcenter.json');
  return cached;
}

/** Dataset metadata (provenance, licence, redistribution note). */
export function testcenterMeta(): TestcenterIndex['meta'] {
  return testcenter().meta;
}

/** Aggregated statistics about the catalogue and the taxonomies. */
export function testcenterStats(): TestcenterStats {
  return testcenter().stats;
}

/** The catalogue of self-marking papers, in deterministic order. */
export function testcenterCatalog(): readonly TestcenterCatalogItem[] {
  return testcenter().catalog;
}

/** The Cambridge holdings matrix. */
export function testcenterVolumes(): readonly TestcenterVolumeRow[] {
  return testcenter().volumes;
}

/** The hand-tagged question groups, in canonical order. */
export function testcenterGroups(): readonly TestcenterGroup[] {
  return testcenter().groups;
}

/** The teaching-scene vocabulary of one tagged paper. */
export function testcenterScenes(paper: 'listening' | 'reading'): readonly TestcenterScene[] {
  return testcenter().scenes[paper];
}

/** The production raw-score-to-band calibration of one tagged paper. */
export function testcenterScoringTable(paper: 'listening' | 'reading'): TestcenterScoringTable {
  return testcenter().scoring[paper];
}

/** The whole calibration document: provenance, note and both tables. */
export function testcenterScoring(): TestcenterIndex['scoring'] {
  return testcenter().scoring;
}

/** The platform's exam-shell timing budgets. */
export function testcenterTiming(): TestcenterIndex['timing'] {
  return testcenter().timing;
}

/** Distinct facet values of the catalogue, sorted. */
export function testcenterCatalogFacets(facet: 'zone' | 'subject' | 'paper'): string[] {
  return [...new Set(testcenter().catalog.map((item) => String(item[facet])))].sort();
}

/** Distinct facet values of the question groups, sorted. */
export function testcenterGroupFacets(facet: 'paper' | 'type' | 'scene' | 'difficulty'): string[] {
  return [
    ...new Set(
      testcenter()
        .groups.map((group) => group[facet])
        .filter((value): value is string => value !== null),
    ),
  ].sort();
}

/** Find one catalogue item by its slug identifier. */
export function findCatalogItem(id: string): TestcenterCatalogItem | undefined {
  return testcenter().catalog.find((item) => item.id === id);
}

/** Find one holdings row by Cambridge volume number. */
export function findTestcenterVolume(volume: number): TestcenterVolumeRow | undefined {
  return testcenter().volumes.find((row) => row.volume === volume);
}

/**
 * Find the calibration row covering one raw score.
 *
 * @param paper - Tagged paper whose table to consult.
 * @param raw - Raw score, 0-40.
 */
export function findScoringRow(
  paper: 'listening' | 'reading',
  raw: number,
): TestcenterScoringRow | undefined {
  return testcenterScoringTable(paper).rows.find((row) => raw >= row.rawFrom && raw <= row.rawTo);
}

/** Query options for the catalogue search. */
export type TestcenterCatalogQuery = {
  /** Page size (1-100). */
  limit: number;
  /** Zero-based offset. */
  offset: number;
  /** Free-text query over id, upstream id, titles, subject and zone. */
  query: string;
  /** Zone filter; `undefined` disables it. */
  zones?: string[];
  /** Subject filter; `undefined` disables it. */
  subjects?: string[];
  /** Paper filter; `undefined` disables it. */
  papers?: string[];
  /** Exact Cambridge volume; `undefined` disables it. */
  volume?: number;
  /** Sort key. */
  sort?: 'title' | 'subject' | 'duration' | 'added';
  /** Sort direction. */
  order?: 'asc' | 'desc';
};

/**
 * Search the catalogue.
 *
 * Identical inputs produce byte-identical pages: the catalogue is stored in
 * deterministic order and every sort key is total.
 */
export function searchCatalog(options: TestcenterCatalogQuery): Page<TestcenterCatalogItem> {
  const { limit, offset, query, volume } = options;
  const sort = options.sort ?? 'title';
  const order = options.order ?? 'asc';
  const filtered = testcenter().catalog.filter(
    (item) =>
      matchesQuery([item.id, item.upstreamId, item.title, item.titleEn, item.subject, item.zone], query) &&
      matchesFilter(item.zone, options.zones) &&
      matchesFilter(item.subject, options.subjects) &&
      matchesFilter(item.paper, options.papers) &&
      (volume === undefined || item.volume === volume),
  );
  const key = (item: TestcenterCatalogItem): string | number => {
    switch (sort) {
      case 'subject':
        return item.subject;
      case 'duration':
        return item.durationMinutes;
      case 'added':
        return item.added;
      default:
        return item.title;
    }
  };
  return paginate(sortBy(filtered, key, order), limit, offset);
}

/** Query options for the question-group search. */
export type TestcenterGroupsQuery = {
  /** Page size (1-100). */
  limit: number;
  /** Zero-based offset. */
  offset: number;
  /** Free-text query over ids, labels, types and scenes. */
  query: string;
  /** Tagged-paper filter; `undefined` disables it. */
  papers?: string[];
  /** Canonical question-type filter; `undefined` disables it. */
  types?: string[];
  /** Scene filter; `undefined` disables it. */
  scenes?: string[];
  /** Difficulty filter; `undefined` disables it. */
  difficulties?: string[];
  /** Exact Cambridge volume; `undefined` disables it. */
  volume?: number;
  /** Exact Cambridge test number; `undefined` disables it. */
  test?: number;
  /** Sort key. */
  sort?: 'volume' | 'questions' | 'type' | 'scene';
  /** Sort direction. */
  order?: 'asc' | 'desc';
};

/**
 * Search the hand-tagged question groups.
 *
 * Identical inputs produce byte-identical pages: the groups are stored in
 * canonical (paper, volume, test, part, question) order and the `volume` sort
 * is stable, so it preserves that order within a volume.
 */
export function searchGroups(options: TestcenterGroupsQuery): Page<TestcenterGroup> {
  const { limit, offset, query, volume, test } = options;
  const sort = options.sort ?? 'volume';
  const order = options.order ?? 'asc';
  const filtered = testcenter().groups.filter(
    (group) =>
      matchesQuery(
        [group.id, group.parentId, group.rawType, group.sceneLabel, group.sceneRaw, group.type],
        query,
      ) &&
      matchesFilter(group.paper, options.papers) &&
      matchesFilter(group.type, options.types) &&
      matchesFilter(group.scene, options.scenes) &&
      matchesFilter(group.difficulty, options.difficulties) &&
      (volume === undefined || group.volume === volume) &&
      (test === undefined || group.test === test),
  );
  const key = (group: TestcenterGroup): string | number => {
    switch (sort) {
      case 'questions':
        return group.questions;
      case 'type':
        return group.type;
      case 'scene':
        return group.scene ?? '';
      default:
        return group.volume;
    }
  };
  return paginate(sortBy(filtered, key, order), limit, offset);
}

/** A deterministic drill composed from hand-tagged question groups. */
export type TestcenterDrillPlan = {
  /** Tagged paper the drill was composed from. */
  paper: 'listening' | 'reading';
  /** Effective filters, echoed back for reproducibility. */
  filters: {
    type: string | null;
    scene: string | null;
    difficulty: string | null;
    volume: number | null;
    test: number | null;
  };
  /** The selected groups, in canonical order. */
  selection: TestcenterGroup[];
  /** Totals over the selection. */
  totals: { groups: number; questions: number };
  /** Timing budget derived from the platform's exam-shell durations. */
  timing: {
    /** Platform pacing per question for the paper, in minutes. */
    minutesPerQuestion: number;
    /** Pacing-derived budget, rounded up. */
    suggestedMinutes: number;
    /** The budget used: the caller's override, or `suggestedMinutes`. */
    budgetMinutes: number;
  };
  /** Scoring sheet: the production calibration that grades the drill. */
  scoring: {
    /** Scale identifier. */
    scale: string;
    /** Maximum raw score of the scale. */
    maxRaw: number;
    /** The paper's calibration table. */
    table: TestcenterScoringTable;
    /** How non-40 totals are graded by the platform. */
    note: string;
  };
  /** Links into the other endpoints that consume the selection. */
  links: { groups: string; scoring: string };
};

/** Options for {@link buildDrill}. */
export type TestcenterDrillOptions = {
  /** Tagged paper to compose from. */
  paper: 'listening' | 'reading';
  /** Question budget to fill (the last group may overshoot). */
  questions: number;
  /** Optional explicit time budget in minutes. */
  minutes?: number;
  /** Canonical question-type filter. */
  type?: string;
  /** Scene filter. */
  scene?: string;
  /** Difficulty filter. */
  difficulty?: string;
  /** Cambridge volume filter. */
  volume?: number;
  /** Cambridge test-number filter. */
  test?: number;
};

/**
 * Compose a deterministic drill from the hand-tagged groups.
 *
 * The groups are taken in canonical order (volume, test, part, question), so
 * identical requests always return the same drill; there is no randomness and
 * no server state.
 */
export function buildDrill(options: TestcenterDrillOptions): TestcenterDrillPlan {
  const { paper, questions, minutes, type, scene, difficulty, volume, test } = options;
  const candidates = testcenter().groups.filter(
    (group) =>
      group.paper === paper &&
      (type === undefined || group.type === type) &&
      (scene === undefined || group.scene === scene) &&
      (difficulty === undefined || group.difficulty === difficulty) &&
      (volume === undefined || group.volume === volume) &&
      (test === undefined || group.test === test),
  );
  const selection: TestcenterGroup[] = [];
  let total = 0;
  for (const group of candidates) {
    if (total >= questions) {
      break;
    }
    selection.push(group);
    total += group.questions;
  }
  const minutesPerQuestion = testcenterTiming().minutesPerQuestion[paper];
  const suggestedMinutes = Math.max(1, Math.ceil(total * minutesPerQuestion));
  const link = new URLSearchParams();
  link.set('paper', paper);
  if (type !== undefined) {
    link.set('type', type);
  }
  if (scene !== undefined) {
    link.set('scene', scene);
  }
  if (difficulty !== undefined) {
    link.set('difficulty', difficulty);
  }
  if (volume !== undefined) {
    link.set('volume', String(volume));
  }
  if (test !== undefined) {
    link.set('test', String(test));
  }
  return {
    paper,
    filters: {
      type: type ?? null,
      scene: scene ?? null,
      difficulty: difficulty ?? null,
      volume: volume ?? null,
      test: test ?? null,
    },
    selection,
    totals: { groups: selection.length, questions: total },
    timing: {
      minutesPerQuestion,
      suggestedMinutes,
      budgetMinutes: minutes ?? suggestedMinutes,
    },
    scoring: {
      scale: `${paper}-raw-40`,
      maxRaw: 40,
      table: testcenterScoringTable(paper),
      note:
        'The platform scales totals below 40 to a 40-item equivalent ' +
        '(round(correct / total * 40)) before reading the band off this table.',
    },
    links: {
      groups: `/v1/testcenter/groups?${link.toString()}`,
      scoring: `/v1/testcenter/scoring?paper=${paper}`,
    },
  };
}
