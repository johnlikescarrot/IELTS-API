import { describe, expect, it } from 'vitest';

import {
  WORDBANK_IDS,
  findWordbank,
  findWordbankWord,
  masteryAfter,
  nextReviewInterval,
  reviewLadder,
  searchWordbankCollocations,
  searchWordbankTopics,
  searchWordbankWords,
  wordbankBanks,
  wordbankCollocationHeadwords,
  wordbankCollocationStats,
  wordbankOverlaps,
  wordbankReview,
  wordbankSpeakingTopics,
  wordbankTopicFacets,
  wordbankTopics,
  wordbankWords,
  wordbankWritingTopics,
  wordbanksCambridge,
  wordbanksMeta,
  wordbanksStats,
} from '../../src/data/wordbanks.js';

const wordsPage = (overrides: Partial<Parameters<typeof searchWordbankWords>[0]> = {}) =>
  searchWordbankWords({ limit: 10, offset: 0, query: '', ...overrides });

const collocationsPage = (overrides: Partial<Parameters<typeof searchWordbankCollocations>[0]> = {}) =>
  searchWordbankCollocations({ limit: 10, offset: 0, query: '', ...overrides });

const topicsPage = (overrides: Partial<Parameters<typeof searchWordbankTopics>[0]> = {}) =>
  searchWordbankTopics({ limit: 10, offset: 0, query: '', ...overrides });

