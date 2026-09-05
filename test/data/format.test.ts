import { describe, expect, it } from 'vitest';

import { TEST_BLUEPRINTS, TEST_MODULES, findBlueprint, totalTestMinutes } from '../../src/data/format.js';
import { RAW_SCORE_TABLES } from '../../src/data/rawscores.js';

describe('test-format blueprints', () => {
  it('publishes one blueprint per module', () => {
    expect(TEST_BLUEPRINTS).toHaveLength(TEST_MODULES.length);
    expect(TEST_BLUEPRINTS.map((blueprint) => blueprint.module)).toEqual([...TEST_MODULES]);
  });

  it('gives every paper at least one scored item and one part', () => {
    for (const blueprint of TEST_BLUEPRINTS) {
      expect(blueprint.items).toBeGreaterThan(0);
      expect(blueprint.parts.length).toBeGreaterThan(0);
      expect(blueprint.durationMinutes).toBeGreaterThan(0);
      expect(blueprint.summary.length).toBeGreaterThan(30);
    }
  });

  it('sums part items to the paper total', () => {
    for (const blueprint of TEST_BLUEPRINTS) {
      const total = blueprint.parts.reduce((sum, part) => sum + part.items, 0);
      expect(total, blueprint.module).toBe(blueprint.items);
    }
  });

  it('numbers the parts consecutively from one', () => {
    for (const blueprint of TEST_BLUEPRINTS) {
      expect(blueprint.parts.map((part) => part.number)).toEqual(
        blueprint.parts.map((_, index) => index + 1),
      );
    }
  });

  it('gives the objectively marked papers a conversion table and the rest none', () => {
    for (const blueprint of TEST_BLUEPRINTS) {
      if (blueprint.scoring === 'raw') {
        expect(blueprint.rawScoreTable).not.toBeNull();
        expect(RAW_SCORE_TABLES[blueprint.rawScoreTable!].questions).toBe(blueprint.items);
      } else {
        expect(blueprint.rawScoreTable).toBeNull();
      }
    }
  });

  it('shares Listening and Speaking across both modules', () => {
    expect(findBlueprint('listening')?.sharedAcrossModules).toBe(true);
    expect(findBlueprint('speaking')?.sharedAcrossModules).toBe(true);
    expect(findBlueprint('reading-academic')?.sharedAcrossModules).toBe(false);
  });

  it('gives Listening transfer time and Reading none', () => {
    expect(findBlueprint('listening')?.transferMinutes).toBe(10);
    expect(findBlueprint('reading-academic')?.transferMinutes).toBe(0);
  });
});

describe('findBlueprint', () => {
  it('resolves a module case-insensitively', () => {
    expect(findBlueprint('READING-ACADEMIC')?.name).toBe('Academic Reading');
  });

  it('returns undefined for an unknown module', () => {
    expect(findBlueprint('reading-intergalactic')).toBeUndefined();
  });
});

describe('totalTestMinutes', () => {
  it('sums the Academic papers excluding Speaking', () => {
    // Listening 30 + 10 transfer, Academic Reading 60, Academic Writing 60.
    expect(totalTestMinutes()).toBe(160);
  });
});
