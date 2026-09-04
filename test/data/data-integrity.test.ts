import { describe, expect, it } from 'vitest';
import { AWL_ENTRIES, SUBLIST_COUNT, getSublistWords } from '../../src/data/academic-word-list.js';
import { BAND_OVERVIEWS } from '../../src/data/bands.js';
import { MISTAKES } from '../../src/data/mistakes.js';
import { QUESTIONS } from '../../src/data/questions.js';
import { TOPIC_VOCAB } from '../../src/data/vocabulary.js';
import { MODULE_RANGES } from '../../src/data/score-conversion.js';

describe('Academic Word List integrity', () => {
  it('contains exactly 570 unique word families', () => {
    expect(AWL_ENTRIES).toHaveLength(570);
    expect(new Set(AWL_ENTRIES.map((entry) => entry.word)).size).toBe(570);
  });

  it('has 10 sublists with the canonical sizes (9 x 60 + 30)', () => {
    expect(SUBLIST_COUNT).toBe(10);
    const sizes = Array.from({ length: 10 }, (_, i) => getSublistWords(i + 1).length);
    expect(sizes).toEqual([60, 60, 60, 60, 60, 60, 60, 60, 60, 30]);
  });

  it('returns no words for out-of-range sublists', () => {
    expect(getSublistWords(0)).toEqual([]);
    expect(getSublistWords(11)).toEqual([]);
    expect(getSublistWords(-3)).toEqual([]);
  });

  it('keeps sublist numbers within 1..10', () => {
    expect(AWL_ENTRIES.every((entry) => entry.sublist >= 1 && entry.sublist <= 10)).toBe(true);
  });
});

describe('Question bank integrity', () => {
  it('has unique question ids', () => {
    expect(new Set(QUESTIONS.map((question) => question.id)).size).toBe(QUESTIONS.length);
  });

  it('provides speaking questions with the expected shape', () => {
    const speaking = QUESTIONS.filter((question) => question.skill === 'speaking');
    expect(speaking.length).toBeGreaterThan(25);
    for (const question of speaking) {
      expect([1, 2, 3]).toContain(question.part);
      if (question.part === 2) {
        expect(question.task).toContain('Describe');
        expect(question.prompts.length).toBeGreaterThanOrEqual(3);
      } else {
        expect(question.questions.length).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it('provides writing questions with prompts and word limits', () => {
    const writing = QUESTIONS.filter((question) => question.skill === 'writing');
    expect(writing.length).toBeGreaterThan(25);
    for (const question of writing) {
      expect(question.prompt.length).toBeGreaterThan(40);
      if (question.part === 1) {
        expect(question.minWords).toBe(150);
        expect(question.suggestedMinutes).toBe(20);
      } else {
        expect(question.minWords).toBe(250);
        expect(question.suggestedMinutes).toBe(40);
      }
    }
  });

  it('includes both academic and general-training Task 1 variants', () => {
    const task1 = QUESTIONS.filter(
      (question) => question.skill === 'writing' && question.part === 1
    );
    expect(task1.some((question) => question.variant === 'academic')).toBe(true);
    expect(task1.some((question) => question.variant === 'general-training')).toBe(true);
  });
});

describe('Topic vocabulary integrity', () => {
  it('has twelve unique packs of eight entries each', () => {
    expect(TOPIC_VOCAB).toHaveLength(12);
    expect(new Set(TOPIC_VOCAB.map((pack) => pack.id)).size).toBe(12);
    for (const pack of TOPIC_VOCAB) {
      expect(pack.words).toHaveLength(8);
      for (const entry of pack.words) {
        expect(entry.term.length).toBeGreaterThan(0);
        expect(entry.meaning.length).toBeGreaterThan(0);
        expect(entry.example.length).toBeGreaterThan(0);
        expect(entry.collocations.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('Mistakes integrity', () => {
  it('has twenty unique entries where wrong differs from correct', () => {
    expect(MISTAKES).toHaveLength(20);
    expect(new Set(MISTAKES.map((mistake) => mistake.id)).size).toBe(20);
    for (const mistake of MISTAKES) {
      expect(mistake.wrong).not.toBe(mistake.correct);
      expect(mistake.explanation.length).toBeGreaterThan(20);
      expect(mistake.impacts.length).toBeGreaterThan(0);
    }
  });
});

describe('Band data integrity', () => {
  it('covers bands 1-9 exactly once each', () => {
    expect(BAND_OVERVIEWS.map((overview) => overview.band)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (const overview of BAND_OVERVIEWS) {
      expect(overview.name.length).toBeGreaterThan(0);
      expect(overview.description.length).toBeGreaterThan(0);
    }
  });
});

describe('Score conversion integrity', () => {
  it('covers raw scores 0..40 exactly once for every module', () => {
    for (const ranges of Object.values(MODULE_RANGES)) {
      const covered: number[] = [];
      for (const range of ranges) {
        for (let raw = range.min; raw <= range.max; raw++) {
          covered.push(raw);
        }
      }
      covered.sort((a, b) => a - b);
      expect(covered).toEqual(Array.from({ length: 41 }, (_, i) => i));
    }
  });

  it('orders bands from high raw scores to low', () => {
    for (const ranges of Object.values(MODULE_RANGES)) {
      for (let i = 1; i < ranges.length; i++) {
        expect(ranges[i]?.band).toBeLessThan(ranges[i - 1]?.band as number);
      }
    }
  });
});
