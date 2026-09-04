import { describe, expect, it } from 'vitest';

import { TASK_MODULES, TASK_TYPES, findTaskTypes } from '../../src/data/tasks.js';

describe('TASK_TYPES', () => {
  it('covers both modules', () => {
    expect(TASK_MODULES).toEqual(['academic', 'general-training']);
    expect(TASK_TYPES.some((task) => task.module === 'academic')).toBe(true);
    expect(TASK_TYPES.some((task) => task.module === 'general-training')).toBe(true);
  });

  it('describes every task family fully', () => {
    for (const task of TASK_TYPES) {
      expect(task.id.length).toBeGreaterThan(0);
      expect(task.name.length).toBeGreaterThan(0);
      expect(task.description.length).toBeGreaterThan(20);
      expect(task.structure.length).toBeGreaterThanOrEqual(4);
      expect(task.tips.length).toBeGreaterThanOrEqual(2);
      expect(task.suggestedMinutes).toBe(20);
    }
  });

  it('uses unique identifiers', () => {
    expect(new Set(TASK_TYPES.map((task) => task.id)).size).toBe(TASK_TYPES.length);
  });
});

describe('findTaskTypes', () => {
  it('returns everything without a filter', () => {
    expect(findTaskTypes()).toHaveLength(TASK_TYPES.length);
  });

  it('filters by module', () => {
    const academic = findTaskTypes('academic');
    expect(academic.length).toBeGreaterThan(0);
    expect(academic.every((task) => task.module === 'academic')).toBe(true);
    const general = findTaskTypes('general-training');
    expect(general.every((task) => task.module === 'general-training')).toBe(true);
    expect(academic.length + general.length).toBe(TASK_TYPES.length);
  });
});
