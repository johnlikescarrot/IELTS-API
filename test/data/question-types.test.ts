import { describe, expect, it } from 'vitest';

import {
  QUESTION_RESPONSE_FORMATS,
  QUESTION_TYPE_SKILLS,
  QUESTION_TYPES,
  UPSTREAM_STRATEGY_FIELDS,
  findQuestionType,
  questionTypeStats,
} from '../../src/data/question-types.js';

describe('QUESTION_TYPES', () => {
  it('documents a substantial taxonomy', () => {
    expect(QUESTION_TYPES.length).toBeGreaterThanOrEqual(16);
    expect(new Set(QUESTION_TYPES.map((type) => type.id)).size).toBe(QUESTION_TYPES.length);
  });

  it('fills every field of every entry', () => {
    for (const type of QUESTION_TYPES) {
      expect(type.name.length).toBeGreaterThan(5);
      expect(type.skills.length).toBeGreaterThan(0);
      expect(type.skills.every((skill) => QUESTION_TYPE_SKILLS.includes(skill))).toBe(true);
      expect(QUESTION_RESPONSE_FORMATS).toContain(type.responseFormat);
      expect(type.answerRules.length).toBeGreaterThanOrEqual(2);
      expect(type.playbook.anticipate.length).toBeGreaterThanOrEqual(2);
      expect(type.playbook.during.length).toBeGreaterThanOrEqual(1);
      expect(type.playbook.check.length).toBeGreaterThanOrEqual(1);
      expect(type.distractorPatterns.length).toBeGreaterThanOrEqual(2);
      expect(type.pitfalls.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('assigns reading-only types exclusively to reading', () => {
    const readingOnly = QUESTION_TYPES.filter((type) => !type.skills.includes('listening'));
    expect(readingOnly.map((type) => type.id)).toContain('matching-headings');
    expect(readingOnly.every((type) => type.skills.includes('reading'))).toBe(true);
  });
});

describe('questionTypeStats', () => {
  it('matches the dataset', () => {
    const stats = questionTypeStats();
    expect(stats.types).toBe(QUESTION_TYPES.length);
    expect(stats.selection + stats.written).toBe(QUESTION_TYPES.length);
    expect(stats.listening).toBeGreaterThan(5);
    expect(stats.reading).toBeGreaterThan(10);
  });
});

describe('findQuestionType', () => {
  it('resolves ids', () => {
    expect(findQuestionType('true-false-notgiven')?.responseFormat).toBe('selection');
  });

  it('returns undefined for unknown ids', () => {
    expect(findQuestionType('listening-dictation')).toBeUndefined();
  });
});

describe('UPSTREAM_STRATEGY_FIELDS', () => {
  it('records the interop mapping', () => {
    expect(UPSTREAM_STRATEGY_FIELDS.scanTarget).toBe('scan_target');
    expect(UPSTREAM_STRATEGY_FIELDS.analysisLogic).toBe('analysis_logic');
    expect(UPSTREAM_STRATEGY_FIELDS.playbookPhaseTip).toBe('type_tip');
    expect(UPSTREAM_STRATEGY_FIELDS.note.length).toBeGreaterThan(20);
  });
});
