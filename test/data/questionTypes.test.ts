import { describe, expect, it } from 'vitest';

import {
  QUESTION_TYPES,
  QUESTION_TYPE_FAMILIES,
  QUESTION_TYPE_IDS,
  findQuestionType,
  questionTypesWithFrequency,
  resolveQuestionTypeLabel,
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
    }
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

describe('resolveQuestionTypeLabel', () => {
  it('resolves canonical ids, display names and punctuation variants', () => {
    expect(resolveQuestionTypeLabel('Matching-Headings')).toMatchObject({
      type: { id: 'matching-headings' },
      matchedBy: 'canonical-id',
    });
    expect(resolveQuestionTypeLabel('matching headings')).toMatchObject({
      type: { id: 'matching-headings' },
      matchedBy: 'name',
    });
    expect(resolveQuestionTypeLabel(' TRUE_FALSE_NOT_GIVEN ')).toMatchObject({
      type: { id: 'true-false-not-given' },
      matchedBy: 'upstream-label',
      matchedLabel: 'true_false_not_given',
    });
  });

  it('returns undefined when no known label is equivalent', () => {
    expect(resolveQuestionTypeLabel('mystery exercise')).toBeUndefined();
  });
});
