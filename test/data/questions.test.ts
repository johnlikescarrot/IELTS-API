import { describe, expect, it } from 'vitest';

import {
  ANSWER_FORMATS,
  QUESTION_SKILLS,
  QUESTION_TYPES,
  findQuestionType,
  questionTypeCounts,
} from '../../src/data/questions.js';

describe('question-type taxonomy', () => {
  it('publishes the six Listening and eleven Reading types', () => {
    expect(questionTypeCounts()).toEqual({ listening: 6, reading: 11 });
    expect(QUESTION_TYPES).toHaveLength(17);
    expect(QUESTION_SKILLS).toEqual(['listening', 'reading']);
  });

  it('gives every type a unique identifier prefixed by its skill', () => {
    const ids = QUESTION_TYPES.map((type) => type.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const type of QUESTION_TYPES) {
      expect(type.id.startsWith(type.skill)).toBe(true);
    }
  });

  it('documents the construct, strategy and pitfalls of every type', () => {
    for (const type of QUESTION_TYPES) {
      expect(type.name.length).toBeGreaterThan(3);
      expect(type.description.length).toBeGreaterThan(20);
      expect(type.tests.length).toBeGreaterThan(20);
      expect(type.strategy.length).toBeGreaterThan(0);
      expect(type.pitfalls.length).toBeGreaterThan(0);
      expect(ANSWER_FORMATS).toContain(type.answerFormat);
      expect(type.appearsIn.length).toBeGreaterThan(0);
    }
  });

  it('keeps the True/False and Yes/No types distinct', () => {
    expect(findQuestionType('reading-identifying-information')?.answerFormat).toBe('true-false-not-given');
    expect(findQuestionType('reading-identifying-views-claims')?.answerFormat).toBe('yes-no-not-given');
  });

  it('marks the unordered Reading types', () => {
    const unordered = QUESTION_TYPES.filter((type) => !type.ordered).map((type) => type.id);
    expect(unordered).toContain('reading-matching-information');
    expect(unordered).toContain('reading-matching-features');
    expect(unordered).toContain('reading-diagram-label-completion');
  });

  it('constrains Listening parts to 1-4 and Reading passages to 1-3', () => {
    for (const type of QUESTION_TYPES) {
      const maximum = type.skill === 'listening' ? 4 : 3;
      for (const part of type.appearsIn) {
        expect(part).toBeGreaterThanOrEqual(1);
        expect(part).toBeLessThanOrEqual(maximum);
      }
    }
  });
});

describe('findQuestionType', () => {
  it('looks a type up case-insensitively', () => {
    expect(findQuestionType('READING-MATCHING-HEADINGS')?.name).toBe('Matching headings');
  });

  it('returns undefined for an unknown identifier', () => {
    expect(findQuestionType('reading-telepathy')).toBeUndefined();
  });
});
