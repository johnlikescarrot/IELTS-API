import { describe, expect, it } from 'vitest';

import { THEME_GROUPS } from '../../src/data/themes.js';
import { QUESTION_TYPE_IDS } from '../../src/data/questionTypes.js';
import {
  TESTCENTER_DIFFICULTIES,
  TESTCENTER_PAPERS,
  buildDrill,
  findCatalogItem,
  findScoringRow,
  findTestcenterVolume,
  searchCatalog,
  searchGroups,
  testcenterCatalog,
  testcenterCatalogFacets,
  testcenterGroupFacets,
  testcenterGroups,
  testcenterMeta,
  testcenterScenes,
  testcenterScoring,
  testcenterScoringTable,
  testcenterStats,
  testcenterTiming,
  testcenterVolumes,
} from '../../src/data/testcenter.js';

const catalogPage = (overrides: Partial<Parameters<typeof searchCatalog>[0]> = {}) =>
  searchCatalog({ limit: 10, offset: 0, query: '', ...overrides });

const groupsPage = (overrides: Partial<Parameters<typeof searchGroups>[0]> = {}) =>
  searchGroups({ limit: 10, offset: 0, query: '', ...overrides });

describe('the test-centre index', () => {
  it('documents its provenance and its limitations', () => {
    const meta = testcenterMeta();
    expect(meta.name).toBe('IELTS mock-exam test-centre index');
    expect(meta.repository).toBe('https://github.com/wanli4473/yysd-testcenter');
    expect(meta.liveSite).toBe('https://youyisida.com');
    expect(meta.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(meta.manifestGenerated).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(meta.license).toBe('CC BY 4.0');
    expect(meta.attribution).toContain('no upstream licence');
    expect(meta.note).toContain('No exam HTML');
    for (const source of Object.values(meta.sources)) {
      expect(source.sha1).toMatch(/^[0-9a-f]{40}$/);
      expect(source.sourceUrl).toContain(source.path);
    }
  });

  it('reports consistent catalogue statistics', () => {
    const stats = testcenterStats();
    expect(stats.catalog.items).toBe(377);
    expect(stats.catalog.manifestCount).toBe(377);
    expect(stats.catalog.byZone).toEqual({ mock: 226, practice: 10, study: 141 });
    expect(stats.catalog.byPaper).toEqual({
      drill: 12,
      'full-mock': 3,
      listening: 72,
      reading: 76,
      vocabulary: 140,
      writing: 74,
    });
    expect(Object.values(stats.catalog.byZone).reduce((a, b) => a + b, 0)).toBe(377);
    expect(Object.values(stats.catalog.byPaper).reduce((a, b) => a + b, 0)).toBe(377);
    expect(Object.values(stats.catalog.bySubject).reduce((a, b) => a + b, 0)).toBe(377);
    expect(stats.catalog.cambridgePapers).toBe(222);
    expect(stats.catalog.cambridgeVolumes.listening).toHaveLength(18);
    expect(stats.catalog.cambridgeVolumes.reading[0]).toBe(3);
    expect(stats.catalog.cambridgeVolumes.writing).toHaveLength(19);
    expect(stats.catalog.vocabBooks).toBe(140);
    expect(stats.catalog.addedRange).toEqual({ first: '2026-06-18', last: '2026-09-02' });
  });

  it('reports the taxonomy statistics of both tagged papers', () => {
    const stats = testcenterStats();
    expect(stats.taxonomy.listening.groups).toBe(530);
    expect(stats.taxonomy.reading.groups).toBe(569);
    for (const paper of ['listening', 'reading'] as const) {
      const taxonomy = stats.taxonomy[paper];
      expect(taxonomy.parentExams).toBe(68);
      expect(taxonomy.upstreamGroups).toBe(taxonomy.groups);
      expect(taxonomy.firstVolume).toBe(5);
      expect(taxonomy.lastVolume).toBe(21);
      expect(Object.values(taxonomy.byType).reduce((a, b) => a + b, 0)).toBe(taxonomy.questions);
      expect(Object.values(taxonomy.byScene).reduce((a, b) => a + b, 0)).toBeLessThan(taxonomy.questions);
      expect(Object.values(taxonomy.byDifficulty).reduce((a, b) => a + b, 0)).toBeLessThan(
        taxonomy.questions,
      );
    }
    expect(stats.taxonomy.listening.sectionsTagged).toBe(266);
    expect(stats.taxonomy.reading.sectionsTagged).toBe(198);
    expect(stats.taxonomy.listening.questions).toBe(2720);
    expect(stats.taxonomy.reading.questions).toBe(2688);
    expect(stats.taxonomy.listening.byType['summary-completion']).toBe(1558);
    expect(stats.taxonomy.reading.byType['true-false-not-given']).toBe(745);
    expect(stats.taxonomy.listening.overlappingRanges).toBe(1);
    expect(stats.taxonomy.reading.overlappingRanges).toBe(3);
    expect(stats.taxonomy.listening.noDifficulty).toBe(32);
    expect(stats.taxonomy.reading.noDifficulty).toBe(34);
    expect(stats.taxonomy.listening.noScene).toBe(11);
    expect(stats.taxonomy.reading.noScene).toBe(19);
  });

  it('normalises every raw label onto the canonical taxonomy', () => {
    const labels = testcenterStats().rawTypeLabels;
    expect(labels).toHaveLength(15);
    for (const label of labels) {
      expect(QUESTION_TYPE_IDS).toContain(label.canonical);
      expect(label.occurrences).toBeGreaterThan(0);
    }
    const completion = labels.filter((label) => label.raw === '填空题');
    expect(completion).toHaveLength(2);
    expect(completion.find((label) => label.paper === 'listening')?.canonical).toBe('summary-completion');
    expect(completion.find((label) => label.paper === 'reading')?.canonical).toBe('sentence-completion');
  });
});

describe('the test-centre catalogue', () => {
  it('indexes every manifest paper with provenance', () => {
    const items = testcenterCatalog();
    expect(items).toHaveLength(377);
    const ids = new Set(items.map((item) => item.id));
    expect(ids.size).toBe(items.length);
    for (const item of items) {
      expect(TESTCENTER_PAPERS).toContain(item.paper);
      expect(item.upstreamId.length).toBeGreaterThan(0);
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.added).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(item.sourcePath.startsWith('library/')).toBe(true);
      expect(decodeURIComponent(item.sourceUrl)).toContain(item.sourcePath);
      expect(item.sha1).toMatch(/^[0-9a-f]{40}$/);
      expect(item.sizeBytes).toBeGreaterThan(0);
      expect(item.durationMinutes).toBeGreaterThanOrEqual(0);
      expect(item.taggedGroups).toBeGreaterThanOrEqual(0);
    }
  });

  it('derives canonical paper facets', () => {
    expect(findCatalogItem('cambridge-10-test-1')?.paper).toBe('listening');
    expect(findCatalogItem('cambridge-10-test-1-reading')?.paper).toBe('reading');
    expect(findCatalogItem('cambridge-10-test-1-writing')?.paper).toBe('writing');
    expect(findCatalogItem('placement-test-1')?.paper).toBe('full-mock');
    expect(findCatalogItem('placement-junior-1')?.paper).toBe('drill');
    expect(findCatalogItem('list1')?.paper).toBe('vocabulary');
    expect(findCatalogItem('numbers-1')?.paper).toBe('drill');
  });

  it('keeps the teacher secret sets outside the volume numbering', () => {
    for (const id of ['secret-set-1-reading', 'secret-set-2-reading']) {
      const item = findCatalogItem(id);
      expect(item?.paper).toBe('reading');
      expect(item?.subject).toBe('cambridge-reading');
      expect(item?.volume).toBeNull();
      expect(item?.test).toBeNull();
      expect(item?.added).toBe('2026-09-02');
    }
  });

  it('extracts Cambridge volume and test references', () => {
    const item = findCatalogItem('cambridge-10-test-3-reading');
    expect(item?.volume).toBe(10);
    expect(item?.test).toBe(3);
    const compact = findCatalogItem('c10-t1p1');
    expect(compact?.volume).toBe(10);
    expect(compact?.test).toBe(1);
    const intensive = findCatalogItem('cam20-test1-section1');
    expect(intensive?.volume).toBe(20);
    expect(intensive?.test).toBe(1);
    expect(findCatalogItem('placement-test-1')?.volume).toBeNull();
  });

  it('gives deterministic English titles to structurally named papers', () => {
    expect(findCatalogItem('cambridge-10-test-1')?.titleEn).toBe(
      'Cambridge IELTS 10 Test 1 - Listening paper',
    );
    expect(findCatalogItem('cambridge-10-test-1-reading')?.titleEn).toBe(
      'Cambridge IELTS 10 Test 1 - Reading paper',
    );
    expect(findCatalogItem('cambridge-10-test-1-writing')?.titleEn).toBe(
      'Cambridge IELTS 10 Test 1 - Writing paper',
    );
    expect(findCatalogItem('c10-t1p1')?.titleEn).toBe(
      'Cambridge IELTS 10 Test 1 Passage 1 - long-sentence drill',
    );
    expect(findCatalogItem('cam20-test1-section1')?.titleEn).toBe(
      'Cambridge IELTS 20 Test 1 Section 1 - intensive listening',
    );
    expect(findCatalogItem('placement-test-1')?.titleEn).toBe('YYSD full mock exam No. 1');
    expect(findCatalogItem('placement-junior-1')?.titleEn).toBe('YYSD junior placement paper No. 1');
    expect(findCatalogItem('sample-academic-reading-1')?.titleEn).toBe('Sample academic reading paper No. 1');
    expect(findCatalogItem('numbers-1')?.titleEn).toBe('Number dictation drill No. 1');
    expect(findCatalogItem('sample-grammar-present-perfect')?.titleEn).toBe(
      'Grammar lesson: present perfect',
    );
    expect(findCatalogItem('list1')?.titleEn).toBeNull();
  });

  it('cross-references the tagged groups onto the catalogue', () => {
    const item = findCatalogItem('cambridge-9-test-4');
    expect(item?.taggedGroups).toBe(11);
    expect(findCatalogItem('list1')?.taggedGroups).toBe(0);
    expect(testcenterCatalog().filter((entry) => entry.taggedGroups > 0)).toHaveLength(136);
  });
});

