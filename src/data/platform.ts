/**
 * Access to the operating-platform index.
 *
 * The upstream repository <https://github.com/wanli4473/yysd-testcenter> powers
 * the 优益思达 IELTS mock-exam platform (youyisida.com). This module exposes the
 * derived, non-substitutive metadata index built by
 * `scripts/extract_platform.py`: manifest (377 pages by zone/subject),
 * listening taxonomy (7 types, 16 scenes, 3 diffs, 530 groups across Cambridge
 * volumes 5-21), vocabulary-theme catalogue (36 themes), speaking recall bank
 * (2026-Q2: 41 Part-1 topics, 54 Part-2 cues) and the A-Level catalogue.
 *
 * No HTML exam page, audio file or dictionary gloss is redistributed; only
 * structure, annotation and counts are published.
 */

import { loadDataset } from '../lib/dataset.js';
import { matchesFilter, matchesQuery, paginate, sortBy } from '../lib/search.js';

import type { Page } from '../lib/search.js';
import type {
  ALevelBoard,
  EbbinghausSchedule,
  ListeningDifficulty,
  ListeningGroup,
  ListeningScene,
  ListeningStats,
  ListeningType,
  PlatformManifestItem,
  PlatformMeta,
  PlatformStats,
  SpeakingP1Topic,
  SpeakingP2Cue,
  VocabTheme,
  VocabThemeCategory,
} from '../types.js';

/** Shape of `data/platform.json`. */
export type PlatformIndex = {
  meta: PlatformMeta;
  stats: PlatformStats;
  manifest: { items: PlatformManifestItem[]; stats: PlatformStats['manifest'] };
  listening: {
    types: ListeningType[];
    scenes: ListeningScene[];
    diffs: ListeningDifficulty[];
    groups: ListeningGroup[];
    stats: ListeningStats;
  };
  vocabThemes: {
    categories: VocabThemeCategory[];
    themes: VocabTheme[];
    stats: PlatformStats['vocabThemesStats'];
  };
  speaking: {
    bank: {
      id: string;
      title: string;
      source: string;
      part1: SpeakingP1Topic[];
      part2: SpeakingP2Cue[];
      stats: PlatformStats['speaking'];
    };
  };
  alevel: { boards: ALevelBoard[]; stats: PlatformStats['alevel'] };
  schedules: EbbinghausSchedule[];
};

let cached: PlatformIndex | undefined;

/** Return the platform index, loading it on first call. */
export function platformIndex(): PlatformIndex {
  cached ??= loadDataset<PlatformIndex>('platform.json');
  return cached;
}

/** Platform provenance metadata. */
export function platformMeta(): PlatformMeta {
  return platformIndex().meta;
}

/** Platform aggregate statistics. */
export function platformStats(): PlatformStats {
  return platformIndex().stats;
}

/* -------------------------------------------------------------------------- */
/* Manifest                                                                   */
/* -------------------------------------------------------------------------- */

/** Every manifest item. */
export function manifestItems(): readonly PlatformManifestItem[] {
  return platformIndex().manifest.items;
}

/** Manifest statistics. */
export function manifestStats(): PlatformStats['manifest'] {
  return platformIndex().manifest.stats;
}

/** Find one manifest item by identifier. */
export function findManifestItem(id: string): PlatformManifestItem | undefined {
  const needle = id.trim().toLowerCase();
  return manifestItems().find((item) => item.id.toLowerCase() === needle);
}

/** Manifest facet values. */
export function manifestFacets(facet: 'zone' | 'subject'): string[] {
  const values = new Set<string>();
  for (const item of manifestItems()) {
    values.add(item[facet]);
  }
  return [...values].sort();
}

/** Options for {@link searchManifest}. */
export type ManifestQuery = {
  query?: string;
  zones?: string[];
  subjects?: string[];
  sort?: 'id' | 'title' | 'duration' | 'added';
  order?: 'asc' | 'desc';
  limit: number;
  offset: number;
};

const MANIFEST_SORT: Record<
  NonNullable<ManifestQuery['sort']>,
  (item: PlatformManifestItem) => string | number
