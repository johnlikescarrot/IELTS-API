import { describe, expect, it } from 'vitest';

import {
  FRAMEWORK_SECTIONS,
  RESPONSE_FRAMEWORKS,
  findFramework,
  searchFrameworks,
} from '../../src/data/frameworks.js';

import type { EssayQuestionType } from '../../src/types.js';

describe('the response framework taxonomy', () => {
  it('publishes twelve frameworks across three sections', () => {
    expect(RESPONSE_FRAMEWORKS).toHaveLength(12);
    expect(FRAMEWORK_SECTIONS).toEqual(['writing-task-2', 'speaking-part-2', 'speaking-part-3']);
    expect(new Set(RESPONSE_FRAMEWORKS.map((framework) => framework.id)).size).toBe(12);
    for (const section of FRAMEWORK_SECTIONS) {
      expect(RESPONSE_FRAMEWORKS.filter((framework) => framework.section === section).length).toBeGreaterThan(
        1,
      );
    }
  });

  it('describes every framework consistently', () => {
    const questionTypes: readonly EssayQuestionType[] = [
      'opinion',
      'discussion',
      'advantages-disadvantages',
      'problem-solution',
      'two-part',
    ];
    for (const framework of RESPONSE_FRAMEWORKS) {
      expect(framework.id).toMatch(/^[a-z0-9-]+$/);
      expect(FRAMEWORK_SECTIONS).toContain(framework.section);
      expect(framework.skill).toBe(framework.section.startsWith('w') ? 'writing' : 'speaking');
      expect(framework.name.length).toBeGreaterThan(3);
      expect(framework.summary.length).toBeGreaterThan(80);
      expect(framework.stages.length).toBeGreaterThanOrEqual(4);
      expect(framework.pitfalls.length).toBeGreaterThanOrEqual(3);
      expect(framework.questionTypes.every((type) => questionTypes.includes(type))).toBe(true);
      expect(framework.speakingParts.every((part) => [1, 2, 3].includes(part))).toBe(true);
      for (const stage of framework.stages) {
        expect(stage.position.length).toBeGreaterThan(0);
        expect(stage.purpose.length).toBeGreaterThan(10);
        expect(stage.moves.length).toBeGreaterThanOrEqual(1);
        expect(stage.language.length).toBeGreaterThanOrEqual(1);
      }
      if (framework.section === 'writing-task-2') {
        expect(framework.questionTypes.length).toBeGreaterThan(0);
        expect(framework.speakingParts).toHaveLength(0);
        expect(framework.suggestedMinutes).toBe(40);
        expect(framework.suggestedWords).toBe(250);
      } else {
        expect(framework.questionTypes).toHaveLength(0);
        expect(framework.speakingParts.length).toBeGreaterThan(0);
      }
    }
  });

  it('covers every essay question family at least once', () => {
    const covered = new Set(RESPONSE_FRAMEWORKS.flatMap((framework) => framework.questionTypes));
    expect([...covered].sort()).toEqual([
      'advantages-disadvantages',
      'discussion',
      'opinion',
      'problem-solution',
      'two-part',
    ]);
  });
});

describe('findFramework', () => {
  it('finds a framework by id', () => {
    expect(findFramework('w2-concession-rebuttal')?.name).toContain('Concession');
  });

  it('returns undefined for an unknown id', () => {
    expect(findFramework('w9-nonexistent')).toBeUndefined();
  });
});

describe('searchFrameworks', () => {
  const page = (overrides: Partial<Parameters<typeof searchFrameworks>[0]> = {}) =>
    searchFrameworks({ limit: 20, offset: 0, ...overrides });

  it('returns everything without a query', () => {
    const result = page();
    expect(result.items).toHaveLength(12);
    expect(result.total).toBe(12);
    expect(result.hasMore).toBe(false);
  });

  it('searches across names, stages and cue language', () => {
    expect(page({ query: 'rebuttal' }).total).toBe(1);
    expect(page({ query: 'cue card' }).total).toBeGreaterThan(0);
    expect(page({ query: 'really depends' }).total).toBe(1);
    expect(page({ query: 'zzzz' }).total).toBe(0);
  });

  it('paginates', () => {
    const result = page({ limit: 5, offset: 5 });
    expect(result.items).toHaveLength(5);
    expect(result.hasMore).toBe(true);
    expect(result.offset).toBe(5);
  });
});
