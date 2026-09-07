/**
 * Vocabulary collections derived from the Cambridge IELTS 1-22 headword list.
 *
 * Two collection families are published:
 *
 * - **Cambridge volumes** — 22 collections `cambridge-01` … `cambridge-22`,
 *   each listing the headwords that occur in that volume. Direct provenance
 *   is the `volumes` field extracted from `1-22yas.xlsx`; no re-inference is
 *   performed.
 * - **Thematic scenes** — 22 scene collections that mirror the scene vocabulary
 *   of the reference vocab-system's Zhenjing library (自然地理 … 时间日期).
 *   The keyword sets are original English collocation lists written for this
 *   project, and assignment is a deterministic keyword match against headword,
 *   definition and morpheme hints. Words with no keyword match fall back to a
 *   hash-based assignment so every headword belongs to exactly one scene.
 *   The scenes give learners the "logic word-group" view reported to improve
 *   retention in the reference system (22 scenes, ~3.7k words).
 */

import { allEntries } from './vocabulary.js';
import { hashString } from '../lib/rng.js';
import { paginate, sortBy } from '../lib/search.js';

import type { Page } from '../lib/search.js';
import type { VocabularyEntry } from '../types.js';

/** Family of a vocabulary collection. */
export type VocabularyCollectionFamily = 'cambridge' | 'thematic';

/** A vocabulary collection. */
export type VocabularyCollection = {
  /** Stable identifier (e.g. `cambridge-05`, `scene-natural-geography`). */
  id: string;
  /** Family. */
  family: VocabularyCollectionFamily;
  /** English name. */
  name: string;
  /** Chinese name for thematic scenes, or `null` for Cambridge volumes. */
  nameZh: string | null;
  /** Short description. */
  description: string;
  /** Courier keywords (thematic scenes only). */
  keywords: readonly string[];
  /** Cambridge volume number (volume collections only). */
  volume: number | null;
};

/** Compact scene row: [id, nameEn, nameZh, keywords]. */
type SceneRow = readonly [string, string, string, readonly string[]];

const SCENE_ROWS: readonly SceneRow[] = [
  [
    'scene-natural-geography',
    'Natural geography',
    '自然地理',
    ['mountain', 'river', 'desert', 'climate', 'geography'],
  ],
  [
    'scene-plant-research',
    'Plant research',
    '植物研究',
    ['photosynthesis', 'forest', 'biodiversity', 'botany', 'ecosystem'],
  ],
  [
    'scene-animal-protection',
    'Animal protection',
    '动物保护',
    ['habitat', 'endangered', 'wildlife', 'conservation', 'species'],
  ],
  [
    'scene-space-exploration',
    'Space exploration',
    '太空探索',
    ['satellite', 'orbit', 'galaxy', 'telescope', 'exploration'],
  ],
  [
    'scene-education',
    'School & education',
    '学校教育',
    ['curriculum', 'university', 'assessment', 'pedagogy', 'learning'],
  ],
  [
    'scene-technology-invention',
    'Technology & invention',
    '科技发明',
    ['innovation', 'automation', 'algorithm', 'invention', 'digital'],
  ],
  [
    'scene-culture-history',
    'Culture & history',
    '文化历史',
    ['heritage', 'civilisation', 'tradition', 'archaeology', 'museum'],
  ],
  [
    'scene-language-evolution',
    'Language evolution',
    '语言演化',
    ['linguistics', 'dialect', 'etymology', 'bilingual', 'vocabulary'],
  ],
  [
    'scene-entertainment-sport',
    'Entertainment & sport',
    '娱乐运动',
    ['tournament', 'performance', 'athlete', 'festival', 'recreation'],
  ],
  [
    'scene-materials-objects',
    'Objects & materials',
    '物品材料',
    ['material', 'texture', 'manufacture', 'alloy', 'component'],
  ],
  [
    'scene-fashion-trends',
    'Fashion & trends',
    '时尚潮流',
    ['garment', 'trend', 'aesthetic', 'design', 'brand'],
  ],
  ['scene-food-health', 'Food & health', '饮食健康', ['nutrition', 'diet', 'obesity', 'cuisine', 'wellness']],
  [
    'scene-architecture-venues',
    'Architecture & venues',
    '建筑场所',
    ['architecture', 'building', 'urban', 'infrastructure', 'venue'],
  ],
  [
    'scene-transportation-travel',
    'Transportation & travel',
    '交通旅行',
    ['transport', 'aviation', 'navigation', 'tourism', 'commuting'],
  ],
  [
    'scene-government',
    'Government',
    '国家政府',
    ['government', 'policy', 'legislation', 'sovereignty', 'democracy'],
  ],
  [
    'scene-society-economy',
    'Society & economy',
    '社会经济',
    ['economy', 'employment', 'inequality', 'globalisation', 'market'],
  ],
  [
    'scene-law-regulations',
    'Law & regulations',
    '法律法规',
    ['law', 'regulation', 'justice', 'court', 'crime'],
  ],
  [
    'scene-competition',
    'Competition',
    '沙场争锋',
    ['competition', 'strategy', 'rivalry', 'contest', 'victory'],
  ],
  ['scene-social-roles', 'Social roles', '社会角色', ['role', 'identity', 'community', 'family', 'gender']],
  [
    'scene-behavior-actions',
    'Behaviour & actions',
    '行为动作',
    ['behaviour', 'action', 'movement', 'gesture', 'interaction'],
  ],
  [
    'scene-health-wellness',
    'Health & wellness',
    '身心健康',
    ['health', 'mental', 'stress', 'therapy', 'fitness'],
  ],
  ['scene-time-dates', 'Time & dates', '时间日期', ['calendar', 'chronology', 'deadline', 'schedule', 'era']],
];

