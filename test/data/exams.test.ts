import { describe, expect, it } from 'vitest';

import {
  EXAM_MODULES,
  EXAM_PAPER_IDS,
  EXAM_PAPERS,
  EXAM_SKILLS,
  findExamPaper,
} from '../../src/data/exams.js';
import { RAW_SCORE_TABLE_IDS } from '../../src/data/rawScores.js';

describe('the exam-format reference', () => {
  it('covers six papers: two shared and two per module', () => {
    expect(EXAM_PAPER_IDS).toEqual([
      'listening',
      'academic-reading',
      'general-reading',
      'academic-writing',
      'general-writing',
      'speaking',
    ]);
    expect(new Set(EXAM_PAPER_IDS).size).toBe(6);
    expect(EXAM_SKILLS).toEqual(['listening', 'reading', 'writing', 'speaking']);
    expect(EXAM_MODULES).toEqual(['both', 'academic', 'general-training']);
  });

  it('documents every paper usefully', () => {
    for (const paper of EXAM_PAPERS) {
      expect(paper.name.length).toBeGreaterThan(3);
      expect(paper.summary.endsWith('.')).toBe(true);
      expect(paper.marking.endsWith('.')).toBe(true);
      expect(paper.durationMinutes).toBeGreaterThan(0);
      expect(paper.sections.length).toBeGreaterThanOrEqual(2);
      for (const section of paper.sections) {
        expect(section.name.length).toBeGreaterThan(0);
        expect(section.detail.endsWith('.')).toBe(true);
      }
      expect(paper.relatedUrl.startsWith('/v1/')).toBe(true);
    }
  });

  it('counts questions for the receptive papers and words for the productive ones', () => {
    for (const paper of EXAM_PAPERS) {
      if (paper.skill === 'listening' || paper.skill === 'reading') {
        expect(paper.questions).toBe(40);
        expect(paper.wordMinimums).toBeNull();
      } else if (paper.skill === 'writing') {
        expect(paper.questions).toBeNull();
        expect(paper.wordMinimums).toEqual([150, 250]);
      } else {
        expect(paper.questions).toBeNull();
        expect(paper.wordMinimums).toBeNull();
      }
    }
  });

  it('cross-links the objectively marked papers to their raw-score tables', () => {
    for (const paper of EXAM_PAPERS) {
      if (paper.rawScoreTable === null) {
        expect(paper.skill === 'writing' || paper.skill === 'speaking').toBe(true);
      } else {
        expect(RAW_SCORE_TABLE_IDS).toContain(paper.rawScoreTable);
        expect(paper.rawScoreTable).toBe(paper.id);
      }
    }
  });

  it('gives transfer time only where the format allows it', () => {
    expect(findExamPaper('listening')?.transferMinutes).toBe(10);
    for (const paper of EXAM_PAPERS) {
      if (paper.id !== 'listening') {
        expect(paper.transferMinutes).toBeNull();
      }
    }
  });
});

describe('findExamPaper', () => {
  it('finds a paper case-insensitively', () => {
    expect(findExamPaper('  Academic-Writing ')?.skill).toBe('writing');
  });

  it('returns undefined for an unknown identifier', () => {
    expect(findExamPaper('general-listening')).toBeUndefined();
  });
});