> = {
  id: (item) => item.id.toLowerCase(),
  title: (item) => item.title.toLowerCase(),
  duration: (item) => item.duration,
  added: (item) => item.added,
};

/**
 * Search, filter and paginate the manifest.
 *
 * @param options - Search options.
 */
export function searchManifest(options: ManifestQuery): Page<PlatformManifestItem> {
  const query = options.query ?? '';
  const filtered = manifestItems().filter((item) => {
    if (query.length > 0 && !matchesQuery([item.title, item.id, item.file, item.description], query)) {
      return false;
    }
    if (!matchesFilter(item.zone, options.zones)) {
      return false;
    }
    if (!matchesFilter(item.subject, options.subjects)) {
      return false;
    }
    return true;
  });
  const sorted = sortBy(filtered, MANIFEST_SORT[options.sort ?? 'id'], options.order ?? 'asc');
  return paginate(sorted, options.limit, options.offset);
}

/* -------------------------------------------------------------------------- */
/* Listening                                                                  */
/* -------------------------------------------------------------------------- */

/** All listening types. */
export function listeningTypes(): readonly ListeningType[] {
  return platformIndex().listening.types;
}

/** Find one listening type by English identifier. */
export function findListeningType(id: string): ListeningType | undefined {
  const needle = id.trim().toLowerCase();
  return listeningTypes().find((t) => t.id.toLowerCase() === needle);
}

/** All listening scenes. */
export function listeningScenes(): readonly ListeningScene[] {
  return platformIndex().listening.scenes;
}

/** Find one listening scene by English identifier. */
export function findListeningScene(id: string): ListeningScene | undefined {
  const needle = id.trim().toLowerCase();
  return listeningScenes().find((s) => s.id.toLowerCase() === needle);
}

/** All difficulty tiers. */
export function listeningDiffs(): readonly ListeningDifficulty[] {
  return platformIndex().listening.diffs;
}

/** All listening groups. */
export function listeningGroups(): readonly ListeningGroup[] {
  return platformIndex().listening.groups;
}

/** Find one listening group by identifier. */
export function findListeningGroup(id: string): ListeningGroup | undefined {
  const needle = id.trim().toLowerCase();
  return listeningGroups().find((g) => g.id.toLowerCase() === needle);
}

/** Listening taxonomy statistics. */
export function listeningStats(): ListeningStats {
  return platformIndex().listening.stats;
}

/** Facet values for listening groups. */
export function listeningFacets(facet: 'volume' | 'part' | 'qType' | 'scene' | 'diff'): string[] {
  const values = new Set<string>();
  for (const group of listeningGroups()) {
    const v = String(group[facet]);
    values.add(v);
  }
  return [...values].sort();
}

/** Options for {@link searchListeningGroups}. */
export type ListeningGroupQuery = {
  query?: string;
  volumes?: string[];
  parts?: number[];
  qTypes?: string[];
  scenes?: string[];
  diffs?: string[];
  sort?: 'id' | 'volume' | 'part' | 'questions';
  order?: 'asc' | 'desc';
  limit: number;
  offset: number;
};

const LISTENING_SORT: Record<
  NonNullable<ListeningGroupQuery['sort']>,
  (group: ListeningGroup) => string | number
> = {
  id: (g) => g.id.toLowerCase(),
  volume: (g) => Number.parseInt(g.volume, 10),
  part: (g) => g.part,
  questions: (g) => g.questions,
};

/**
 * Search, filter and paginate listening groups.
 *
 * @param options - Search options.
 */
export function searchListeningGroups(options: ListeningGroupQuery): Page<ListeningGroup> {
  const query = options.query ?? '';
  const filtered = listeningGroups().filter((group) => {
    if (query.length > 0 && !matchesQuery([group.id, group.parentId, group.qType, group.scene], query)) {
      return false;
    }
    if (!matchesFilter(group.volume, options.volumes)) {
      return false;
    }
    if (options.parts !== undefined && options.parts.length > 0 && !options.parts.includes(group.part)) {
      return false;
    }
    if (!matchesFilter(group.qType, options.qTypes)) {
      return false;
    }
    if (!matchesFilter(group.scene, options.scenes)) {
      return false;
    }
    if (!matchesFilter(group.diff, options.diffs)) {
      return false;
    }
    return true;
  });
  const sorted = sortBy(filtered, LISTENING_SORT[options.sort ?? 'id'], options.order ?? 'asc');
  return paginate(sorted, options.limit, options.offset);
}