describe('the word-bank concordance', () => {
  it('documents its provenance and its limitations', () => {
    const meta = wordbanksMeta();
    expect(meta.name).toBe('Deployed word-bank concordance');
    expect(meta.repository).toBe('https://github.com/Iamdacai/ielts-vocab-system');
    expect(meta.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(meta.snapshot).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(meta.license).toBe('CC BY 4.0');
    expect(meta.attribution).toContain('no upstream licence');
    expect(meta.note).toContain('non-substitutive');
    expect(meta.note).toContain('No definition');
    for (const source of Object.values(meta.sources)) {
      expect(source.sha1).toMatch(/^[0-9a-f]{40}$/);
      expect(source.sourceUrl).toContain(source.path);
    }
  });

  it('reports the seven banks with inventories that add up', () => {
    const banks = wordbankBanks();
    expect(banks).toHaveLength(7);
    expect(banks.map((bank) => bank.id)).toEqual([...WORDBANK_IDS]);
    const ielts = findWordbank('ielts');
    expect(ielts?.labelZh).toBe('雅思单词表');
    expect(ielts?.rows).toBe(4541);
    expect(ielts?.distinctWords).toBe(4531);
    expect(ielts?.withDefinition).toBe(4541);
    expect(ielts?.caseCollisions).toBe((ielts?.rows ?? 0) - (ielts?.distinctWords ?? 0));
    for (const bank of banks) {
      expect(bank.distinctWords).toBeGreaterThan(0);
      expect(bank.withPhonetic).toBeLessThanOrEqual(bank.rows);
      expect(bank.withDefinition).toBeLessThanOrEqual(bank.rows);
      expect(bank.sourceUrl).toContain(
        'https://github.com/Iamdacai/ielts-vocab-system/blob/master/vocabulary/',
      );
    }
    expect(findWordbank('nope')).toBeUndefined();
  });

  it('reports consistent headline statistics', () => {
    const stats = wordbanksStats();
    expect(stats.rows).toBe(47044);
    expect(stats.banks).toBe(7);
    expect(stats.distinctWords).toBe(wordbankWords().length);
    expect(stats.distinctWords).toBe(15930);
    expect(stats.membershipDistribution.reduce((total, row) => total + row.words, 0)).toBe(
      stats.distinctWords,
    );
    expect(stats.membershipDistribution[0]).toEqual({ banks: 1, words: 4417 });
    expect(stats.wordsInAllBanks).toBe(567);
    expect(stats.identicalBankPairs).toEqual([{ a: 'toefl', b: 'compilation', distinctWords: 9735 }]);
    expect(stats.ielts).toEqual({ words: 4531, exclusive: 425, inCambridge: 2153 });
    expect(stats.collocations).toEqual({ pairs: 3099, headwords: 413, partners: 1200 });
    expect(stats.topics).toEqual({ speaking: 26, writing: 26 });
    expect(stats.reviewIntervals).toBe(8);
  });

  it('computes a complete and symmetric overlap matrix', () => {
    const overlaps = wordbankOverlaps();
    expect(overlaps).toHaveLength(21);
    for (const row of overlaps) {
      expect(row.intersection).toBeGreaterThan(0);
      expect(row.union).toBeGreaterThanOrEqual(row.intersection);
      expect(row.jaccard).toBeCloseTo(row.intersection / row.union, 4);
    }
    const ieltsPairs = wordbankOverlaps('ielts');
    expect(ieltsPairs).toHaveLength(6);
    expect(ieltsPairs.every((row) => row.a === 'ielts' || row.b === 'ielts')).toBe(true);
    const toefl = ieltsPairs.find((row) => row.a === 'toefl' || row.b === 'toefl');
    expect(toefl?.intersection).toBe(2898);
    expect(toefl?.shareOfA).toBeCloseTo(2898 / 4531, 4);
    const cet4 = ieltsPairs.find((row) => row.a === 'cet4' || row.b === 'cet4');
    expect(cet4?.intersection).toBe(1721);
  });

  it('joins every bank against the Cambridge vocabulary', () => {
    const cambridge = wordbanksCambridge();
    expect(cambridge.cambridgeWords).toBe(4174);
    expect(cambridge.banks).toHaveLength(7);
    const ielts = cambridge.banks.find((row) => row.bank === 'ielts');
    expect(ielts?.words).toBe(2153);
    expect(ielts?.shareOfBank).toBeCloseTo(2153 / 4531, 4);
    expect(ielts?.shareOfCambridge).toBeCloseTo(2153 / 4174, 4);
    expect(cambridge.ielts.exclusiveToBank).toBe(425);
    const membership = Object.values(cambridge.membershipOfCambridgeWords);
    expect(membership.reduce((total, count) => total + count, 0)).toBe(4174);
  });

  it('indexes every word with memberships and cross-references', () => {
    const words = wordbankWords();
    expect(words[0]?.word).toBe('1');
    expect(words[0]?.id).toBe('wb00001');
    expect(words[1]?.word).toBe('a');
    expect(words.at(-1)?.id).toBe(`wb${String(words.length).padStart(5, '0')}`);
    for (const entry of words) {
      expect(entry.bankCount).toBe(entry.banks.length);
      expect(entry.banks.every((bank) => WORDBANK_IDS.includes(bank))).toBe(true);
    }
    const abandon = findWordbankWord('Abandon');
    expect(abandon?.banks).toContain('ielts');
    expect(abandon?.cambridge).toBe(true);
    expect(abandon?.collocations).toBe(9);
    expect(findWordbankWord('does-not-exist')).toBeUndefined();
  });

  it('searches words by query, bank, Cambridge status and collocation status', () => {
    expect(wordsPage({ query: 'environment' }).total).toBeGreaterThan(0);
    const ielts = wordsPage({ banks: ['ielts'] });
    expect(ielts.total).toBe(4531);
    expect(ielts.items.every((entry) => entry.banks.includes('ielts'))).toBe(true);
    const multi = wordsPage({ banks: ['ielts', 'gre'] });
    expect(multi.total).toBeGreaterThan(ielts.total);
    const inCambridge = wordsPage({ banks: ['ielts'], cambridge: true });
    expect(inCambridge.total).toBe(2153);
    const collocated = wordsPage({ collocated: true });
    expect(collocated.total).toBe(403);
    expect(collocated.items.every((entry) => entry.collocations !== null)).toBe(true);
    expect(wordsPage({ collocated: false }).total).toBe(15930 - 403);
    const byBanks = wordsPage({ sort: 'banks', order: 'desc', limit: 3 });
    expect(byBanks.items[0]?.bankCount).toBe(7);
    const byCollocations = wordsPage({ sort: 'collocations', order: 'desc', limit: 1 });
    expect(byCollocations.items[0]?.collocations).toBe(17);
    expect(byCollocations.items[0]?.word).toBe('cause');
    expect(wordsPage({ limit: 5, offset: 15925 }).items).toHaveLength(5);
    expect(wordsPage({ limit: 5, offset: 15926 }).hasMore).toBe(false);
  });

  it('publishes collocation aggregates without the pair list', () => {
    const stats = wordbankCollocationStats();
    expect(stats.pairs).toBe(3099);
    expect(stats.verbPairs + stats.nounPairs).toBe(stats.pairs);
    expect(stats.verbHeadwords + stats.nounHeadwords).toBe(stats.headwords);
    expect(stats.headwordsOutsideBanks).toBe(10);
    expect(stats.note).toContain('not redistributed');
    const heads = wordbankCollocationHeadwords();
    expect(heads).toHaveLength(413);
    expect(heads[0]?.word).toBe('abandon');
    expect(heads[0]?.category).toBe('verb');
    expect(heads[0]?.banks).toHaveLength(7);
    const nouns = collocationsPage({ categories: ['noun'] });
    expect(nouns.total).toBe(99);
    expect(nouns.items.every((head) => head.category === 'noun')).toBe(true);
    const verbsInIelts = collocationsPage({ banks: ['ielts'], categories: ['verb'] });
    expect(verbsInIelts.total).toBe(194);
    const byPartners = collocationsPage({ sort: 'partners', order: 'desc', limit: 1 });
    expect(byPartners.items[0]?.partners).toBe(17);
    const searched = collocationsPage({ query: 'abandon' });
    expect(searched.total).toBe(1);
  });

  it('exposes the review engine as verified parameters', () => {
    const review = wordbankReview();
    expect(review.model).toBe('ebbinghaus-ladder');
    expect(review.source.path).toBe('backend/spaced-repetition-algorithm.js');
    expect(review.source.sha1).toMatch(/^[0-9a-f]{40}$/);
    expect(reviewLadder()).toEqual([
      { step: 1, minutes: 5, label: '5 minutes' },
      { step: 2, minutes: 30, label: '30 minutes' },
      { step: 3, minutes: 720, label: '12 hours' },
      { step: 4, minutes: 1440, label: '1 day' },
      { step: 5, minutes: 2880, label: '2 days' },
      { step: 6, minutes: 5760, label: '4 days' },
      { step: 7, minutes: 10080, label: '7 days' },
      { step: 8, minutes: 21600, label: '15 days' },
    ]);
    expect(review.postBaseRule.baseMinutes).toBe(21600);
    expect(review.masteryRule.correctStep).toBe(5);
    expect(review.masteryRule.incorrectStep).toBe(-8);
    expect(review.reviewWindow.hours).toBe(2);
  });

  it('computes the next review interval like the deployed engine', () => {
    expect(nextReviewInterval(0, 0)).toEqual({
      minutes: 5,
      dynamic: false,
      step: 1,
      label: '5 minutes',
    });
    expect(nextReviewInterval(3, 0).minutes).toBe(1440);
    expect(nextReviewInterval(4, 0).minutes).toBe(2880);
    expect(nextReviewInterval(7, 100)).toEqual({
      minutes: 21600,
      dynamic: false,
      step: 8,
      label: '15 days',
    });
    expect(nextReviewInterval(8, 0)).toEqual({
      minutes: 21600,
      dynamic: true,
      step: null,
      label: null,
    });
    expect(nextReviewInterval(8, 50).minutes).toBe(32400);
    expect(nextReviewInterval(30, 25).minutes).toBe(27000);
  });

  it('updates the mastery score like the deployed engine', () => {
    expect(masteryAfter(40, true, 3)).toEqual({ change: 15, after: 55, clamped: false });
    expect(masteryAfter(40, false, 3)).toEqual({ change: -24, after: 16, clamped: false });
    expect(masteryAfter(95, true, 5)).toEqual({ change: 25, after: 100, clamped: true });
    expect(masteryAfter(10, false, 5)).toEqual({ change: -40, after: 0, clamped: true });
    expect(masteryAfter(0, true, 1).after).toBe(5);
    expect(masteryAfter(33.33, true, 1).after).toBe(38.33);
  });

  it('indexes the prompt banks with stable identifiers', () => {
    const speaking = wordbankSpeakingTopics();
    const writing = wordbankWritingTopics();
    expect(speaking).toHaveLength(26);
    expect(writing).toHaveLength(26);
    expect(speaking[0]?.id).toBe('sp01');
    expect(writing[0]?.id).toBe('wr01');
    expect(speaking.filter((topic) => topic.part === 2).every((topic) => topic.cueCard !== null)).toBe(true);
    expect(speaking.filter((topic) => topic.part !== 2).every((topic) => topic.cueCard === null)).toBe(true);
    expect(writing.filter((topic) => topic.taskType === 'task1-academic').length).toBe(6);
    expect(writing.filter((topic) => topic.taskType === 'task1-general').length).toBe(5);
    expect(writing.filter((topic) => topic.taskType === 'task2').length).toBe(15);
    for (const topic of [...speaking, ...writing]) {
      expect(topic.difficulty).not.toBeNull();
      expect(topic.frequency).toBeGreaterThanOrEqual(60);
      expect(topic.frequency).toBeLessThanOrEqual(95);
    }
    expect(wordbankTopics()).toHaveLength(52);
  });

  it('searches the prompt banks by skill, part, task type and difficulty', () => {
    expect(topicsPage().total).toBe(52);
    const speaking = topicsPage({ skill: 'speaking' });
    expect(speaking.total).toBe(26);
    expect(speaking.items.every((topic) => topic.skill === 'speaking')).toBe(true);
    const part2 = topicsPage({ part: 2 });
    expect(part2.total).toBe(8);
    expect(part2.items.every((topic) => topic.skill === 'speaking')).toBe(true);
    const task2 = topicsPage({ taskTypes: ['task2'] });
    expect(task2.total).toBe(15);
    const hard = topicsPage({ difficulties: ['hard'] });
    expect(hard.total).toBe(14);
    const byFrequency = topicsPage({ sort: 'frequency', order: 'desc', limit: 1 });
    expect(byFrequency.items[0]?.frequency).toBe(95);
    const byDifficulty = topicsPage({ sort: 'difficulty', order: 'desc', limit: 1 });
    expect(byDifficulty.items[0]?.difficulty).toBe('hard');
    const searched = topicsPage({ query: 'hometown' });
    expect(searched.total).toBe(1);
    expect(wordbankTopicFacets('skill')).toEqual(['speaking', 'writing']);
    expect(wordbankTopicFacets('part')).toEqual(['1', '2', '3']);
    expect(wordbankTopicFacets('taskType')).toEqual(['task1-academic', 'task1-general', 'task2']);
    expect(wordbankTopicFacets('difficulty')).toEqual(['easy', 'hard', 'medium']);
    expect(wordbankTopicFacets('chartType')).toEqual(['bar', 'line', 'map', 'pie', 'process', 'table']);
  });
});
