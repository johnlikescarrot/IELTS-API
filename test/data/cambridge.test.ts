import { describe, expect, it } from 'vitest';

import {
  CAMBRIDGE_DIFFICULTIES,
  CAMBRIDGE_SKILLS,
  cambridgeFacets,
  cambridgeMeta,
  cambridgeQuestionTypes,
  cambridgeScenes,
  cambridgeStats,
  cambridgeTaskFamilies,
  cambridgeTests,
  cambridgeTypeFrequencies,
  cambridgeVolumes,
  findCambridgeTest,
  findCambridgeVolume,
  meanReadingEase,
  searchCambridgeTests,
  totalAudioSeconds,
} from '../../src/data/cambridge.js';
import { QUESTION_TYPE_IDS } from '../../src/data/questionTypes.js';
import { ESSAY_QUESTION_TYPES } from '../../src/data/topics.js';

import type { CambridgeListeningTest, CambridgeReadingTest, CambridgeWritingTest } from '../../src/types.js';

const page = (overrides: Partial<Parameters<typeof searchCambridgeTests>[0]> = {}) =>
  searchCambridgeTests({ limit: 10, offset: 0, ...overrides });

const reading = (id: string) => findCambridgeTest(id) as CambridgeReadingTest;
const listening = (id: string) => findCambridgeTest(id) as CambridgeListeningTest;
const writing = (id: string) => findCambridgeTest(id) as CambridgeWritingTest;

