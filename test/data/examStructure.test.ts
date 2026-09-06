import { describe, expect, it } from 'vitest';

import {
  ALL_EXAM_PAPERS,
  EXAM_MODULES,
  EXAM_PAPERS,
  examStructure,
  findExamPaper,
  papersForModule,
  WRITTEN_MINUTES,
} from '../../src/data/examStructure.js';

describe('paper catalogue', () => {
  it('publishes six papers with unique identifiers', () => {
    expect(ALL_EXAM_PAPERS).toHaveLength(6);
    expect(new Set(EXAM_PAPERS).size).toBe(6);
  });

  it('gives every paper parts that agree with its question count', () => {
    for (const paper of ALL_EXAM_PAPERS) {
      expect(paper.parts.length).toBeGreaterThan(0);
      expect(paper.parts.map((part) => part.order)).toEqual(paper.parts.map((_part, index) => index + 1));
      if (paper.questions !== null) {
        const counted = paper.parts.reduce((sum, part) => sum + (part.questions ?? 0), 0);
        expect(counted).toBe(paper.questions);
      }
    }
  });

  it('weights every paper at a quarter of the overall band', () => {
    for (const paper of ALL_EXAM_PAPERS) {
      expect(paper.weightOfOverall).toBe(0.25);
      expect(paper.notes.length).toBeGreaterThan(0);
      expect(paper.transferNote.length).toBeGreaterThan(0);
    }
  });

  it('adds transfer time only to the paper-based Listening test', () => {
    for (const paper of ALL_EXAM_PAPERS) {
      expect(paper.transferMinutes).toBe(paper.id === 'listening' ? 10 : 0);
    }
  });

  it('marks the two receptive papers objectively and the two productive ones analytically', () => {
    for (const paper of ALL_EXAM_PAPERS) {
      const objective = paper.skill === 'listening' || paper.skill === 'reading';
      expect(paper.marking).toBe(objective ? 'objective' : 'analytic');
    }
  });
});

describe('papersForModule', () => {
  it.each(EXAM_MODULES)('returns four papers in sitting order for %s', (module) => {
    const papers = papersForModule(module);
    expect(papers).toHaveLength(4);
    expect(papers.map((paper) => paper.skill)).toEqual(['listening', 'reading', 'writing', 'speaking']);
    for (const paper of papers) {
      expect([module, 'both']).toContain(paper.module);
    }
  });

  it('picks the module-specific Reading and Writing papers', () => {
    expect(papersForModule('academic').map((paper) => paper.id)).toEqual([
      'listening',
      'academic-reading',
      'academic-writing',
      'speaking',
    ]);
    expect(papersForModule('general-training').map((paper) => paper.id)).toEqual([
      'listening',
      'general-reading',
      'general-writing',
      'speaking',
    ]);
  });
});

describe('findExamPaper', () => {
  it('looks a paper up by identifier', () => {
    expect(findExamPaper('speaking')?.name).toBe('Speaking');
  });

  it('ignores case and surrounding space', () => {
    expect(findExamPaper('  Academic-Reading ')?.id).toBe('academic-reading');
  });

  it('returns undefined for an unknown identifier', () => {
    expect(findExamPaper('writing')).toBeUndefined();
  });
});

describe('examStructure', () => {
  it('totals the written papers at 150 working minutes plus the transfer window', () => {
    const structure = examStructure('academic');
    expect(structure.writtenMinutes).toBe(WRITTEN_MINUTES);
    expect(structure.writtenMinutesWithTransfer).toBe(WRITTEN_MINUTES + 10);
    expect(structure.speakingMinutes).toBe(14);
  });

  it('counts 80 objectively marked questions plus the two writing tasks', () => {
    expect(examStructure('general-training').totalQuestions).toBe(82);
  });

  it('lists the sitting order by paper name', () => {
    expect(examStructure('general-training').sittingOrder).toEqual([
      'Listening',
      'General Training Reading',
      'General Training Writing',
      'Speaking',
    ]);
  });

  it('explains how the papers combine into an overall band', () => {
    expect(examStructure('academic').scoring).toContain('/v1/scores/raw');
    expect(examStructure('academic').module).toBe('academic');
  });
});