describe('the Cambridge holdings matrix', () => {
  it('has one row per hosted volume', () => {
    const rows = testcenterVolumes();
    expect(rows).toHaveLength(19);
    expect(rows[0]?.volume).toBe(3);
    expect(rows[rows.length - 1]?.volume).toBe(21);
    for (const row of rows) {
      expect(row.papersTotal).toBe(row.listening.papers + row.reading.papers + row.writing.papers);
    }
  });

  it('shows an unbroken Cambridge 4-21 and a partial volume 3', () => {
    const rows = testcenterVolumes();
    expect(rows.filter((row) => row.complete)).toHaveLength(18);
    const volume3 = findTestcenterVolume(3);
    expect(volume3?.listening.papers).toBe(0);
    expect(volume3?.reading.tests).toEqual([1, 2]);
    expect(volume3?.writing.tests).toEqual([1, 2]);
    expect(volume3?.complete).toBe(false);
    const volume10 = findTestcenterVolume(10);
    expect(volume10?.papersTotal).toBe(12);
    expect(volume10?.complete).toBe(true);
  });

  it('tracks the tagged share per volume', () => {
    expect(findTestcenterVolume(4)?.taggedGroups).toBe(0);
    expect(findTestcenterVolume(5)?.taggedGroups).toBe(68);
    expect(findTestcenterVolume(5)?.taggedQuestions).toBe(320);
    expect(findTestcenterVolume(21)?.taggedGroups).toBe(66);
  });
});

