import { describe, expect, it } from 'vitest';
import { NotFoundError } from '../../src/lib/errors.js';
import {
  buildMockTest,
  getQuestion,
  listQuestions,
  randomQuestion
} from '../../src/services/questions.service.js';

describe('listQuestions', () => {
  it('returns everything without filters', () => {
    expect(listQuestions({})).toHaveLength(64);
  });

  it('filters by skill', () => {
    const writing = listQuestions({ skill: 'writing' });
    expect(writing.every((q) => q.skill === 'writing')).toBe(true);
    const speaking = listQuestions({ skill: 'speaking' });
    expect(speaking.every((q) => q.skill === 'speaking')).toBe(true);
  });

  it('filters by part', () => {
    const part2 = listQuestions({ part: 2 });
    expect(part2.length).toBeGreaterThan(0);
    expect(part2.every((q) => q.part === 2)).toBe(true);
  });

  it('filters by case-insensitive topic substring', () => {
    const topics = listQuestions({ topic: 'EDUCATION' });
    expect(topics.length).toBeGreaterThan(0);
    expect(topics.every((q) => q.topic.toLowerCase().includes('education'))).toBe(true);
  });

  it('combines filters and can produce an empty result', () => {
    const none = listQuestions({ skill: 'speaking', part: 1, topic: 'astronomy' });
    expect(none).toEqual([]);
  });
});

describe('getQuestion', () => {
  it('finds questions by id', () => {
    expect(getQuestion('sp2-person-you-admire').part).toBe(2);
  });

  it('throws NotFoundError for unknown ids', () => {
    expect(() => getQuestion('missing-id')).toThrow(NotFoundError);
  });
});

describe('randomQuestion', () => {
  it('is deterministic with a seed', () => {
    const a = randomQuestion({ skill: 'writing' }, 'q-seed');
    const b = randomQuestion({ skill: 'writing' }, 'q-seed');
    expect(a.id).toBe(b.id);
  });

  it('throws NotFoundError when the filtered pool is empty', () => {
    expect(() => randomQuestion({ skill: 'speaking', part: 1, topic: 'astronomy' }, 's')).toThrow(
      NotFoundError
    );
  });

  it('works without a seed', () => {
    expect(randomQuestion({})).toBeDefined();
  });
});

describe('buildMockTest', () => {
  it('assembles a complete test with seeded determinism', () => {
    const a = buildMockTest('exam-day');
    const b = buildMockTest('exam-day');
    expect(a).toEqual(b);
    expect(a.speaking.part1.questions.length).toBeGreaterThanOrEqual(4);
    expect(a.speaking.part2.task).toContain('Describe');
    expect(a.speaking.part3.questions.length).toBeGreaterThanOrEqual(4);
    expect(a.writing.task1.variant).toBe('academic');
    expect(a.writing.task2.minWords).toBe(250);
    expect(a.seed).toBe('exam-day');
    expect(a.timing.listeningMinutes).toBe(30);
    expect(a.instructions).toHaveLength(5);
  });

  it('uses a null seed when none is given', () => {
    expect(buildMockTest().seed).toBeNull();
  });

  it('produces different tests for different seeds', () => {
    const a = buildMockTest('seed-one');
    const b = buildMockTest('seed-two');
    const aSignature = [
      a.speaking.part1.topic,
      a.speaking.part2.id,
      a.writing.task1.id,
      a.writing.task2.id
    ].join('|');
    const bSignature = [
      b.speaking.part1.topic,
      b.speaking.part2.id,
      b.writing.task1.id,
      b.writing.task2.id
    ].join('|');
    expect(aSignature).not.toBe(bSignature);
  });
});
