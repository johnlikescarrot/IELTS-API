import { describe, expect, it } from 'vitest';

import {
  MOVE_STRUCTURES,
  MOVE_STRUCTURE_IDS,
  findMoveStructure,
  findMoveStructuresByAppliesTo,
} from '../../src/data/moveStructures.js';

describe('move structures dataset', () => {
  it('defines the three canonical structures', () => {
    expect(MOVE_STRUCTURE_IDS).toEqual([
      'writing-task-1-static',
      'writing-task-1-dynamic',
      'writing-task-2-concession-rebuttal',
    ]);
  });

  it('gives every structure ordered, fully specified moves', () => {
    for (const structure of MOVE_STRUCTURES) {
      expect(structure.moves.length).toBeGreaterThanOrEqual(4);
      expect(structure.description.length).toBeGreaterThan(60);
      expect(structure.appliesTo.length).toBeGreaterThan(0);
      for (const move of structure.moves) {
        expect(move.label.length).toBeGreaterThan(0);
        expect(move.purpose.length).toBeGreaterThan(10);
        expect(move.guidance.length).toBeGreaterThan(0);
        for (const line of move.guidance) {
          expect(line.length).toBeGreaterThan(10);
        }
      }
    }
  });

  it('pairs dynamic charts and Task 2 essays with a lexical inventory', () => {
    const dynamic = findMoveStructure('writing-task-1-dynamic');
    expect(dynamic?.lexicon?.map((field) => field.category)).toEqual(
      expect.arrayContaining(['rise verbs', 'fall verbs', 'special values', 'degree adverbs']),
    );
    const rebuttal = findMoveStructure('writing-task-2-concession-rebuttal');
    expect(rebuttal?.lexicon?.map((field) => field.category)).toEqual(
      expect.arrayContaining(['concession markers', 'rebuttal markers']),
    );
    const staticStructure = findMoveStructure('writing-task-1-static');
    expect(staticStructure?.lexicon?.length).toBeGreaterThan(0);
  });

  it('finds structures by identifier and misses unknown ones', () => {
    expect(findMoveStructure('writing-task-1-static')?.name).toContain('Static chart');
    expect(findMoveStructure('nope')).toBeUndefined();
  });

  it('finds structures by the families they serve', () => {
    const trends = findMoveStructuresByAppliesTo('line graph');
    expect(trends.map((structure) => structure.id)).toEqual(['writing-task-1-dynamic']);
    const pie = findMoveStructuresByAppliesTo('pie chart');
    expect(pie.map((structure) => structure.id)).toEqual(['writing-task-1-static']);
    expect(findMoveStructuresByAppliesTo('agree/disagree')).toHaveLength(1);
    expect(findMoveStructuresByAppliesTo('xyzzy-nothing')).toHaveLength(0);
    // an empty needle matches every structure (the unfiltered listing)
    expect(findMoveStructuresByAppliesTo('')).toHaveLength(MOVE_STRUCTURES.length);
  });
});
