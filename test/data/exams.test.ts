import { describe, expect, it } from 'vitest';

import {
  COMPUTER_BASED_NOTE,
  EXAM_MODULE_IDS,
  EXAM_MODULES,
  EXAM_PAPERS,
  LISTENING_SECTIONS,
  MAX_SEED_LENGTH,
  SPEAKING_PARTS,
  SPEAKING_SCHEDULE_NOTE,
  WRITING_WEIGHTING,
  WRITTEN_SCHEDULE,
  WRITTEN_TOTAL_MINUTES,
  canonicalSeed,
  decodePaperId,
  paperId,
} from '../../src/data/exams.js';

describe('EXAM_MODULES', () => {
  it('publishes the two IELTS modules in a stable order', () => {
    expect(EXAM_MODULE_IDS).toEqual(['academic', 'general-training']);
    expect(EXAM_MODULES.map((module) => module.id)).toEqual(EXAM_MODULE_IDS);
  });

  it('describes how each module differs', () => {
    for (const module of EXAM_MODULES) {
      expect(module.name.length).toBeGreaterThan(0);
      expect(module.reading.length).toBeGreaterThan(20);
      expect(module.writingTask1.length).toBeGreaterThan(20);
    }
  });
});

describe('EXAM_PAPERS', () => {
  it('publishes the four papers in the order they are sat', () => {
    expect(EXAM_PAPERS.map((paper) => paper.skill)).toEqual(['listening', 'reading', 'writing', 'speaking']);
  });

  it('fixes the question counts and timings the format defines', () => {
    expect(EXAM_PAPERS.map((paper) => paper.questions)).toEqual([40, 40, null, null]);
    expect(EXAM_PAPERS.map((paper) => paper.minutes)).toEqual([40, 60, 60, null]);
    expect(EXAM_PAPERS.map((paper) => paper.parts)).toEqual([4, 3, 2, 3]);
    for (const paper of EXAM_PAPERS) {
      expect(paper.description.length).toBeGreaterThan(20);
    }
  });
});

describe('LISTENING_SECTIONS', () => {
  it('alternates conversation and monologue across four sections of ten questions', () => {
    expect(LISTENING_SECTIONS).toHaveLength(4);
    expect(LISTENING_SECTIONS.map((section) => section.section)).toEqual([1, 2, 3, 4]);
    expect(LISTENING_SECTIONS.map((section) => section.format)).toEqual([
      'conversation',
      'monologue',
      'conversation',
      'monologue',
    ]);
    expect(LISTENING_SECTIONS.reduce((sum, section) => sum + section.questions, 0)).toBe(40);
    for (const section of LISTENING_SECTIONS) {
      expect(section.context.length).toBeGreaterThan(20);
    }
  });
});

describe('SPEAKING_PARTS', () => {
  it('publishes three parts inside the 11-14 minute envelope', () => {
    expect(SPEAKING_PARTS.map((part) => part.part)).toEqual([1, 2, 3]);
    const minutes = SPEAKING_PARTS.map((part) => part.minutes.split('-').map(Number));
    const shortest = minutes.reduce((sum, bounds) => sum + (bounds[0] ?? 0), 0);
    const longest = minutes.reduce((sum, bounds) => sum + (bounds[1] ?? 0), 0);
    expect(shortest).toBe(11);
    expect(longest).toBe(14);
    for (const part of SPEAKING_PARTS) {
      expect(part.name.length).toBeGreaterThan(0);
      expect(part.description.length).toBeGreaterThan(20);
    }
  });
});

describe('the written schedule', () => {
  it('runs the three papers without gaps or breaks', () => {
    let clock = 0;
    for (const row of WRITTEN_SCHEDULE) {
      expect(row.at).toBe(clock);
      expect(row.event.length).toBeGreaterThan(20);
      clock += row.minutes;
    }
    expect(clock).toBe(WRITTEN_TOTAL_MINUTES);
    expect(WRITING_WEIGHTING.length).toBeGreaterThan(10);
    expect(COMPUTER_BASED_NOTE.length).toBeGreaterThan(10);
    expect(SPEAKING_SCHEDULE_NOTE.length).toBeGreaterThan(10);
  });
});

describe('seed canonicalisation', () => {
  it('reduces any seed string to eight lowercase hexadecimal digits', () => {
    expect(canonicalSeed('demo')).toMatch(/^[0-9a-f]{8}$/);
    expect(canonicalSeed('a very long seed string with spaces and punctuation!')).toMatch(/^[0-9a-f]{8}$/);
    expect(canonicalSeed('')).toMatch(/^[0-9a-f]{8}$/);
  });

  it('is deterministic and discriminative', () => {
    expect(canonicalSeed('demo')).toBe(canonicalSeed('demo'));
    expect(canonicalSeed('demo')).not.toBe(canonicalSeed('demo2'));
  });

  it('caps caller-supplied seeds at a published length', () => {
    expect(MAX_SEED_LENGTH).toBe(64);
  });
});

describe('paper identifiers', () => {
  it('round-trips a paper id through decode', () => {
    for (const module of EXAM_MODULE_IDS) {
      const seed = canonicalSeed(`seed-for-${module}`);
      const id = paperId(module, seed);
      expect(id).toBe(`mock-${module}-${seed}`);
      expect(decodePaperId(id)).toEqual({ module, seed });
    }
  });

  it('rejects malformed identifiers', () => {
    expect(decodePaperId('nonsense')).toBeUndefined();
    expect(decodePaperId('mock-academic')).toBeUndefined();
    expect(decodePaperId('mock-academic-abc')).toBeUndefined();
    expect(decodePaperId('mock-academic-abcdefzz')).toBeUndefined();
    expect(decodePaperId('mock-academic-3fa2c81dd')).toBeUndefined();
    expect(decodePaperId('mock-bogus-3fa2c81d')).toBeUndefined();
    expect(decodePaperId('mock-Academic-3fa2c81d')).toBeUndefined();
    expect(decodePaperId('')).toBeUndefined();
  });
});