describe('the hand-tagged question groups', () => {
  it('indexes every group with canonical types and provenance', () => {
    const groups = testcenterGroups();
    expect(groups).toHaveLength(1099);
    for (const group of groups) {
      expect(QUESTION_TYPE_IDS).toContain(group.type);
      expect(group.questions).toBe(group.qTo - group.qFrom + 1);
      expect(group.qFrom).toBeLessThanOrEqual(group.qTo);
      expect(['listening', 'reading']).toContain(group.paper);
      if (group.difficulty !== null) {
        expect(TESTCENTER_DIFFICULTIES).toContain(group.difficulty);
      }
      if (group.scene !== null) {
        expect(group.sceneLabel).not.toBeNull();
        expect(group.sceneRaw).not.toBeNull();
      }
      expect(group.sourceUrl).not.toBeNull();
      expect(group.sha1).toMatch(/^[0-9a-f]{40}$/);
    }
  });

  it('stores the groups in canonical order', () => {
    const groups = testcenterGroups();
    for (let index = 1; index < groups.length; index += 1) {
      const previous = groups[index - 1]!;
      const current = groups[index]!;
      const [prevPaper, currPaper] = [previous.paper, current.paper];
      expect(prevPaper <= currPaper).toBe(true);
      if (prevPaper === currPaper) {
        const prevKey = [previous.volume, previous.test, previous.part, previous.qFrom];
        const currKey = [current.volume, current.test, current.part, current.qFrom];
        const firstDiff = prevKey.findIndex((value, position) => value !== currKey[position]);
        expect(firstDiff === -1 || prevKey[firstDiff]! < currKey[firstDiff]!).toBe(true);
      }
    }
    expect(groups[0]?.id).toBe('cambridge-5-test-1-s1-q1-4');
    expect(groups[groups.length - 1]?.id).toBe('cambridge-21-test-4-reading-p3-q37-40');
  });
});

