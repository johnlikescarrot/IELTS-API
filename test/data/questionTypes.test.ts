import { describe, expect, it } from 'vitest';

import {
  QUESTION_TYPES,
  QUESTION_TYPE_FAMILIES,
  QUESTION_TYPE_IDS,
  findQuestionType,
  questionTypesWithFrequency,
} from '../../src/data/questionTypes.js';
import { practiceStats } from '../../src/data/practiceTests.js';

describe('the question-type taxonomy', () => {
  it('covers the thirteen task families exactly once', () => {
    expect(QUESTION_TYPES).toHaveLength(13);
    expect(new Set(QUESTION_TYPE_IDS).size).toBe(13);
    expect(QUESTION_TYPE_FAMILIES).toEqual([
      'selection',
      'identification',
      'matching',
      'completion',
      'labelling',
    ]);
  });

  it('documents every type usefully', () => {
    for (const type of QUESTION_TYPES) {
      expect(type.id).toMatch(/^[a-z-]+$/);
      expect(type.name.length).toBeGreaterThan(3);
      expect(type.skills.length).toBeGreaterThan(0);
      expect(type.description.endsWith('.')).toBe(true);
      expect(type.assesses.endsWith('.')).toBe(true);
      expect(type.strategy.length).toBeGreaterThanOrEqual(3);
      expect(type.traps.length).toBeGreaterThanOrEqual(2);
      expect(type.answerFormat.length).toBeGreaterThan(3);
      expect(typeof type.followsTextOrder).toBe('boolean');
      expect(Array.isArray(type.aliasesZh)).toBe(true);
      for (const alias of type.aliasesZh) {
        expect(alias.length).toBeGreaterThan(0);
      }
    }
  });

  it('aligns the Chinese aliases with the surveyed mock-exam labels', () => {
    const byAlias = new Map<string, string[]>();
    for (const type of QUESTION_TYPES) {
      for (const alias of type.aliasesZh) {
        byAlias.set(alias, [...(byAlias.get(alias) ?? []), type.id]);
      }
    }
    // Broad source labels stay broad: 填空题 covers both completion families,
    // 判断题 covers both identification families, 配对题 covers matching twice.
    expect(byAlias.get('填空题')?.sort()).toEqual(['sentence-completion', 'summary-completion']);
    expect(byAlias.get('判断题')?.sort()).toEqual(['true-false-not-given', 'yes-no-not-given']);
    expect(byAlias.get('配对题')?.sort()).toEqual(['matching', 'matching-features']);
    // The surveyed taxonomies use no distinct label for sentence-ending
    // matching, and the taxonomy says so with an empty list rather than a guess.
    expect(QUESTION_TYPES.filter((type) => type.aliasesZh.length === 0).map((type) => type.id)).toEqual([
      'matching-sentence-endings',
    ]);
  });

  it('is the target of every normalised upstream label', () => {
    for (const mapping of Object.values(practiceStats().rawLabels)) {
      expect(QUESTION_TYPE_IDS).toContain(mapping.canonical);
    }
  });
});

describe('questionTypesWithFrequency', () => {
  it('orders the taxonomy by observed frequency', () => {
    const types = questionTypesWithFrequency();
    expect(types).toHaveLength(13);
    for (let index = 1; index < types.length; index += 1) {
      expect(types[index - 1]!.observed.questions).toBeGreaterThanOrEqual(types[index]!.observed.questions);
    }
    const total = types.reduce((sum, type) => sum + type.observed.questions, 0);
    expect(total).toBe(practiceStats().questions);
    const shares = types.reduce((sum, type) => sum + type.observed.share, 0);
    expect(shares).toBeCloseTo(1, 2);
  });

  it('lists the upstream labels that map onto each type', () => {
    const summary = questionTypesWithFrequency().find((type) => type.id === 'summary-completion');
    expect(summary?.observed.rawLabels).toContain('fill_in_blank');
    expect(summary?.observed.rawLabels[0]).toBe('fill_in_blank');
    expect(summary?.observed.bySkill['listening']).toBeGreaterThan(0);
  });

  it('restricts counts to one skill on request', () => {
    const listening = questionTypesWithFrequency('listening');
    expect(listening.every((type) => type.skills.includes('listening'))).toBe(true);
    expect(listening.some((type) => type.id === 'yes-no-not-given')).toBe(false);
    const reading = questionTypesWithFrequency('reading');
    const headings = reading.find((type) => type.id === 'matching-headings');
    expect(headings?.observed.questions).toBe(
      practiceStats().questionTypesBySkill['reading']!['matching-headings'],
    );
    const listeningHeadings = questionTypesWithFrequency('listening').find(
      (type) => type.id === 'matching-features',
    );
    expect(listeningHeadings?.observed.questions).toBe(
      practiceStats().questionTypesBySkill['listening']!['matching-features'],
    );
  });
});

describe('findQuestionType', () => {
  it('finds a type case-insensitively', () => {
    expect(findQuestionType('  Matching-Headings ')?.name).toBe('Matching headings');
  });

  it('returns undefined for an unknown identifier', () => {
    expect(findQuestionType('gap-fill')).toBeUndefined();
  });
});
