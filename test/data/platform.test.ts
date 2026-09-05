import { describe, expect, it } from 'vitest';

import {
  alevelBoards,
  alevelStats,
  ebbinghausSchedules,
  findALevelBoard,
  findListeningGroup,
  findListeningScene,
  findListeningType,
  findManifestItem,
  findVocabTheme,
  listeningDiffs,
  listeningFacets,
  listeningGroups,
  listeningScenes,
  listeningStats,
  listeningTypes,
  manifestFacets,
  manifestItems,
  manifestStats,
  platformIndex,
  platformMeta,
  platformStats,
  searchListeningGroups,
  searchManifest,
  searchVocabThemes,
  speakingBank,
  speakingP1Topics,
  speakingP2Cues,
  vocabCategories,
  vocabThemeFacets,
  vocabThemes,
  vocabThemesStats,
} from '../../src/data/platform.js';

const pageManifest = (overrides: Partial<Parameters<typeof searchManifest>[0]> = {}) =>
  searchManifest({ limit: 10, offset: 0, ...overrides });

const pageListening = (overrides: Partial<Parameters<typeof searchListeningGroups>[0]> = {}) =>
  searchListeningGroups({ limit: 10, offset: 0, ...overrides });

const pageVocab = (overrides: Partial<Parameters<typeof searchVocabThemes>[0]> = {}) =>
  searchVocabThemes({ limit: 10, offset: 0, ...overrides });