describe('the Cambridge test-structure index', () => {
  it('documents its provenance and its limitations', () => {
    const meta = cambridgeMeta();
    expect(meta.repository).toBe('https://github.com/wanli4473/yysd-testcenter');
    expect(meta.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(meta.license).toContain('None declared');
    expect(meta.note).toContain('non-substitutive');
    expect(meta.scenes.reading).toContain('history');
    expect(meta.scenes.listening).toContain('daily-life');
    expect(meta.difficulties).toEqual([...CAMBRIDGE_DIFFICULTIES].sort());
  });

  it('indexes 220 of the 222 upstream test pages across volumes 3-21', () => {
    const stats = cambridgeStats();
    expect(stats.upstreamPages).toBe(222);
    expect(stats.indexedItems).toBe(220);
    expect(stats.indexedItems).toBe(cambridgeTests().length);
    expect(stats.bySkill).toEqual({ listening: 72, reading: 74, writing: 74 });
    expect(stats.volumes).toBe(19);
    expect(stats.completeVolumes).toBe(18);
    expect(cambridgeVolumes().map((row) => row.volume)).toEqual(
      Array.from({ length: 19 }, (_, index) => index + 3),
    );
  });

  it('counts the same questions in the items, the groups and the statistics', () => {
    const stats = cambridgeStats();
    const questioned = cambridgeTests().filter((item) => 'groups' in item);
    const summed = questioned.reduce((total, item) => total + (item.questions ?? 0), 0);
    expect(summed).toBe(stats.questions);
    expect(stats.questions).toBe(146 * 40);
    const byType = Object.values(stats.questionTypes).reduce((total, count) => total + count, 0);
    expect(byType).toBe(stats.questions);
    const byForm = Object.values(stats.answerForms).reduce((total, count) => total + count, 0);
    expect(byForm).toBe(stats.questions);
    expect(stats.answerForms.unkeyed).toBeUndefined();
    const groups = questioned.reduce((total, item) => total + ('groups' in item ? item.groups.length : 0), 0);
    expect(groups).toBe(stats.questionGroups);
    for (const item of questioned) {
      if ('groups' in item) {
        expect(item.groups.reduce((total, group) => total + group.count, 0)).toBe(item.questions);
        expect(Object.keys(item.typeCounts).sort()).toEqual(item.questionTypes);
        for (const group of item.groups) {
          expect(QUESTION_TYPE_IDS).toContain(group.questionType);
          expect(group.to - group.from + 1).toBeGreaterThanOrEqual(group.count);
        }
      }
    }
  });

  it('reports its agreement with the upstream editorial labels instead of hiding it', () => {
    const agreement = cambridgeStats().upstreamTypeAgreement;
    expect(agreement.labelledGroups + agreement.unlabelledGroups).toBe(cambridgeStats().questionGroups);
    expect(agreement.rate).toBeGreaterThan(0.95);
    expect(agreement.rate).toBeLessThan(1);
    const groups = cambridgeTests().flatMap((item) => ('groups' in item ? item.groups : []));
    expect(groups.filter((group) => group.agreesWithUpstream === false).length).toBe(
      agreement.labelledGroups - agreement.agreeing,
    );
    expect(groups.filter((group) => group.agreesWithUpstream === null).length).toBe(
      agreement.unlabelledGroups,
    );
  });

  it('measures every reading passage with the shared readability formulas', () => {
    const stats = cambridgeStats().reading;
    expect(stats.passages).toBe(74 * 3);
    expect(stats.measuredPassages).toBe(stats.passages - 1);
    expect(stats.fleschReadingEase?.count).toBe(stats.measuredPassages);
    expect(stats.fleschReadingEase?.mean).toBeGreaterThan(35);
    expect(stats.fleschReadingEase?.mean).toBeLessThan(50);
    // Passage 3 is measurably harder than passage 1 on average.
    expect(stats.readingEaseByPassage['3']?.mean).toBeLessThan(
      stats.readingEaseByPassage['1']?.mean as number,
    );
    const stepwells = reading('cam-10-t1-reading');
    expect(stepwells.passages[0]?.title).toBe('Stepwells');
    expect(stepwells.passages[0]?.readability?.words).toBeGreaterThan(700);
    expect(stepwells.passages[1]?.letteredParagraphs).toBe(9);
    // The one passage whose text is missing upstream is left visibly null.
    expect(reading('cam-7-t1-reading').passages[0]?.readability).toBeNull();
  });

  it('recovers listening audio durations from the cue points', () => {
    const stats = cambridgeStats().listening;
    expect(stats.sections).toBe(72 * 4);
    expect(stats.timedSections).toBe(68 * 4);
    expect(stats.testAudioSeconds?.count).toBe(68);
    expect(stats.testAudioSeconds?.mean).toBeGreaterThan(1500);
    expect(stats.testAudioSeconds?.mean).toBeLessThan(1800);
    expect(listening('cam-21-t1-listening').sections[0]?.audioSeconds).toBe(407);
    expect(listening('cam-4-t1-listening').sections.every((section) => section.audioSeconds === null)).toBe(
      true,
    );
  });

  it('classifies the writing tasks into the API task families', () => {
    const stats = cambridgeStats().writing;
    expect(stats.tests).toBe(74);
    expect(Object.values(stats.task2Families).reduce((a, b) => a + b, 0)).toBe(74);
    for (const family of Object.keys(stats.task2Families)) {
      expect(ESSAY_QUESTION_TYPES).toContain(family);
    }
    expect(stats.task1Families['map']).toBeGreaterThan(5);
    const first = writing('cam-10-t1-writing');
    expect(first.task1.family).toBe('chart');
    expect(first.task1.visuals).toBe(1);
    // "To what extent do you agree...? What sort of punishment...?": the opinion
    // cue takes precedence over the question count, which is still reported.
    expect(first.task2.family).toBe('opinion');
    expect(first.task2.questions).toBe(2);
    expect(writing('cam-4-t1-writing').task2.family).toBe('advantages-disadvantages');
  });

  it('looks up tests and volumes case-insensitively', () => {
    expect(findCambridgeTest(' CAM-15-T2-LISTENING ')?.skill).toBe('listening');
    expect(findCambridgeTest('cam-99-t1-reading')).toBeUndefined();
    expect(findCambridgeVolume(3)?.complete).toBe(false);
    expect(findCambridgeVolume(3)?.tests.listening).toEqual([]);
    expect(findCambridgeVolume(17)?.complete).toBe(true);
    expect(findCambridgeVolume(2)).toBeUndefined();
  });

  it('derives per-test readability and audio helpers', () => {
    const stepwells = reading('cam-10-t1-reading');
    expect(meanReadingEase(stepwells)).toBeCloseTo((40.78 + 37.54 + 38.43) / 3, 1);
    expect(meanReadingEase(writing('cam-10-t1-writing'))).toBeNull();
    expect(totalAudioSeconds(listening('cam-10-t1-listening'))).toBeGreaterThan(1400);
    expect(totalAudioSeconds(listening('cam-4-t1-listening'))).toBeNull();
    expect(totalAudioSeconds(stepwells)).toBeNull();
    const blank = { ...stepwells, passages: stepwells.passages.map((p) => ({ ...p, readability: null })) };
    expect(meanReadingEase(blank)).toBeNull();
  });
});

describe('searchCambridgeTests', () => {
  it('sorts by volume, test and skill by default', () => {
    const result = page({ limit: 4 });
    expect(result.items.map((item) => item.id)).toEqual([
      'cam-3-t1-reading',
      'cam-3-t1-writing',
      'cam-3-t2-reading',
      'cam-3-t2-writing',
    ]);
    expect(result.total).toBe(220);
    expect(result.hasMore).toBe(true);
  });

  it('filters by skill, volume and test', () => {
    const result = page({ skills: ['listening'], volumes: [10, 11], test: 2 });
    expect(result.items.map((item) => item.id)).toEqual(['cam-10-t2-listening', 'cam-11-t2-listening']);
  });

  it('searches identifiers, titles and paths', () => {
    expect(page({ query: 'stepwells' }).items.map((item) => item.id)).toEqual(['cam-10-t1-reading']);
    expect(page({ query: 'cambridge-12-test-3' }).total).toBe(3);
  });

  it('requires every requested question type', () => {
    const result = page({ types: ['matching-headings', 'yes-no-not-given'], limit: 100 });
    expect(result.total).toBeGreaterThan(0);
    for (const item of result.items) {
      expect('questionTypes' in item && item.questionTypes).toContain('matching-headings');
      expect('questionTypes' in item && item.questionTypes).toContain('yes-no-not-given');
    }
    expect(page({ types: ['matching-headings'], skills: ['writing'] }).total).toBe(0);
    expect(page({ types: [] }).total).toBe(220);
  });

  it('filters by scene across passages and sections', () => {
    const history = page({ scenes: ['history'], limit: 100 });
    expect(history.items.every((item) => item.skill === 'reading')).toBe(true);
    expect(history.total).toBeGreaterThan(20);
    const daily = page({ scenes: ['daily-life'], limit: 100 });
    expect(daily.items.every((item) => item.skill === 'listening')).toBe(true);
    expect(page({ scenes: ['history'], skills: ['writing'] }).total).toBe(0);
    expect(page({ scenes: [] }).total).toBe(220);
  });

  it('filters by difficulty and by writing family', () => {
    const hard = page({ difficulty: 'hard', limit: 100 });
    expect(hard.items.every((item) => item.skill !== 'writing')).toBe(true);
    expect(page({ difficulty: 'hard', volumes: [3] }).total).toBe(0);
    const maps = page({ task1Family: 'map', limit: 100 });
    expect(maps.items.every((item) => item.skill === 'writing' && item.task1.family === 'map')).toBe(true);
    expect(maps.total).toBe(cambridgeStats().writing.task1Families['map']);
    const discussion = page({ task2Family: 'discussion', limit: 100 });
    expect(discussion.total).toBe(cambridgeStats().writing.task2Families['discussion']);
    expect(page({ task1Family: 'map', skills: ['reading'] }).total).toBe(0);
    expect(page({ task2Family: 'discussion', task1Family: 'table' }).total).toBeLessThan(discussion.total);
  });

  it('filters by mean reading ease and drops tests without a measurable passage set', () => {
    const easy = page({ minReadingEase: 45, limit: 100 });
    expect(easy.items.every((item) => item.skill === 'reading')).toBe(true);
    expect(easy.items.every((item) => (meanReadingEase(item) as number) >= 45)).toBe(true);
    const window = page({ minReadingEase: 40, maxReadingEase: 42, limit: 100 });
    expect(window.items.every((item) => (meanReadingEase(item) as number) <= 42)).toBe(true);
    expect(window.total).toBeLessThan(easy.total + 74);
    expect(page({ maxReadingEase: 0 }).total).toBe(0);
  });

  it('sorts by identifier, readability, audio and question count', () => {
    const ids = page({ sort: 'id', limit: 2 }).items.map((item) => item.id);
    expect(ids).toEqual(['cam-10-t1-listening', 'cam-10-t1-reading']);
    const easiest = page({ sort: 'reading-ease', order: 'desc', limit: 1 }).items[0];
    expect(easiest?.skill).toBe('reading');
    expect(meanReadingEase(easiest as CambridgeReadingTest)).toBeGreaterThan(50);
    const longest = page({ sort: 'audio', order: 'desc', limit: 1 }).items[0];
    expect(longest?.skill).toBe('listening');
    const fewest = page({ sort: 'questions', limit: 1 }).items[0];
    expect(fewest?.skill).toBe('writing');
    const most = page({ sort: 'questions', order: 'desc', limit: 1 }).items[0];
    expect(most?.questions).toBe(40);
  });
});

describe('cambridgeTypeFrequencies', () => {
  it('tabulates every canonical type with shares that sum to one', () => {
    const rows = cambridgeTypeFrequencies();
    expect(rows.map((row) => row.id)).toEqual(cambridgeQuestionTypes());
    expect(rows.reduce((sum, row) => sum + row.share, 0)).toBeCloseTo(1, 2);
    expect(rows[0]?.id).toBe('summary-completion');
    for (const row of rows) {
      expect(row.meanGroupSize).toBeCloseTo(row.questions / row.groups, 2);
    }
  });

  it('splits by skill', () => {
    const readingRows = cambridgeTypeFrequencies('reading');
    const listeningRows = cambridgeTypeFrequencies('listening');
    expect(readingRows.find((row) => row.id === 'true-false-not-given')?.questions).toBeGreaterThan(400);
    expect(listeningRows.find((row) => row.id === 'true-false-not-given')).toBeUndefined();
    expect(readingRows.reduce((sum, row) => sum + row.questions, 0)).toBe(74 * 40);
    expect(listeningRows.reduce((sum, row) => sum + row.questions, 0)).toBe(72 * 40);
  });
});

describe('facets', () => {
  it('derives facet values from the index', () => {
    const facets = cambridgeFacets();
    expect(facets['skill']).toEqual(CAMBRIDGE_SKILLS);
    expect(facets['type']).toEqual(cambridgeQuestionTypes());
    expect(facets['scene']).toEqual(cambridgeScenes());
    expect(facets['difficulty']).toEqual(CAMBRIDGE_DIFFICULTIES);
    expect(facets['task1Family']).toEqual(cambridgeTaskFamilies('task1'));
    expect(facets['task2Family']).toEqual(cambridgeTaskFamilies('task2'));
    expect(cambridgeScenes()).toContain('biology');
    expect(new Set(cambridgeScenes()).size).toBe(cambridgeScenes().length);
    expect(cambridgeTaskFamilies('task2')).toContain('opinion');
  });
});
