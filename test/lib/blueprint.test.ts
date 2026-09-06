import { describe, expect, it } from 'vitest';

import { QUESTION_TYPES } from '../../src/data/questionTypes.js';
import {
  BLUEPRINT_DEFAULT_ITEMS,
  BLUEPRINT_DEFAULT_SEED,
  BLUEPRINT_SKILLS,
  buildBlueprint,
} from '../../src/lib/blueprint.js';

import type { QuestionTypeId } from '../../src/types.js';

/** Canonical types of one skill, in taxonomy order. */
function canonicalFor(skill: 'reading' | 'listening'): QuestionTypeId[] {
  return QUESTION_TYPES.filter((type) => type.skills.includes(skill)).map((type) => type.id);
}

describe('buildBlueprint', () => {
  it('is deterministic for identical inputs', () => {
    const options = { seed: 'paper-1', skill: 'reading' as const, focus: [], items: 3 };
    expect(buildBlueprint(options)).toEqual(buildBlueprint(options));
  });

  it('breaks rank ties by seed', () => {
    const deals = [0, 1, 2, 3, 4, 5].map(
      (round) =>
        buildBlueprint({ seed: `tie-${round}`, skill: 'reading', focus: ['matching-headings'], items: 3 })
          .papers.map((paper) => paper.id)
          .join(','),
    );
    expect(new Set(deals).size).toBeGreaterThan(1);
  });

  it('deals the requested number of papers', () => {
    expect(BLUEPRINT_DEFAULT_SEED).toBe('ielts-blueprint');
    expect(BLUEPRINT_DEFAULT_ITEMS).toBe(3);
    expect([...BLUEPRINT_SKILLS]).toEqual(['reading', 'listening']);
    const blueprint = buildBlueprint({ seed: 'size', skill: 'listening', focus: [], items: 2 });
    expect(blueprint.papers).toHaveLength(2);
    expect(blueprint.totalQuestions).toBe(
      blueprint.papers.reduce((sum, paper) => sum + paper.questions, 0),
    );
    expect(blueprint.totalMinutes).toBe(
      blueprint.papers.reduce((sum, paper) => sum + paper.suggestedMinutes, 0),
    );
  });

  it('ranks papers by focus density', () => {
    const blueprint = buildBlueprint({
      seed: 'focus',
      skill: 'reading',
      focus: ['matching-headings'],
      items: 5,
    });
    expect(blueprint.focus).toEqual(['matching-headings']);
    const densities = blueprint.papers.map((paper) => paper.focusQuestions);
    expect([...densities].sort((left, right) => right - left)).toEqual(densities);
    expect(densities[0]).toBeGreaterThan(0);
  });

  it('normalises the focus to the taxonomy order and the skill', () => {
    const blueprint = buildBlueprint({
      seed: 'normalise',
      skill: 'listening',
      focus: ['matching-headings', 'matching', 'summary-completion'],
      items: 2,
    });
    expect(blueprint.focus).toEqual(['matching', 'summary-completion']);
  });

  it('partitions the canonical types into covered and missing', () => {
    const blueprint = buildBlueprint({ seed: 'cover', skill: 'reading', focus: [], items: 3 });
    const canonical = canonicalFor('reading');
    expect([...blueprint.covered, ...blueprint.missing.map((gap) => gap.id)].sort()).toEqual(
      [...canonical].sort(),
    );
    for (const gap of blueprint.missing) {
      expect(gap.url).toBe(`/v1/question-types/${gap.id}`);
      expect(gap.name.length).toBeGreaterThan(0);
    }
    for (const paper of blueprint.papers) {
      expect(paper.url).toBe(`/v1/tests/${paper.id}`);
    }
  });

  it('profiles reading papers for readability and timing', () => {
    const blueprint = buildBlueprint({ seed: 'read', skill: 'reading', focus: [], items: 3 });
    for (const paper of blueprint.papers) {
      expect(typeof paper.readingEase).toBe('number');
      expect(typeof paper.fleschKincaidGrade).toBe('number');
      expect(paper.suggestedMinutes).toBeGreaterThanOrEqual(10);
    }
    expect(typeof blueprint.meanReadingEase).toBe('number');
    expect(blueprint.transferMinutes).toBeNull();
    expect(blueprint.scoringScale).toBe('academic-reading');
    expect(blueprint.scoringUrl).toBe('/v1/scores/raw-tables?scale=academic-reading');
  });

  it('adds transfer minutes to listening sittings', () => {
    const blueprint = buildBlueprint({ seed: 'listen', skill: 'listening', focus: [], items: 2 });
    for (const paper of blueprint.papers) {
      expect(paper.readingEase).toBeNull();
      expect(paper.fleschKincaidGrade).toBeNull();
    }
    expect(blueprint.meanReadingEase).toBeNull();
    expect(blueprint.transferMinutes).toBe(10);
    expect(blueprint.scoringScale).toBe('listening');
  });

  it('deals nothing when asked for zero papers', () => {
    const blueprint = buildBlueprint({ seed: 'none', skill: 'reading', focus: [], items: 0 });
    expect(blueprint.papers).toEqual([]);
    expect(blueprint.covered).toEqual([]);
    expect(blueprint.totalQuestions).toBe(0);
    expect(blueprint.totalMinutes).toBe(0);
    expect(blueprint.meanReadingEase).toBeNull();
    expect(blueprint.missing.map((gap) => gap.id).sort()).toEqual(
      [...canonicalFor('reading')].sort(),
    );
  });
});
