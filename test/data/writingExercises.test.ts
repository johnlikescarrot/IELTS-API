import { describe, expect, it } from 'vitest';

import {
  findWritingExercise,
  searchWritingExercises,
  writingExerciseView,
  WRITING_EXERCISES,
  WRITING_EXERCISE_KINDS,
  WRITING_EXERCISE_META,
  WRITING_EXERCISE_REVISION,
} from '../../src/data/writingExercises.js';
import { TASK_TYPES } from '../../src/data/tasks.js';

import type { ChartStimulus, MapStimulus, TableStimulus } from '../../src/data/writingExercises.js';

const page = (overrides: Partial<Parameters<typeof searchWritingExercises>[0]> = {}) =>
  searchWritingExercises({ limit: 20, offset: 0, ...overrides });

describe('original Writing Task 1 practice', () => {
  it('has one original exercise per reviewed task family and resolvable taxonomy links', () => {
    expect(WRITING_EXERCISES).toHaveLength(7);
    expect(new Set(WRITING_EXERCISES.map((item) => item.id)).size).toBe(7);
    expect(WRITING_EXERCISES.map((item) => item.kind)).toEqual(WRITING_EXERCISE_KINDS);
    expect(WRITING_EXERCISE_REVISION).toBe('1');
    expect(WRITING_EXERCISE_META.license).toBe('CC BY 4.0');
    expect(WRITING_EXERCISE_META.note).toContain('not official');
    expect(WRITING_EXERCISE_META.note).toContain('not writing quality');
    expect(WRITING_EXERCISE_META.upstreamCommit).toMatch(/^[0-9a-f]{40}$/);
    for (const item of WRITING_EXERCISES) {
      expect(item.id).toMatch(/^w1-[a-z-]+$/);
      expect(item.stimulus.kind).toBe(item.kind);
      expect(TASK_TYPES.some((type) => type.id === item.taskTypeId)).toBe(true);
      expect(item.checklist.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('has complete, unique checks and valid evidence pointers for every answer', () => {
    let count = 0;
    for (const exercise of WRITING_EXERCISES) {
      expect(exercise.checks).toHaveLength(3);
      expect(new Set(exercise.checks.map((q) => q.id)).size).toBe(3);
      for (const check of exercise.checks) {
        count += 1;
        expect(check.options.map((option) => option.id)).toEqual(['a', 'b', 'c']);
        expect(new Set(check.options.map((option) => option.text)).size).toBe(3);
        expect(check.options.some((option) => option.id === check.correctOption)).toBe(true);
        expect(check.explanation.length).toBeGreaterThan(40);
        expect(check.evidence.length).toBeGreaterThan(0);
        for (const pointer of check.evidence) {
          expect(pointer.startsWith('/stimulus/')).toBe(true);
          let value: unknown = writingExerciseView(exercise);
          for (const part of pointer.slice(1).split('/')) {
            value = (value as Record<string, unknown>)[part];
          }
          expect(value, `${exercise.id} ${check.id} ${pointer}`).not.toBeUndefined();
        }
      }
    }
    expect(count).toBe(21);
  });

  it('enforces the numeric and layout invariants used by the SVG renderer', () => {
    for (const { stimulus } of WRITING_EXERCISES) {
      switch (stimulus.kind) {
        case 'line-graph':
        case 'bar-chart':
        case 'pie-chart':
          expect(stimulus.categories.length).toBeGreaterThan(1);
          expect(stimulus.categories.length).toBeLessThanOrEqual(5);
          expect(stimulus.series.length).toBeLessThanOrEqual(3);
          for (const series of stimulus.series) {
            expect(series.values).toHaveLength(stimulus.categories.length);
            for (const value of series.values) {
              if (value !== null) {
                expect(Number.isFinite(value)).toBe(true);
                expect(value).toBeGreaterThanOrEqual(0);
              }
            }
            if (stimulus.kind === 'pie-chart') {
              expect(series.values).not.toContain(null);
              expect(series.values.reduce<number>((sum, value) => sum + value!, 0)).toBe(100);
              expect(stimulus.series).toHaveLength(2);
            }
          }
          break;
        case 'table':
          expect(stimulus.columns).toHaveLength(2);
          expect(stimulus.rows).toHaveLength(3);
          for (const row of stimulus.rows) {
            expect(row.values).toHaveLength(stimulus.columns.length);
            expect(row.values.every((value) => Number.isFinite(value) && value >= 0)).toBe(true);
          }
          break;
        case 'map':
          expect(stimulus.periods).toHaveLength(2);
          expect(stimulus.periods.every((period) => period.cells.length === 9)).toBe(true);
          break;
        case 'manufacturing-process':
        case 'natural-process':
          expect(stimulus.stages).toHaveLength(6);
          expect(new Set(stimulus.stages).size).toBe(6);
          break;
      }
    }
  });

  it('independently verifies the line and bar question keys against their data', () => {
    const line = findWritingExercise('w1-library-visits')!;
    const chart = line.stimulus as ChartStimulus;
    const finals = chart.series.map((series) => series.values.at(-1)!);
    expect(chart.series[finals.indexOf(Math.max(...finals))]!.label).toBe('North');
    expect(chart.series[2]!.values.every((value, i, xs) => i === 0 || value! > xs[i - 1]!)).toBe(true);
    expect(chart.series[0]!.values.at(-1)! - chart.series[0]!.values[0]!).toBe(40);
    expect(line.checks.map((q) => q.correctOption)).toEqual(['a', 'b', 'c']);

    const bar = findWritingExercise('w1-cycle-rentals')!;
    const data = bar.stimulus as ChartStimulus;
    expect(data.series[1]!.values[3]).toBeNull();
    expect(data.series[0]!.values[2]).toBe(0);
    expect(data.categories[data.series[1]!.values.indexOf(110)]).toBe('Riverside');
    expect(bar.checks.map((q) => q.correctOption)).toEqual(['b', 'a', 'c']);
  });

  it('independently verifies percentages, weighted counts and map changes', () => {
    const pie = findWritingExercise('w1-arts-income')!;
    const chart = pie.stimulus as ChartStimulus;
    const before = chart.series[0]!.values.map((value) => value!);
    const after = chart.series[1]!.values.map((value) => value!);
    expect(after[3]! - before[3]!).toBe(15);
    expect(((after[3]! - before[3]!) / before[3]!) * 100).toBe(300);
    expect(before.indexOf(Math.max(...before))).toBe(0);
    expect(after.indexOf(Math.max(...after))).toBe(0);
    expect(pie.checks.map((q) => q.correctOption)).toEqual(['a', 'c', 'b']);
    expect(chart.note).toContain('Total income amounts are not supplied');

    const table = findWritingExercise('w1-digital-membership')!;
    const rows = (table.stimulus as TableStimulus).rows;
    const counts = rows.map((row) => (row.values[0]! * row.values[1]!) / 100);
    expect(counts).toEqual([600, 480, 540]);
    expect(rows[counts.indexOf(Math.max(...counts))]!.label).toBe('Westgate');
    expect(rows.map((row) => row.values[1])).toEqual([25, 40, 18]);
    expect(
      (counts.reduce((a, b) => a + b, 0) / rows.reduce((n, row) => n + row.values[0]!, 0)) * 100,
    ).toBeCloseTo(24.54545, 4);
    expect(table.checks.map((q) => q.correctOption)).toEqual(['c', 'a', 'b']);

    const map = findWritingExercise('w1-meadow-square')!;
    const periods = (map.stimulus as MapStimulus).periods;
    expect([periods[0]!.cells[0], periods[1]!.cells[0]]).toEqual(['Orchard', 'Solar farm']);
    expect(periods.map((p) => p.cells[1])).toEqual(['Clinic', 'Clinic']);
    expect(periods[0]!.cells.filter((value, i) => value !== periods[1]!.cells[i])).toHaveLength(3);
    expect(map.checks.map((q) => q.correctOption)).toEqual(['b', 'c', 'a']);
  });

  it('verifies the process order and topology without inferring timing or band scores', () => {
    const linear = findWritingExercise('w1-bottle-refill')!;
    expect(linear.stimulus).toMatchObject({
      topology: 'linear',
      stages: ['Returned bottles', 'Inspection', 'Washing', 'Refilling', 'Sealing', 'Dispatch'],
    });
    expect(linear.stimulus.note).toContain('Durations');
    expect(linear.checks.map((q) => q.correctOption)).toEqual(['a', 'b', 'c']);
    const cycle = findWritingExercise('w1-flowering-cycle')!;
    expect(cycle.stimulus).toMatchObject({
      topology: 'cycle',
      stages: ['Seed in soil', 'Germination', 'Seedling', 'Mature plant', 'Flowering', 'Seed release'],
    });
    expect(cycle.checks.map((q) => q.correctOption)).toEqual(['c', 'a', 'b']);
  });

  it('resolves case-insensitive ids, filters conjunctively and paginates to completion', () => {
    expect(findWritingExercise(' W1-LIBRARY-VISITS ')?.id).toBe('w1-library-visits');
    expect(findWritingExercise('unknown')).toBeUndefined();
    expect(page().total).toBe(7);
    expect(page({ limit: 2 }).hasMore).toBe(true);
    expect(page({ offset: 6, limit: 2 }).hasMore).toBe(false);
    expect(page({ offset: 7 }).items).toEqual([]);
    expect(page({ kind: 'map' }).items.map((x) => x.id)).toEqual(['w1-meadow-square']);
    expect(page({ query: 'LIBRARY' }).total).toBeGreaterThan(0);
    expect(page({ query: 'refill', kind: 'map' }).total).toBe(0);
    expect(page({ query: 'zzzz' }).total).toBe(0);
  });

  it('does not leak keys or share mutable figures, options or checklists with the public view', () => {
    const original = WRITING_EXERCISES[0]!;
    const before = structuredClone(original);
    const view = writingExerciseView(original);
    expect(view.minimumWords).toBe(150);
    expect(view.suggestedMinutes).toBe(20);
    expect(view.figureUrl).toBe(`/v1/practice/writing/${original.id}/figure`);
    expect(view.instructions).toContain('connected report');
    for (const check of view.checks) {
      expect(Object.keys(check)).toEqual(['id', 'question', 'options']);
    }
    view.checklist[0] = 'changed';
    view.checks[0]!.options[0]!.text = 'changed';
    view.stimulus.title = 'changed';
    expect(original).toEqual(before);
  });
});
