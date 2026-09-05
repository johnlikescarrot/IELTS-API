import { describe, expect, it } from 'vitest';

import {
  BLUEPRINT_SKILLS,
  CEFR_LADDER,
  QUESTION_TYPES,
  QUESTION_TYPE_SKILLS,
  RAW_SCORE_TABLES,
  RAW_SCORE_TABLE_IDS,
  SKILL_BLUEPRINTS,
  STUDY_CYCLE_STEPS,
  STUDY_PHASES,
  findQuestionType,
  findQuestionTypes,
  findRawScoreTable,
  findSkillBlueprint,
} from '../../src/data/skills.js';

describe('SKILL_BLUEPRINTS', () => {
  it('covers the four skills in test-report order', () => {
    expect(SKILL_BLUEPRINTS.map((blueprint) => blueprint.skill)).toEqual([
      'listening',
      'reading',
      'writing',
      'speaking',
    ]);
    expect(BLUEPRINT_SKILLS).toEqual(['listening', 'reading', 'writing', 'speaking']);
  });

  it('has sections whose questions sum to the paper total', () => {
    for (const blueprint of SKILL_BLUEPRINTS) {
      const questions = blueprint.sections.reduce((sum, section) => sum + section.questions, 0);
      expect(questions).toBe(blueprint.totalQuestions);
      expect(blueprint.sections.length).toBeGreaterThan(0);
      expect(blueprint.notes.length).toBeGreaterThan(0);
    }
  });

  it('finds a blueprint by skill and misses unknown skills', () => {
    expect(findSkillBlueprint('listening')?.totalQuestions).toBe(40);
    expect(findSkillBlueprint('reading')?.totalMinutes).toBe(60);
    expect(findSkillBlueprint('dancing')).toBeUndefined();
  });
});

describe('QUESTION_TYPES', () => {
  it('covers eleven reading and eight listening families', () => {
    expect(QUESTION_TYPES).toHaveLength(19);
    expect(QUESTION_TYPES.filter((family) => family.skill === 'reading')).toHaveLength(11);
    expect(QUESTION_TYPES.filter((family) => family.skill === 'listening')).toHaveLength(8);
    expect(QUESTION_TYPE_SKILLS).toEqual(['listening', 'reading']);
  });

  it('gives every family a unique id, a three-step approach and two traps', () => {
    const ids = new Set(QUESTION_TYPES.map((family) => family.id));
    expect(ids.size).toBe(QUESTION_TYPES.length);
    for (const family of QUESTION_TYPES) {
      expect(family.name.length).toBeGreaterThan(0);
      expect(family.description.length).toBeGreaterThan(0);
      expect(family.approach).toHaveLength(3);
      expect(family.traps).toHaveLength(2);
      expect(family.timingTip.length).toBeGreaterThan(0);
    }
  });

  it('filters by skill and finds families by id', () => {
    expect(findQuestionTypes(undefined)).toHaveLength(19);
    expect(findQuestionTypes('reading')).toHaveLength(11);
    expect(findQuestionTypes('listening')).toHaveLength(8);
    expect(findQuestionTypes('writing')).toHaveLength(0);
    expect(findQuestionType('reading-matching-headings')?.name).toBe('Matching headings');
    expect(findQuestionType('no-such-family')).toBeUndefined();
  });
});

describe('RAW_SCORE_TABLES', () => {
  it('covers the three machine-marked papers', () => {
    expect(RAW_SCORE_TABLE_IDS).toEqual(['listening', 'reading-academic', 'reading-general']);
    expect(RAW_SCORE_TABLES.map((table) => table.id)).toEqual([...RAW_SCORE_TABLE_IDS]);
  });

  it('uses ordered, non-overlapping intervals inside 0-40', () => {
    for (const table of RAW_SCORE_TABLES) {
      expect(table.questions).toBe(40);
      expect(table.provenance).toBe('indicative');
      expect(table.note.length).toBeGreaterThan(0);
      let previousMax = 41;
      for (const row of table.rows) {
        expect(row.min).toBeLessThanOrEqual(row.max);
        expect(row.max).toBeLessThan(previousMax);
        previousMax = row.min;
      }
    }
  });

  it('finds tables by id and misses unknown ids', () => {
    expect(findRawScoreTable('listening')?.rows[0]).toEqual({ min: 39, max: 40, band: 9 });
    expect(findRawScoreTable('no-such-table')).toBeUndefined();
  });
});

describe('study system catalogue', () => {
  it('publishes a six-step cycle, four phases and a six-level CEFR ladder', () => {
    expect(STUDY_CYCLE_STEPS).toHaveLength(6);
    expect(STUDY_PHASES.map((phase) => phase.id)).toEqual([
      'foundation',
      'skill-building',
      'test-readiness',
      'polish',
    ]);
    const share = STUDY_PHASES.reduce((sum, phase) => sum + phase.share, 0);
    expect(share).toBeCloseTo(1, 10);
    for (const phase of STUDY_PHASES) {
      expect(phase.focus.length).toBeGreaterThan(0);
      expect(phase.exit.length).toBeGreaterThan(0);
    }
    expect(CEFR_LADDER.map((row) => row.level)).toEqual(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
  });
});