describe('the scene vocabulary', () => {
  it('crosswalks every scene onto a theme group', () => {
    const listening = testcenterScenes('listening');
    const reading = testcenterScenes('reading');
    expect(listening).toHaveLength(16);
    expect(reading).toHaveLength(8);
    for (const scene of [...listening, ...reading]) {
      expect(THEME_GROUPS).toContain(scene.themeGroup);
      expect(scene.groups).toBeGreaterThan(0);
      expect(scene.questions).toBeGreaterThan(0);
    }
  });

  it('orders scenes by tagged question count', () => {
    const listening = testcenterScenes('listening');
    expect(listening[0]?.id).toBe('tourism');
    expect(listening[0]?.questions).toBe(368);
    const reading = testcenterScenes('reading');
    expect(reading[0]?.id).toBe('society-humanities');
    const questions = listening.map((scene) => scene.questions);
    expect([...questions].sort((a, b) => b - a)).toEqual(questions);
  });
});

describe('the production score calibration', () => {
  it('parses both tables with contiguous coverage of 0-40', () => {
    const scoring = testcenterScoring();
    expect(scoring.provenance).toBe('production-calibration');
    expect(scoring.note).toContain('indicative');
    for (const paper of ['listening', 'reading'] as const) {
      const table = testcenterScoringTable(paper);
      expect(table.max).toBe(40);
      expect(table.rows[0]?.rawFrom).toBe(39);
      expect(table.rows[0]?.rawTo).toBe(40);
      expect(table.rows[table.rows.length - 1]?.rawFrom).toBe(0);
      for (let index = 1; index < table.rows.length; index += 1) {
        // Each row stops just below the threshold above it.
        expect(table.rows[index]?.rawTo).toBe((table.rows[index - 1]?.rawFrom ?? 0) - 1);
      }
      expect(table.levels[table.levels.length - 1]?.minBand).toBe(0);
      for (const row of table.rows) {
        expect(row.level.length).toBeGreaterThan(0);
      }
    }
    expect(testcenterScoringTable('listening').rows).toHaveLength(14);
    expect(testcenterScoringTable('reading').rows).toHaveLength(15);
  });

  it('looks bands up, including the platform level labels', () => {
    expect(findScoringRow('listening', 39)).toMatchObject({ band: 9, level: 'Expert / Very good user' });
    expect(findScoringRow('listening', 34)).toMatchObject({ band: 7.5, level: 'Good user' });
    expect(findScoringRow('listening', 0)).toMatchObject({ band: 2.5, level: 'Basic user' });
    expect(findScoringRow('reading', 33)).toMatchObject({ band: 7.5, level: 'Good user' });
    expect(findScoringRow('reading', 0)).toMatchObject({ band: 2, level: 'Basic user' });
    expect(findScoringRow('listening', 41)).toBeUndefined();
    expect(findScoringRow('reading', -1)).toBeUndefined();
  });
});

