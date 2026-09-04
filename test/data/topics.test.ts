import { describe, expect, it } from 'vitest';

import {
  ESSAY_QUESTION_TYPES,
  SPEAKING_TOPICS,
  WRITING_CATEGORIES,
  WRITING_TOPICS,
} from '../../src/data/topics.js';

describe('WRITING_TOPICS', () => {
  it('holds a substantial, uniquely identified prompt bank', () => {
    expect(WRITING_TOPICS.length).toBeGreaterThanOrEqual(90);
    const ids = new Set(WRITING_TOPICS.map((topic) => topic.id));
    expect(ids.size).toBe(WRITING_TOPICS.length);
    expect(WRITING_TOPICS[0]?.id).toBe('wt2-001');
  });

  it('gives every prompt a category, a question type and two positions', () => {
    for (const topic of WRITING_TOPICS) {
      expect(WRITING_CATEGORIES).toContain(topic.category);
      expect(ESSAY_QUESTION_TYPES).toContain(topic.questionType);
      expect(topic.prompt.length).toBeGreaterThan(20);
      expect(topic.positions).toHaveLength(2);
      expect(topic.positions[0]).not.toBe(topic.positions[1]);
    }
  });

  it('covers every question type', () => {
    const used = new Set(WRITING_TOPICS.map((topic) => topic.questionType));
    expect([...used].sort()).toEqual([...ESSAY_QUESTION_TYPES].sort());
  });
});

describe('SPEAKING_TOPICS', () => {
  it('covers all three parts', () => {
    const parts = new Set(SPEAKING_TOPICS.map((topic) => topic.part));
    expect([...parts].sort()).toEqual([1, 2, 3]);
    expect(SPEAKING_TOPICS.filter((topic) => topic.part === 1)[0]?.id).toBe('sp1-001');
    expect(SPEAKING_TOPICS.filter((topic) => topic.part === 2)[0]?.id).toBe('sp2-001');
    expect(SPEAKING_TOPICS.filter((topic) => topic.part === 3)[0]?.id).toBe('sp3-001');
  });

  it('gives every item a topic and at least three questions', () => {
    for (const topic of SPEAKING_TOPICS) {
      expect(topic.topic.length).toBeGreaterThan(0);
      expect(topic.questions.length).toBeGreaterThanOrEqual(3);
      expect(new Set(topic.questions).size).toBe(topic.questions.length);
    }
  });

  it('starts every cue card with a describe instruction', () => {
    const cueCards = SPEAKING_TOPICS.filter((topic) => topic.part === 2);
    expect(cueCards.length).toBeGreaterThanOrEqual(24);
    for (const card of cueCards) {
      expect(card.questions[0]).toMatch(/^Describe /);
      expect(card.questions).toContain('You should say:');
    }
  });

  it('uses unique identifiers across parts', () => {
    const ids = new Set(SPEAKING_TOPICS.map((topic) => topic.id));
    expect(ids.size).toBe(SPEAKING_TOPICS.length);
  });
});

describe('WRITING_CATEGORIES', () => {
  it('is sorted and non-empty', () => {
    expect(WRITING_CATEGORIES.length).toBeGreaterThan(10);
    expect([...WRITING_CATEGORIES]).toEqual([...WRITING_CATEGORIES].sort());
  });
});
