import { describe, expect, it } from 'vitest';

import { BAND_GRID, analyseTarget, requiredFor, requiredSum } from '../../src/lib/target.js';
import { roundBand, SKILLS } from '../../src/lib/band.js';

import type { Skill } from '../../src/types.js';

/** Build a component record from four bands. */
function components(listening: number, reading: number, writing: number, speaking: number) {
  return { listening, reading, writing, speaking } as Record<Skill, number>;
}

describe('BAND_GRID', () => {
  it('covers every reportable band in half steps', () => {
    expect(BAND_GRID).toHaveLength(19);
    expect(BAND_GRID[0]).toBe(0);
    expect(BAND_GRID.at(-1)).toBe(9);
  });
});

describe('requiredSum', () => {
  it('returns the smallest component sum that reports as the target', () => {
    expect(requiredSum(7)).toBe(27);
    expect(requiredSum(6.5)).toBe(25);
    expect(requiredSum(9)).toBe(35);
    expect(requiredSum(0)).toBe(0);
  });

  it('agrees with the rounding rule for every reportable band', () => {
    for (const band of BAND_GRID) {
      expect(roundBand(requiredSum(band) / SKILLS.length)).toBe(band);
    }
  });
});

describe('requiredFor', () => {
  it('finds the lowest band one component must reach', () => {
    expect(requiredFor(components(7, 7, 6, 7), 'writing', 7)).toBe(6);
    expect(requiredFor(components(6, 6, 6, 6), 'writing', 7)).toBe(9);
  });

  it('returns undefined when even band 9 cannot reach the target', () => {
    expect(requiredFor(components(5, 5, 5, 5), 'writing', 7)).toBeUndefined();
  });
});

describe('analyseTarget', () => {
  it('reports a target that is already met', () => {
    const analysis = analyseTarget(components(7, 7, 7, 7), 7);
    expect(analysis.met).toBe(true);
    expect(analysis.current).toBe(7);
    expect(analysis.pointsNeeded).toBe(0);
    expect(analysis.balanced).toBeNull();
    expect(analysis.cheapest?.lift).toBe(0);
  });

  it('finds the cheapest single-component route', () => {
    const analysis = analyseTarget(components(7, 7, 6, 6.5), 7);
    expect(analysis.met).toBe(false);
    expect(analysis.current).toBe(6.5);
    expect(analysis.requiredSum).toBe(27);
    expect(analysis.currentSum).toBe(26.5);
    expect(analysis.pointsNeeded).toBe(1);
    // Any component can absorb the missing half point, so the report order breaks the tie.
    expect(analysis.cheapest?.skill).toBe('listening');
    expect(analysis.cheapest?.required).toBe(7.5);
    expect(analysis.cheapest?.lift).toBe(0.5);
    expect(analysis.routes.every((route) => route.lift === 0.5)).toBe(true);
  });

  it('orders routes by lift and keeps unreachable components last', () => {
    const analysis = analyseTarget(components(5, 5, 5, 5), 7);
    expect(analysis.routes.every((route) => !route.achievable)).toBe(true);
    expect(analysis.routes.map((route) => route.skill)).toEqual([...SKILLS]);
    expect(analysis.routes[0]?.required).toBeNull();
    expect(analysis.routes[0]?.lift).toBeNull();
    expect(analysis.cheapest).toBeNull();
  });

  it('proposes a balanced lift when no single component suffices', () => {
    const analysis = analyseTarget(components(5, 5, 5, 5), 7);
    expect(analysis.balanced).toEqual(components(7, 7, 7, 7));
  });

  it('clips a balanced lift at band 9', () => {
    const analysis = analyseTarget(components(9, 9, 4, 4), 9);
    expect(analysis.balanced).toEqual(components(9, 9, 6.5, 6.5));
  });

  it('sorts an achievable route ahead of an unreachable one', () => {
    const analysis = analyseTarget(components(9, 9, 5, 5), 8);
    expect(analysis.routes[0]?.achievable).toBe(true);
    expect(analysis.routes[0]?.skill).toBe('writing');
    expect(analysis.routes.at(-1)?.achievable).toBe(false);
  });

  it('demotes an unreachable component that appears before a reachable one', () => {
    // Listening is already at 9 and cannot lift the mean further on its own;
    // the three weak components each can.
    const analysis = analyseTarget(components(9, 3, 3, 3), 6);
    expect(analysis.routes.map((route) => route.skill)).toEqual([
      'reading',
      'writing',
      'speaking',
      'listening',
    ]);
    expect(analysis.routes.at(-1)?.achievable).toBe(false);
  });

  it('never proposes a balanced plan whose sum misses the target', () => {
    const analysis = analyseTarget(components(6, 6, 5.5, 5), 7);
    const balanced = analysis.balanced as Record<Skill, number>;
    const sum = SKILLS.reduce((total, skill) => total + balanced[skill], 0);
    expect(roundBand(sum / SKILLS.length)).toBeGreaterThanOrEqual(7);
  });
});