describe('the timing budgets', () => {
  it('reports the platform exam-shell durations', () => {
    const timing = testcenterTiming();
    expect(timing.papers).toEqual({ listening: 32, reading: 60, writing: 60, fullMock: 180 });
    expect(timing.minutesPerQuestion).toEqual({ listening: 0.8, reading: 1.5 });
    expect(timing.note).toContain('official timing');
  });
});

describe('the facet helpers', () => {
  it('lists sorted, distinct values for every facet', () => {
    for (const facet of ['zone', 'subject', 'paper'] as const) {
      const values = testcenterCatalogFacets(facet);
      expect(values.length).toBeGreaterThan(2);
      expect([...values]).toEqual([...values].sort());
      expect(new Set(values).size).toBe(values.length);
    }
    for (const facet of ['paper', 'type', 'scene', 'difficulty'] as const) {
      const values = testcenterGroupFacets(facet);
      expect([...values]).toEqual([...values].sort());
      expect(new Set(values).size).toBe(values.length);
    }
    expect(testcenterCatalogFacets('paper')).toEqual([...TESTCENTER_PAPERS].sort());
    expect(testcenterGroupFacets('paper')).toEqual(['listening', 'reading']);
  });
});

describe('searchCatalog', () => {
  it('paginates with defaults', () => {
    const page = catalogPage();
    expect(page.items).toHaveLength(10);
    expect(page.total).toBe(377);
    expect(page.hasMore).toBe(true);
    const full = catalogPage({ limit: 100, offset: 300 });
    expect(full.items).toHaveLength(77);
    expect(full.hasMore).toBe(false);
  });

  it('filters by zone, subject, paper and volume', () => {
    expect(catalogPage({ zones: ['mock'], limit: 100 }).total).toBe(226);
    expect(catalogPage({ subjects: ['cambridge-listening'], limit: 100 }).total).toBe(72);
    expect(catalogPage({ papers: ['full-mock'], limit: 100 }).total).toBe(3);
    expect(catalogPage({ volume: 3, limit: 100 }).total).toBe(4);
    const combined = catalogPage({ papers: ['reading'], volume: 3, limit: 100 });
    expect(combined.total).toBe(2);
    expect(combined.items.every((item) => item.volume === 3)).toBe(true);
  });

  it('searches free text over ids, titles and subjects', () => {
    const page = catalogPage({ query: 'placement' });
    expect(page.total).toBe(4);
    expect(page.items.every((item) => item.upstreamId.includes('placement'))).toBe(true);
    const chinese = catalogPage({ query: '剑桥雅思21' });
    expect(chinese.total).toBeGreaterThan(0);
  });

  it('sorts by every key in both directions', () => {
    const slowest = catalogPage({ sort: 'duration', order: 'desc', limit: 3 });
    expect(slowest.items[0]?.durationMinutes).toBe(180);
    const fastest = catalogPage({ sort: 'duration', limit: 3 });
    expect(fastest.items[0]?.durationMinutes).toBe(0);
    const added = catalogPage({ sort: 'added', limit: 1 });
    expect(added.items[0]?.added).toBe('2026-06-18');
    const subjects = catalogPage({ sort: 'subject', limit: 1 });
    expect(subjects.items[0]?.subject).toBe('cambridge-listening');
    const descending = catalogPage({ sort: 'subject', order: 'desc', limit: 1 });
    expect(descending.items[0]?.subject).toBe('vocab-special-writing');
  });

  it('returns an empty page for filters nothing matches', () => {
    const page = catalogPage({ query: 'no-such-paper-xyz' });
    expect(page.total).toBe(0);
    expect(page.items).toHaveLength(0);
    expect(page.hasMore).toBe(false);
  });
});