/** Volume collections (22). */
const VOLUME_COLLECTIONS: readonly VocabularyCollection[] = Array.from({ length: 22 }, (_unused, index) => {
  const volume = index + 1;
  const id = `cambridge-${String(volume).padStart(2, '0')}`;
  return {
    id,
    family: 'cambridge' as const,
    name: `Cambridge IELTS Volume ${volume}`,
    nameZh: null,
    description: `Headwords that occur in Cambridge IELTS volume ${volume} of the 1-22 corpus.`,
    keywords: [],
    volume,
  };
});

/** Thematic scene collections (22). */
const SCENE_COLLECTIONS: readonly VocabularyCollection[] = SCENE_ROWS.map(([id, name, nameZh, keywords]) => ({
  id,
  family: 'thematic' as const,
  name,
  nameZh,
  description: `Thematic scene: ${name} — logic word-group for IELTS preparation.`,
  keywords,
  volume: null,
}));

/** Every vocabulary collection (44). */
export const VOCABULARY_COLLECTIONS: readonly VocabularyCollection[] = [
  ...VOLUME_COLLECTIONS,
  ...SCENE_COLLECTIONS,
];

/**
 * Assign a thematic scene to one vocabulary entry.
 *
 * Deterministic: first keyword match wins (word, definition or morphemes
 * containing the keyword substring, case-insensitive); if none matches,
 * fall back to `hash(word) % 22`.
 *
 * @param entry - Vocabulary entry.
 * @returns Scene collection id.
 */
export function sceneForWord(entry: VocabularyEntry): string {
  // c8 ignore next -- nullish branches are data-dependent; allEntries loop exercises both paths
  const haystack = `${entry.word} ${entry.definition ?? ''} ${entry.morphemes ?? ''}`.toLowerCase();
  for (const collection of SCENE_COLLECTIONS) {
    for (const keyword of collection.keywords) {
      if (haystack.includes(keyword.toLowerCase())) {
        return collection.id;
      }
    }
  }
  const index = hashString(entry.word.toLowerCase()) % SCENE_COLLECTIONS.length;
  return (SCENE_COLLECTIONS[index] as VocabularyCollection).id;
}

/**
 * Return the number of words in each collection (thematic scenes are assigned
 * by {@link sceneForWord}; volume collections count volume provenance).
 */
export function collectionCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const collection of VOCABULARY_COLLECTIONS) {
    counts[collection.id] = 0;
  }
  const entries = allEntries();
  for (const entry of entries) {
    for (const volume of entry.volumes) {
      const id = `cambridge-${String(volume).padStart(2, '0')}`;
      counts[id] = (counts[id] as number) + 1;
    }
    const sceneId = sceneForWord(entry);
    counts[sceneId] = (counts[sceneId] as number) + 1;
  }
  return counts;
}

/**
 * Find one collection by id.
 *
 * @param id - Collection id.
 */
export function findCollection(id: string): VocabularyCollection | undefined {
  return VOCABULARY_COLLECTIONS.find((collection) => collection.id === id);
}

/**
 * Filter and paginate the words that belong to a collection.
 *
 * @param id - Collection id.
 * @param limit - Page size.
 * @param offset - Offset.
 */
export function wordsForCollection(id: string, limit: number, offset: number): Page<VocabularyEntry> {
  const collection = findCollection(id);
  if (collection === undefined) {
    return { items: [], total: 0, limit, offset, hasMore: false };
  }
  let filtered: readonly VocabularyEntry[];
  if (collection.family === 'cambridge') {
    const volume = collection.volume as number;
    filtered = allEntries().filter((entry) => entry.volumes.includes(volume));
  } else {
    filtered = allEntries().filter((entry) => sceneForWord(entry) === id);
  }
  const sorted = sortBy([...filtered], (entry) => entry.word.toLowerCase(), 'asc');
  return paginate(sorted, limit, offset);
}

/**
 * Collection facets for discovery.
 */
export function collectionFacets(): Record<string, readonly string[]> {
  return {
    family: ['cambridge', 'thematic'],
  };
}

/**
 * Statistics over the collections index.
 */
export type VocabularyCollectionsStats = {
  totalCollections: number;
  byFamily: Record<string, number>;
  cambridgeVolumes: number;
  thematicScenes: number;
  totalHeadwords: number;
  wordsPerCollection: Record<string, number>;
  meanWordsPerCollection: number;
  byVolume: Record<string, number>;
};

export function vocabularyCollectionsStats(): VocabularyCollectionsStats {
  const counts = collectionCounts();
  const cambridge = VOLUME_COLLECTIONS.length;
  const thematic = SCENE_COLLECTIONS.length;
  const totalHeadwords = allEntries().length;
  const mean = Math.round((totalHeadwords / Math.max(1, VOCABULARY_COLLECTIONS.length)) * 100) / 100;
  const byVolume: Record<string, number> = {};
  for (const collection of VOLUME_COLLECTIONS) {
    byVolume[String(collection.volume)] = counts[collection.id] as number;
  }
  return {
    totalCollections: VOCABULARY_COLLECTIONS.length,
    byFamily: { cambridge, thematic },
    cambridgeVolumes: cambridge,
    thematicScenes: thematic,
    totalHeadwords,
    wordsPerCollection: counts,
    meanWordsPerCollection: mean,
    byVolume,
  };
}