describe('platform index', () => {
  it('loads and caches the dataset', () => {
    const first = platformIndex();
    const second = platformIndex();
    expect(first).toBe(second);
    expect(first.meta.repository).toBe('https://github.com/wanli4473/yysd-testcenter');
  });

  it('documents provenance and its non-substitutive nature', () => {
    const meta = platformMeta();
    expect(meta.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(meta.commit).toBe('0956ea375405e30b31bd554822726e4245bf077a');
    expect(meta.license).toBe('CC BY 4.0');
    expect(meta.note).toContain('is redistributed');
    expect(meta.note).toContain('No HTML exam page');
    expect(meta.blobs['library/manifest.json']).toBe('b2657e3a0683cc1d23dda8b7c764fc49e5d5153f');
    expect(meta.upstreamFiles).toBe(3566);
  });

  it('reports aggregate statistics', () => {
    const stats = platformStats();
    expect(stats.filesInRepository).toBe(3566);
    expect(stats.manifestItems).toBe(377);
    expect(stats.listeningGroups).toBe(530);
    expect(stats.listeningQuestions).toBe(2720);
    expect(stats.vocabThemes).toBe(36);
    expect(stats.speakingTopics).toBe(95);
    expect(stats.speakingQuestions).toBe(482);
    expect(stats.alevelPapers).toBe(852);
    expect(stats.schedules).toBe(2);
  });
});

describe('manifest', () => {
  it('indexes metadata with unique identifiers', () => {
    const items = manifestItems();
    expect(items).toHaveLength(377);
    expect(items).toHaveLength(manifestStats().totalItems);
    const ids = new Set(items.map((item) => item.id));
    expect(ids.size).toBe(items.length);
    for (const item of items) {
      expect(item.sourcePath.startsWith('library/')).toBe(true);
      expect(item.title.length).toBeGreaterThan(0);
    }
  });

  it('reports manifest statistics', () => {
    const stats = manifestStats();
    expect(stats.byZone.mock).toBe(226);
    expect(stats.byZone.study).toBe(141);
    expect(stats.byZone.practice).toBe(10);
    expect(stats.zones).toEqual(['mock', 'practice', 'study']);
    expect(stats.avgDuration).toBeCloseTo(31.67, 1);
  });

  it('finds a manifest item or returns undefined', () => {
    const first = manifestItems()[0]!;
    expect(findManifestItem(first.id)).toEqual(first);
    expect(findManifestItem(first.id.toUpperCase())).toEqual(first);
    expect(findManifestItem(` ${first.id} `)).toEqual(first);
    expect(findManifestItem('does-not-exist')).toBeUndefined();
  });

  it('lists facets sorted and distinct', () => {
    const zones = manifestFacets('zone');
    expect(zones).toEqual(['mock', 'practice', 'study']);
    const subjects = manifestFacets('subject');
    expect(subjects.length).toBeGreaterThan(5);
    expect([...subjects]).toEqual([...subjects].sort());
    expect(new Set(subjects).size).toBe(subjects.length);
    expect(subjects).toContain('vocab');
  });
});

describe('searchManifest', () => {
  it('paginates without filters', () => {
    const result = pageManifest({ limit: 3 });
    expect(result.items).toHaveLength(3);
    expect(result.total).toBe(377);
    expect(result.hasMore).toBe(true);
  });

  it('searches free text across manifest fields', () => {
    const result = pageManifest({ query: 'cambridge', limit: 100 });
    expect(result.total).toBeGreaterThan(0);
    expect(result.total).toBeLessThan(377);
    const withDuration = pageManifest({ query: 'c10-t1', limit: 10 });
    expect(withDuration.total).toBeGreaterThan(0);
  });

  it('filters by zone and subject', () => {
    const mock = pageManifest({ zones: ['mock'], limit: 100 });
    expect(mock.total).toBe(226);
    expect(mock.items.every((item) => item.zone === 'mock')).toBe(true);

    const study = pageManifest({ subjects: ['vocab'], limit: 100 });
    expect(study.items.every((item) => item.subject === 'vocab')).toBe(true);

    const combined = pageManifest({ zones: ['study'], subjects: ['vocab'], limit: 50 });
    expect(combined.total).toBeGreaterThan(0);
    for (const item of combined.items) {
      expect(item.zone).toBe('study');
      expect(item.subject).toBe('vocab');
    }

    const empty = pageManifest({ zones: ['mock'], subjects: ['vocab'], limit: 10 });
    expect(empty.total).toBe(0);
  });

  it('sorts by every key and order', () => {
    const byDuration = pageManifest({ sort: 'duration', order: 'desc', limit: 5 });
    for (let i = 1; i < byDuration.items.length; i += 1) {
      expect(byDuration.items[i - 1]!.duration).toBeGreaterThanOrEqual(byDuration.items[i]!.duration);
    }
    const byTitle = pageManifest({ sort: 'title', limit: 5 });
    expect(byTitle.items.length).toBe(5);
    const byAdded = pageManifest({ sort: 'added', limit: 5 });
    expect(byAdded.items.length).toBe(5);
    const byId = pageManifest({ sort: 'id', order: 'desc', limit: 5 });
    expect(byId.items[0]!.id > byId.items[4]!.id).toBe(true);
    // default sort is id asc
    const def = pageManifest({ limit: 5 });
    expect(def.items[0]!.id <= def.items[1]!.id).toBe(true);
  });

  it('supports offset pagination', () => {
    const first = pageManifest({ limit: 2, offset: 0 });
    const second = pageManifest({ limit: 2, offset: 2 });
    expect(first.items[0]!.id).not.toBe(second.items[0]!.id);
    expect(second.offset).toBe(2);
  });
});

describe('listening taxonomy', () => {
  it('reports listening stats', () => {
    const stats = listeningStats();
    expect(stats.groups).toBe(530);
    expect(stats.questions).toBe(2720);
    expect(stats.volumes).toHaveLength(17);
    expect(stats.volumes).toContain('21');
    expect(stats.byPart['1']).toBe(98);
    expect(stats.byType['gap-fill']).toBe(211);
    expect(stats.byScene.travel).toBe(82);
    expect(stats.byDiff.easy).toBe(137);
    expect(stats.avgQuestionsPerGroup).toBeCloseTo(5.13, 1);
  });

  it('lists types, scenes and diffs', () => {
    expect(listeningTypes()).toHaveLength(7);
    expect(listeningScenes()).toHaveLength(16);
    expect(listeningDiffs()).toHaveLength(4);
    expect(listeningTypes().map((t) => t.id)).toContain('gap-fill');
    expect(listeningScenes().map((s) => s.id)).toContain('travel');
    expect(listeningDiffs().map((d) => d.id)).toContain('easy');
  });

  it('finds entries or returns undefined', () => {
    expect(findListeningType('gap-fill')!.chinese).toBe('填空题');
    expect(findListeningType('GAP-FILL')!.id).toBe('gap-fill');
    expect(findListeningType('  gap-fill ')).toBeDefined();
    expect(findListeningType('nope')).toBeUndefined();

    expect(findListeningScene('travel')!.chinese).toBeTruthy();
    expect(findListeningScene('TRAVEL')!.id).toBe('travel');
    expect(findListeningScene('nope')).toBeUndefined();

    const group = listeningGroups()[0]!;
    expect(findListeningGroup(group.id)).toEqual(group);
    expect(findListeningGroup(group.id.toUpperCase())).toEqual(group);
    expect(findListeningGroup('nope')).toBeUndefined();
  });

  it('exposes listening facets', () => {
    expect(listeningFacets('volume')).toContain('5');
    expect(listeningFacets('part')).toContain('1');
    expect(listeningFacets('qType')).toContain('matching');
    expect(listeningFacets('scene')).toContain('travel');
    expect(listeningFacets('diff')).toContain('hard');
  });
});

describe('searchListeningGroups', () => {
  it('paginates without filters', () => {
    const result = pageListening({ limit: 3 });
    expect(result.items).toHaveLength(3);
    expect(result.total).toBe(530);
  });

  it('searches free text', () => {
    const result = pageListening({ query: 'gap-fill', limit: 100 });
    expect(result.total).toBe(211);
    const byScene = pageListening({ query: 'travel', limit: 100 });
    expect(byScene.total).toBe(82);
  });

  it('filters by every facet', () => {
    const byVolume = pageListening({ volumes: ['5'], limit: 100 });
    expect(byVolume.total).toBe(32);
    expect(byVolume.items.every((g) => g.volume === '5')).toBe(true);

    const byPart = pageListening({ parts: [1], limit: 100 });
    expect(byPart.total).toBe(98);
    expect(byPart.items.every((g) => g.part === 1)).toBe(true);

    const byType = pageListening({ qTypes: ['matching'], limit: 100 });
    expect(byType.total).toBe(70);
    expect(byType.items.every((g) => g.qType === 'matching')).toBe(true);

    const byScene = pageListening({ scenes: ['travel'], limit: 100 });
    expect(byScene.total).toBe(82);

    const byDiff = pageListening({ diffs: ['easy'], limit: 100 });
    expect(byDiff.total).toBe(137);

    const combined = pageListening({ volumes: ['5'], parts: [1], limit: 10 });
    expect(combined.items.every((g) => g.volume === '5' && g.part === 1)).toBe(true);

    const empty = pageListening({ volumes: ['5'], scenes: ['insurance'], limit: 10 });
    // there may be 0 or more; at least filtering applied
    expect(empty.items.every((g) => g.volume === '5' && g.scene === 'insurance')).toBe(true);
  });

  it('sorts by all keys', () => {
    const byVolume = pageListening({ sort: 'volume', order: 'desc', limit: 5 });
    expect(Number(byVolume.items[0]!.volume)).toBeGreaterThanOrEqual(Number(byVolume.items[4]!.volume));

    const byPart = pageListening({ sort: 'part', limit: 5 });
    expect(byPart.items[0]!.part).toBeLessThanOrEqual(byPart.items[4]!.part);

    const byQuestions = pageListening({ sort: 'questions', order: 'desc', limit: 5 });
    expect(byQuestions.items[0]!.questions).toBeGreaterThanOrEqual(byQuestions.items[4]!.questions);

    const byId = pageListening({ sort: 'id', limit: 5 });
    expect(byId.items[0]!.id <= byId.items[1]!.id).toBe(true);

    const def = pageListening({ limit: 5 });
    expect(def.items[0]!.id <= def.items[1]!.id).toBe(true);
  });

  it('handles pagination offset', () => {
    const a = pageListening({ limit: 2, offset: 0 });
    const b = pageListening({ limit: 2, offset: 2 });
    expect(a.items[0]!.id).not.toBe(b.items[0]!.id);
  });
});

describe('vocab themes', () => {
  it('exposes categories and themes', () => {
    expect(vocabCategories()).toHaveLength(10);
    expect(vocabCategories().map((c) => c.id)).toContain('exam');
    expect(vocabThemes()).toHaveLength(36);
    const first = vocabThemes()[0]!;
    expect(first.preview.length).toBeGreaterThan(0);
  });

  it('reports vocab stats', () => {
    const stats = vocabThemesStats();
    expect(stats.themes).toBe(36);
    expect(stats.totalWords).toBe(76970);
    expect(stats.totalDefined).toBe(76503);
    expect(stats.byCategory.exam).toBe(5);
    expect(stats.avgWordsPerTheme).toBeCloseTo(2138.06, 1);
  });

  it('finds a theme or returns undefined', () => {
    expect(findVocabTheme('animals')!.title).toContain('动物');
    expect(findVocabTheme('ANIMALS')!.id).toBe('animals');
    expect(findVocabTheme('  animals ')).toBeDefined();
    expect(findVocabTheme('nope')).toBeUndefined();
  });

  it('lists facets', () => {
    const cats = vocabThemeFacets('category');
    expect(cats).toContain('exam');
    expect([...cats]).toEqual([...cats].sort());
  });
});

describe('searchVocabThemes', () => {
  it('paginates without filters', () => {
    const result = pageVocab({ limit: 5 });
    expect(result.items).toHaveLength(5);
    expect(result.total).toBe(36);
  });

  it('searches free text', () => {
    const result = pageVocab({ query: 'animals', limit: 10 });
    expect(result.total).toBeGreaterThan(0);
    expect(result.items[0]!.id).toBe('animals');
  });

  it('filters by category', () => {
    const exam = pageVocab({ categories: ['exam'], limit: 10 });
    expect(exam.items.every((t) => t.category === 'exam')).toBe(true);
    expect(exam.total).toBe(5);
    const empty = pageVocab({ categories: ['exam', 'nature'], limit: 20 });
    // categories filter is IN semantics; empty case with impossible category not testable via search (validation), test with two categories returns both
    expect(empty.items.every((t) => ['exam', 'nature'].includes(t.category))).toBe(true);
  });

  it('sorts by all keys', () => {
    const byCount = pageVocab({ sort: 'count', order: 'desc', limit: 5 });
    expect(byCount.items[0]!.count).toBeGreaterThanOrEqual(byCount.items[4]!.count);
    const byTitle = pageVocab({ sort: 'title', limit: 5 });
    expect(byTitle.items.length).toBe(5);
    const byId = pageVocab({ sort: 'id', order: 'desc', limit: 5 });
    expect(byId.items[0]!.id > byId.items[4]!.id).toBe(true);
    const def = pageVocab({ limit: 5 });
    expect(def.items[0]!.id <= def.items[1]!.id).toBe(true);
  });

  it('handles offset', () => {
    const a = pageVocab({ limit: 2, offset: 0 });
    const b = pageVocab({ limit: 2, offset: 2 });
    expect(a.items[0]!.id).not.toBe(b.items[0]!.id);
  });
});

describe('speaking and alevel', () => {
  it('exposes speaking bank', () => {
    const bank = speakingBank();
    expect(bank.id).toBe('2026-q2');
    expect(bank.part1).toHaveLength(41);
    expect(bank.part2).toHaveLength(54);
    expect(bank.stats.totalTopics).toBe(95);
    expect(bank.stats.totalQuestions).toBe(482);
    expect(speakingP1Topics()).toHaveLength(41);
    expect(speakingP2Cues()).toHaveLength(54);
    expect(speakingP1Topics()[0]!.questions).toBeGreaterThan(0);
    expect(speakingP2Cues()[0]!.bullets).toBe(4);
  });

  it('exposes alevel boards', () => {
    expect(alevelBoards()).toHaveLength(3);
    expect(alevelBoards().map((b) => b.id)).toContain('caie');
    const stats = alevelStats();
    expect(stats.boards).toBe(3);
    expect(stats.papers).toBe(852);
    expect(stats.byBoard.caie).toBe(726);
    expect(findALevelBoard('caie')!.labelZh).toContain('剑桥');
    expect(findALevelBoard('CAIE')!.id).toBe('caie');
    expect(findALevelBoard('nope')).toBeUndefined();
  });

  it('exposes ebbinghaus schedules', () => {
    const schedules = ebbinghausSchedules();
    expect(schedules).toHaveLength(2);
    expect(schedules.map((s) => s.bookId)).toContain('cet4-lite');
    expect(schedules.find((s) => s.bookId === 'cet4-lite')!.totalDays).toBe(65);
  });
});