describe('searchGroups', () => {
  it('paginates with the canonical order as default', () => {
    const page = groupsPage();
    expect(page.total).toBe(1099);
    expect(page.items[0]?.id).toBe('cambridge-5-test-1-s1-q1-4');
  });

  it('filters by paper, type, scene, difficulty, volume and test', () => {
    expect(groupsPage({ papers: ['listening'], limit: 100 }).total).toBe(530);
    expect(groupsPage({ types: ['true-false-not-given'], limit: 100 }).total).toBe(141);
    expect(groupsPage({ scenes: ['tourism'], limit: 100 }).total).toBe(82);
    expect(groupsPage({ difficulties: ['hard'], papers: ['reading'], limit: 100 }).total).toBe(130);
    const byTest = groupsPage({ volume: 21, test: 2, limit: 100 });
    expect(byTest.total).toBe(17);
    expect(byTest.items.every((group) => group.volume === 21 && group.test === 2)).toBe(true);
  });

  it('searches free text over labels and parents', () => {
    const page = groupsPage({ query: '旅游' });
    expect(page.total).toBe(82);
    // Reading ids embed the listening-style base name, so the query matches
    // both papers of Cambridge 9 Test 4 (11 listening + 8 reading groups).
    const parent = groupsPage({ query: 'cambridge-9-test-4', limit: 30 });
    expect(parent.total).toBe(19);
    expect(parent.items.every((group) => group.id.includes('cambridge-9-test-4'))).toBe(true);
  });

  it('sorts by every key in both directions', () => {
    const biggest = groupsPage({ sort: 'questions', order: 'desc', limit: 1 });
    expect(biggest.items[0]?.questions).toBe(10);
    const smallest = groupsPage({ sort: 'questions', limit: 1 });
    expect(smallest.items[0]?.questions).toBe(1);
    const byType = groupsPage({ sort: 'type', limit: 1 });
    expect(byType.items[0]?.type).toBe('diagram-label-completion');
    // The empty scene sorts before every slug ascending and after them descending.
    const byScene = groupsPage({ sort: 'scene', limit: 1 });
    expect(byScene.items[0]?.scene).toBeNull();
    const bySceneDesc = groupsPage({ sort: 'scene', order: 'desc', limit: 1 });
    expect(bySceneDesc.items[0]?.scene).toBe('tourism');
  });

  it('returns an empty page for filters nothing matches', () => {
    const page = groupsPage({ volume: 4 });
    expect(page.total).toBe(0);
  });
});

describe('buildDrill', () => {
  it('composes the same deterministic drill for identical requests', () => {
    const first = buildDrill({ paper: 'listening', questions: 10 });
    const second = buildDrill({ paper: 'listening', questions: 10 });
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(first.totals).toEqual({ groups: 3, questions: 10 });
    expect(first.timing.minutesPerQuestion).toBe(0.8);
    expect(first.timing.suggestedMinutes).toBe(8);
    expect(first.timing.budgetMinutes).toBe(8);
    expect(first.links.groups).toBe('/v1/testcenter/groups?paper=listening');
    expect(first.links.scoring).toBe('/v1/testcenter/scoring?paper=listening');
  });

  it('paces reading drills at 1.5 minutes per question', () => {
    const plan = buildDrill({ paper: 'reading', questions: 20 });
    expect(plan.timing.minutesPerQuestion).toBe(1.5);
    expect(plan.totals.questions).toBeGreaterThanOrEqual(20);
    expect(plan.timing.suggestedMinutes).toBe(
      Math.ceil(plan.totals.questions * plan.timing.minutesPerQuestion),
    );
  });

  it('honours every filter and echoes it back', () => {
    const plan = buildDrill({
      paper: 'listening',
      questions: 40,
      type: 'multiple-choice',
      scene: 'tourism',
      difficulty: 'hard',
      volume: 10,
      test: 2,
      minutes: 25,
    });
    expect(plan.filters).toEqual({
      type: 'multiple-choice',
      scene: 'tourism',
      difficulty: 'hard',
      volume: 10,
      test: 2,
    });
    expect(plan.selection.every((group) => group.type === 'multiple-choice')).toBe(true);
    expect(plan.selection.every((group) => group.scene === 'tourism')).toBe(true);
    expect(plan.selection.every((group) => group.difficulty === 'hard')).toBe(true);
    expect(plan.timing.budgetMinutes).toBe(25);
    expect(plan.links.groups).toContain('type=multiple-choice');
    expect(plan.links.groups).toContain('volume=10');
  });

  it('returns an empty drill when nothing matches', () => {
    const plan = buildDrill({ paper: 'reading', questions: 10, type: 'short-answer' });
    expect(plan.selection).toHaveLength(0);
    expect(plan.totals).toEqual({ groups: 0, questions: 0 });
    expect(plan.timing.suggestedMinutes).toBe(1);
  });
});