/* -------------------------------------------------------------------------- */
/* Vocab themes                                                               */
/* -------------------------------------------------------------------------- */

/** Vocabulary-theme categories. */
export function vocabCategories(): readonly VocabThemeCategory[] {
  return platformIndex().vocabThemes.categories;
}

/** Every vocabulary theme. */
export function vocabThemes(): readonly VocabTheme[] {
  return platformIndex().vocabThemes.themes;
}

/** Find one vocabulary theme by identifier. */
export function findVocabTheme(id: string): VocabTheme | undefined {
  const needle = id.trim().toLowerCase();
  return vocabThemes().find((t) => t.id.toLowerCase() === needle);
}

/** Vocab-theme statistics. */
export function vocabThemesStats(): PlatformStats['vocabThemesStats'] {
  return platformIndex().vocabThemes.stats;
}

/** Vocab-theme facet values. */
export function vocabThemeFacets(facet: 'category'): string[] {
  const values = new Set<string>();
  for (const theme of vocabThemes()) {
    values.add(theme[facet]);
  }
  return [...values].sort();
}

/** Options for {@link searchVocabThemes}. */
export type VocabThemeQuery = {
  query?: string;
  categories?: string[];
  sort?: 'id' | 'title' | 'count';
  order?: 'asc' | 'desc';
  limit: number;
  offset: number;
};

const VOCAB_SORT: Record<NonNullable<VocabThemeQuery['sort']>, (theme: VocabTheme) => string | number> = {
  id: (t) => t.id.toLowerCase(),
  title: (t) => t.title.toLowerCase(),
  count: (t) => t.count,
};

/**
 * Search, filter and paginate vocab themes.
 *
 * @param options - Search options.
 */
export function searchVocabThemes(options: VocabThemeQuery): Page<VocabTheme> {
  const query = options.query ?? '';
  const filtered = vocabThemes().filter((theme) => {
    if (query.length > 0 && !matchesQuery([theme.title, theme.id, theme.desc], query)) {
      return false;
    }
    if (!matchesFilter(theme.category, options.categories)) {
      return false;
    }
    return true;
  });
  const sorted = sortBy(filtered, VOCAB_SORT[options.sort ?? 'id'], options.order ?? 'asc');
  return paginate(sorted, options.limit, options.offset);
}

/* -------------------------------------------------------------------------- */
/* Speaking ji-jing                                                           */
/* -------------------------------------------------------------------------- */

/** Speaking bank overview. */
export function speakingBank(): PlatformIndex['speaking']['bank'] {
  return platformIndex().speaking.bank;
}

/** All Part-1 topics (aggregated). */
export function speakingP1Topics(): readonly SpeakingP1Topic[] {
  return speakingBank().part1;
}

/** All Part-2 cues (aggregated). */
export function speakingP2Cues(): readonly SpeakingP2Cue[] {
  return speakingBank().part2;
}

/* -------------------------------------------------------------------------- */
/* A-Level catalogue                                                          */
/* -------------------------------------------------------------------------- */

/** A-Level boards. */
export function alevelBoards(): readonly ALevelBoard[] {
  return platformIndex().alevel.boards;
}

/** Find one A-Level board by identifier. */
export function findALevelBoard(id: string): ALevelBoard | undefined {
  const needle = id.trim().toLowerCase();
  return alevelBoards().find((b) => b.id.toLowerCase() === needle);
}

/** A-Level statistics. */
export function alevelStats(): PlatformStats['alevel'] {
  return platformIndex().alevel.stats;
}

/** Ebbinghaus schedules. */
export function ebbinghausSchedules(): readonly EbbinghausSchedule[] {
  return platformIndex().schedules;
}
