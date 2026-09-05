import { describe, expect, it } from 'vitest';

import {
  LISTENING_MINUTES,
  LISTENING_QUESTION_COUNT,
  LISTENING_SECTIONS,
  LISTENING_TRANSFER_MINUTES,
  PRACTICE_SKILLS,
  PRACTICE_TYPES,
  READING_MINUTES,
  STUDY_LEVELS,
  STUDY_PLANS,
  findPracticeTypes,
  findStudyPlans,
} from '../../src/data/practice.js';

describe('PRACTICE_TYPES', () => {
  it('covers both receptive skills', () => {
    expect(PRACTICE_SKILLS).toEqual(['listening', 'reading']);
    expect(PRACTICE_TYPES.some((type) => type.skill === 'listening')).toBe(true);
    expect(PRACTICE_TYPES.some((type) => type.skill === 'reading')).toBe(true);
  });

  it('covers the eight listening and eleven reading families', () => {
    expect(PRACTICE_TYPES.filter((type) => type.skill === 'listening')).toHaveLength(8);
    expect(PRACTICE_TYPES.filter((type) => type.skill === 'reading')).toHaveLength(11);
  });

  it('describes every question family fully', () => {
    for (const type of PRACTICE_TYPES) {
      expect(type.id.length).toBeGreaterThan(0);
      expect(type.name.length).toBeGreaterThan(0);
      expect(type.description.length).toBeGreaterThan(20);
      expect(type.skillsAssessed.length).toBeGreaterThanOrEqual(3);
      expect(type.strategy.length).toBeGreaterThanOrEqual(3);
      expect(type.pitfalls.length).toBeGreaterThanOrEqual(2);
      expect(type.timingNote.length).toBeGreaterThan(20);
    }
  });

  it('uses unique identifiers', () => {
    expect(new Set(PRACTICE_TYPES.map((type) => type.id)).size).toBe(PRACTICE_TYPES.length);
  });
});

describe('LISTENING_SECTIONS', () => {
  it('covers the four sections in order with the public timing model', () => {
    expect(LISTENING_SECTIONS.map((section) => section.section)).toEqual([1, 2, 3, 4]);
    expect(LISTENING_QUESTION_COUNT).toBe(40);
    expect(LISTENING_MINUTES).toBe(30);
    expect(LISTENING_TRANSFER_MINUTES).toBe(10);
    expect(READING_MINUTES).toBe(60);
  });

  it('partitions all forty questions without gaps or overlaps', () => {
    const covered = LISTENING_SECTIONS.flatMap((section) => {
      const [first, last] = section.questionRange;
      return Array.from({ length: last - first + 1 }, (_, index) => first + index);
    });
    expect(covered).toHaveLength(LISTENING_QUESTION_COUNT);
    expect(new Set(covered).size).toBe(LISTENING_QUESTION_COUNT);
    expect(Math.min(...covered)).toBe(1);
    expect(Math.max(...covered)).toBe(LISTENING_QUESTION_COUNT);
  });

  it('describes every section fully', () => {
    for (const section of LISTENING_SECTIONS) {
      expect(section.setting.length).toBeGreaterThan(0);
      expect(section.voices.length).toBeGreaterThan(0);
      expect(section.description.length).toBeGreaterThan(20);
    }
  });
});

describe('STUDY_PLANS', () => {
  it('covers the six CEFR levels in order', () => {
    expect(STUDY_LEVELS).toEqual(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
    expect(STUDY_PLANS.map((plan) => plan.level)).toEqual(STUDY_LEVELS);
  });

  it('plans every level fully', () => {
    for (const plan of STUDY_PLANS) {
      expect(plan.label.length).toBeGreaterThan(0);
      expect(plan.readingFocus.length).toBeGreaterThan(20);
      expect(plan.listeningFocus.length).toBeGreaterThan(20);
      expect(plan.weeklyPassages[0]).toBeGreaterThan(0);
      expect(plan.weeklyPassages[1]).toBeGreaterThanOrEqual(plan.weeklyPassages[0]);
      expect(plan.sessionRoutine.length).toBeGreaterThanOrEqual(6);
      expect(plan.exitSignal.length).toBeGreaterThan(20);
    }
  });
});

describe('findPracticeTypes', () => {
  it('returns everything without a filter', () => {
    expect(findPracticeTypes()).toHaveLength(PRACTICE_TYPES.length);
  });

  it('filters by skill', () => {
    const listening = findPracticeTypes('listening');
    expect(listening.length).toBeGreaterThan(0);
    expect(listening.every((type) => type.skill === 'listening')).toBe(true);
    const reading = findPracticeTypes('reading');
    expect(reading.every((type) => type.skill === 'reading')).toBe(true);
    expect(listening.length + reading.length).toBe(PRACTICE_TYPES.length);
  });
});

describe('findStudyPlans', () => {
  it('returns everything without a filter', () => {
    expect(findStudyPlans()).toHaveLength(STUDY_PLANS.length);
  });

  it('filters by level', () => {
    for (const level of STUDY_LEVELS) {
      const plans = findStudyPlans(level);
      expect(plans).toHaveLength(1);
      expect(plans[0]?.level).toBe(level);
    }
  });
});
