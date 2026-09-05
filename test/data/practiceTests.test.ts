import { describe, expect, it } from 'vitest';

import {
  CEFR_BANDS,
  PRACTICE_COLLECTIONS,
  PRACTICE_SKILLS,
  findPracticeItem,
  observedQuestionTypes,
  practiceFacets,
  practiceItems,
  practiceMeta,
  practiceStats,
  recommendPracticeItems,
  searchPracticeItems,
} from '../../src/data/practiceTests.js';
import { QUESTION_TYPE_IDS } from '../../src/data/questionTypes.js';

const page = (overrides: Partial<Parameters<typeof searchPracticeItems>[0]> = {}) =>
  searchPracticeItems({ limit: 10, offset: 0, ...overrides });

describe('the practice-test index', () => {
  it('documents its provenance and its limitations', () => {
    const meta = practiceMeta();
    expect(meta.repository).toBe('https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS');
    expect(meta.license).toBe('CC BY 4.0');
    expect(meta.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(meta.note).toContain('Derived metadata only');
    expect(Object.keys(meta.collections).sort()).toEqual([...PRACTICE_COLLECTIONS].sort());
    expect(meta.upstreamDirectories['graded-reading']).toBe(1232);
  });

  it('indexes every collection', () => {
    const stats = practiceStats();
    expect(stats.indexedItems).toBe(practiceItems().length);
    expect(stats.byCollection['reading-full-test']).toBeGreaterThan(200);
    expect(stats.byCollection['listening-full-test']).toBeGreaterThan(200 - 100);
    expect(stats.byCollection['graded-reading']).toBe(1232);
    expect(stats.bySkill['reading']! + stats.bySkill['listening']!).toBe(stats.indexedItems);
    expect(stats.coverageRatio).toBeGreaterThan(0.9);
    expect(stats.unreadableSources).toBe(0);
  });

  it('counts the same questions in the items and in the statistics', () => {
    const stats = practiceStats();
    const summed = practiceItems().reduce((total, item) => total + item.questions, 0);
    expect(summed).toBe(stats.questions);
    const byType = Object.values(stats.questionTypes).reduce((total, count) => total + count, 0);
    expect(byType).toBe(stats.questions);
    expect(stats.questionsPerItem?.count).toBe(stats.indexedItems);
  });

  it('normalises every upstream label onto the canonical taxonomy', () => {
    const stats = practiceStats();
    const labels = Object.entries(stats.rawLabels);
    expect(labels.length).toBeGreaterThan(50);
    for (const [label, mapping] of labels) {
      expect(label.length).toBeGreaterThan(0);
      expect(QUESTION_TYPE_IDS).toContain(mapping.canonical);
      expect(mapping.occurrences).toBeGreaterThan(0);
    }
    for (const id of observedQuestionTypes()) {
      expect(QUESTION_TYPE_IDS).toContain(id);
    }
  });

  it('describes every item consistently', () => {
    for (const item of practiceItems()) {
      expect(item.id).toMatch(/^(rft|lft|grd)-/);
      expect(PRACTICE_COLLECTIONS).toContain(item.collection);
      expect(PRACTICE_SKILLS).toContain(item.skill);
      expect(item.sourceUrl).toContain(item.sourcePath);
      expect(item.sha1).toMatch(/^[0-9a-f]{40}$/);
      const summed = Object.values(item.typeCounts).reduce((total, count) => total + count, 0);
      expect(summed).toBe(item.questions);
      expect(item.questionTypes).toEqual(Object.keys(item.typeCounts).sort());
      if (item.level !== null) {
        expect(CEFR_BANDS).toContain(item.level);
      }
    }
  });

  it('reports readability that increases in difficulty with the CEFR band', () => {
    const groups = practiceStats().readabilityByGroup;
    const easy = groups['A1-A2']!.fleschReadingEase!.mean;
    const middle = groups['B1-B2']!.fleschReadingEase!.mean;
    const hard = groups['C1-C2']!.fleschReadingEase!.mean;
    expect(easy).toBeGreaterThan(middle);
    expect(middle).toBeGreaterThan(hard);
    expect(groups['C1-C2']!.fleschKincaidGrade!.mean).toBeGreaterThan(
      groups['A1-A2']!.fleschKincaidGrade!.mean,
    );
    expect(groups['reading-full-test']!.words!.count).toBeGreaterThan(100);
  });

  it('never computes readability for listening items', () => {
    const listening = practiceItems().filter((item) => item.skill === 'listening');
    expect(listening.length).toBeGreaterThan(0);
    expect(listening.every((item) => item.readability === null)).toBe(true);
  });
});

describe('findPracticeItem', () => {
  it('finds an item case-insensitively', () => {
    expect(findPracticeItem('RFT-001')?.collection).toBe('reading-full-test');
    expect(findPracticeItem('  grd-a1a2-001 ')?.level).toBe('A1-A2');
  });

  it('returns undefined for an unknown identifier', () => {
    expect(findPracticeItem('nope-999')).toBeUndefined();
  });
});

describe('searchPracticeItems', () => {
  it('paginates by identifier by default', () => {
    const result = page({ limit: 3 });
    expect(result.items).toHaveLength(3);
    expect(result.total).toBe(practiceItems().length);
    expect(result.hasMore).toBe(true);
    expect([...result.items].map((item) => item.id)).toEqual([...result.items].map((item) => item.id).sort());
  });

  it('filters by collection, skill and level', () => {
    expect(page({ collections: ['listening-full-test'] }).items.every((i) => i.skill === 'listening')).toBe(
      true,
    );
    expect(page({ skills: ['reading'] }).items.every((i) => i.skill === 'reading')).toBe(true);
    const graded = page({ levels: ['C1-C2'] });
    expect(graded.items.every((item) => item.level === 'C1-C2')).toBe(true);
    expect(graded.total).toBe(660);
    expect(page({ collections: [], skills: [], levels: [], types: [] }).total).toBe(practiceItems().length);
  });

  it('requires every requested question type to be present', () => {
    const both = page({ types: ['matching-headings', 'true-false-not-given'], limit: 50 });
    expect(both.total).toBeGreaterThan(0);
    for (const item of both.items) {
      expect(item.questionTypes).toContain('matching-headings');
      expect(item.questionTypes).toContain('true-false-not-given');
    }
    expect(page({ types: ['matching'], skills: ['reading'], limit: 5 }).total).toBeGreaterThan(0);
  });

  it('filters by question count and by readability window', () => {
    expect(
      page({ minQuestions: 40, maxQuestions: 40, limit: 100 }).items.every((i) => i.questions === 40),
    ).toBe(true);
    const easy = page({ minReadingEase: 70, limit: 100 });
    expect(easy.items.every((item) => (item.readability?.fleschReadingEase ?? -1) >= 70)).toBe(true);
    const hard = page({ maxReadingEase: 10, limit: 100 });
    expect(hard.items.every((item) => (item.readability?.fleschReadingEase ?? 999) <= 10)).toBe(true);
    expect(page({ minReadingEase: 70, skills: ['listening'] }).total).toBe(0);
    expect(page({ maxReadingEase: 70, skills: ['listening'] }).total).toBe(0);
  });

  it('filters by audio availability and free text', () => {
    const audio = page({ withAudio: true, limit: 5 });
    expect(audio.items.every((item) => item.assets.audio)).toBe(true);
    expect(page({ withAudio: false, limit: 5 }).total).toBe(practiceItems().length);
    const search = page({ query: 'listening practice', limit: 5 });
    expect(search.total).toBeGreaterThan(0);
    expect(page({ query: 'zzzzz-no-such-title' }).total).toBe(0);
  });

  it('sorts by every documented key', () => {
    const byQuestions = page({ sort: 'questions', order: 'desc', limit: 2 });
    expect(byQuestions.items[0]!.questions).toBeGreaterThanOrEqual(byQuestions.items[1]!.questions);
    const byTitle = page({ sort: 'title', limit: 2 });
    expect(byTitle.items[0]!.title.toLowerCase() <= byTitle.items[1]!.title.toLowerCase()).toBe(true);
    const byWords = page({ sort: 'words', limit: 2 });
    expect(byWords.items[0]!.readability!.words).toBeLessThanOrEqual(byWords.items[1]!.readability!.words);
    const byEase = page({ sort: 'reading-ease', limit: 2 });
    expect(byEase.items[0]!.readability!.fleschReadingEase).toBeLessThanOrEqual(
      byEase.items[1]!.readability!.fleschReadingEase,
    );
    const byGrade = page({ sort: 'grade', order: 'desc', limit: 2 });
    expect(byGrade.items[0]!.readability!.fleschKincaidGrade).toBeGreaterThanOrEqual(
      byGrade.items[1]!.readability!.fleschKincaidGrade,
    );
  });
});

describe('practiceFacets', () => {
  it('exposes the filterable dimensions', () => {
    const facets = practiceFacets();
    expect(facets['collection']).toEqual(PRACTICE_COLLECTIONS);
    expect(facets['skill']).toEqual(PRACTICE_SKILLS);
    expect(facets['level']).toEqual(CEFR_BANDS);
    expect(facets['type']!.length).toBeGreaterThan(5);
  });
});

describe('recommendPracticeItems', () => {
  it('samples deterministically for a given seed', () => {
    const first = recommendPracticeItems({ count: 10, seed: 'study-plan' });
    const second = recommendPracticeItems({ count: 10, seed: 'study-plan' });
    expect(first.total).toBe(practiceItems().length);
    expect(first.seed).toBe('study-plan');
    expect(first.items.map((item) => item.id)).toEqual(second.items.map((item) => item.id));
    expect(new Set(first.items.map((item) => item.id)).size).toBe(10);
  });

  it('varies with the seed', () => {
    const one = recommendPracticeItems({ count: 10, seed: 'alpha' });
    const two = recommendPracticeItems({ count: 10, seed: 'beta' });
    expect(one.items.map((item) => item.id)).not.toEqual(two.items.map((item) => item.id));
  });

  it('honours filters and clamps the count to the matches', () => {
    const listening = recommendPracticeItems({ skills: ['listening'], count: 20, seed: 's' });
    expect(listening.items.every((item) => item.skill === 'listening')).toBe(true);
    const graded = recommendPracticeItems({ levels: ['A1-A2'], count: 3, seed: 's' });
    expect(graded.items).toHaveLength(3);
    expect(graded.items.every((item) => item.level === 'A1-A2')).toBe(true);
    const clamped = recommendPracticeItems({ levels: ['A1-A2'], count: 5000, seed: 's' });
    expect(clamped.items).toHaveLength(clamped.total);
  });

  it('returns an empty list when nothing matches', () => {
    const none = recommendPracticeItems({ query: 'zzzzz-no-such-title', count: 5, seed: 's' });
    expect(none.total).toBe(0);
    expect(none.items).toEqual([]);
  });
});
