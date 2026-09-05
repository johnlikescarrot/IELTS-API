import { describe, expect, it } from 'vitest';

import {
  STRATEGIES,
  STRATEGY_SKILLS,
  findStrategy,
  strategiesFor,
  searchStrategies,
  strategyStats,
} from '../../src/data/strategies.js';

import type { StrategyCard } from '../../src/types.js';
import type { Page } from '../../src/lib/search.js';

const page = (overrides: Partial<Parameters<typeof searchStrategies>[0]> = {}): Page<StrategyCard> =>
  searchStrategies({ limit: 100, offset: 0, ...overrides });

describe('the learning-strategy bank', () => {
  it('carries complete, honest cards', () => {
    expect(STRATEGIES.length).toBeGreaterThanOrEqual(24);
    for (const strategy of STRATEGIES) {
      expect(STRATEGY_SKILLS).toContain(strategy.skill);
      expect(strategy.title.length).toBeGreaterThan(3);
      expect(strategy.action.length).toBeGreaterThan(20);
      expect(strategy.rationale.length).toBeGreaterThan(20);
      expect(strategy.evidence.length).toBeGreaterThan(5);
      const [low, high] = strategy.bands as [number, number];
      expect(low).toBeLessThanOrEqual(high);
      expect(low).toBeGreaterThanOrEqual(0);
      expect(high).toBeLessThanOrEqual(9);
      expect(strategy.id.startsWith(`st-${strategy.skill}-`)).toBe(true);
    }
    expect(new Set(STRATEGIES.map((strategy) => strategy.id)).size).toBe(STRATEGIES.length);
  });

  it('covers every skill', () => {
    const bySkill = strategyStats().bySkill;
    for (const skill of STRATEGY_SKILLS) {
      expect(bySkill[skill]).toBeGreaterThanOrEqual(6);
    }
    expect(strategyStats().strategies).toBe(STRATEGIES.length);
  });

  it('lists cards per skill with and without a filter', () => {
    expect(strategiesFor().length).toBe(STRATEGIES.length);
    const listening = strategiesFor('writing');
    expect(listening.every((strategy) => strategy.skill === 'writing')).toBe(true);
    expect(strategiesFor('speaking').length).toBeGreaterThan(0);
  });

  it('filters by skill, band and text', () => {
    expect(page({ skill: 'reading' }).items.every((item) => item.skill === 'reading')).toBe(true);
    const bandFour = page({ band: 4 });
    expect(bandFour.total).toBeGreaterThan(0);
    for (const item of bandFour.items) {
      expect(item.bands[0]).toBeLessThanOrEqual(4);
      expect(item.bands[1]).toBeGreaterThanOrEqual(4);
    }
    expect(page({ band: 0 }).total).toBe(0);
    expect(page({ query: 'collocations' }).total).toBeGreaterThan(0);
    expect(page({ query: 'no-such-strategy' }).total).toBe(0);
  });

  it('paginates', () => {
    const result = page({ limit: 10, offset: 10 });
    expect(result.items).toHaveLength(10);
    expect(result.hasMore).toBe(true);
    expect(result.total).toBe(STRATEGIES.length);
  });

  it('finds one card', () => {
    const first = STRATEGIES[0] as StrategyCard;
    expect(findStrategy(` ${first.id} `)?.id).toBe(first.id);
    expect(findStrategy('st-nope-99')).toBeUndefined();
  });
});
