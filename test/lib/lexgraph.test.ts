import { describe, expect, it } from 'vitest';

import {
  buildLexgraph,
  clearLexgraphCache,
  lexgraph,
  lexgraphStats,
  neighboursFor,
} from '../../src/lib/lexgraph.js';
import { allEntries } from '../../src/data/vocabulary.js';

import type { VocabularyEntry } from '../../src/types.js';

/** Build a synthetic entry; senses default to the definition so dedup can be tested. */
function makeEntry(word: string, definition: string | null, senses?: string[]): VocabularyEntry {
  const glosses = senses ?? (definition === null ? [] : [definition]);
  return {
    id: `x-${word.toLowerCase().replace(/\s+/g, '-')}`,
    word,
    phonetic: null,
    partOfSpeech: 'noun',
    definition,
    senses: glosses.map((text) => ({ pos: 'noun' as const, text })),
    morphemes: null,
    volumes: [1, 2],
  };
}

describe('buildLexgraph (synthetic)', () => {
  const run = makeEntry('run', 'move fast');
  const fast = makeEntry('fast', 'moving at high run speed');
  const move = makeEntry('move', 'act; move quickly');
  const iceCream = makeEntry('ice cream', 'a fast dessert');
  const graph = buildLexgraph([run, fast, move, iceCream]);

  it('links a headword token found in another gloss', () => {
    const definers = graph.definers.get(run.id) ?? [];
    expect(definers.map((edge) => [edge.word, edge.weight])).toEqual([
      ['move', 1],
      ['fast', 1],
    ]);
  });

  it('deduplicates the definition and the matching sense text', () => {
    const definers = graph.definers.get(fast.id) ?? [];
    expect(definers).toHaveLength(1);
    expect(definers[0]).toMatchObject({ word: 'run', weight: 1 });
  });

  it('excludes self-mentions', () => {
    expect(graph.definers.has(move.id)).toBe(false);
  });

  it('indexes the mirror direction by occurrence', () => {
    expect((graph.usedBy.get(fast.id) ?? []).map((edge) => edge.word)).toEqual(['run', 'ice cream']);
    expect((graph.usedBy.get(move.id) ?? []).map((edge) => edge.word)).toEqual(['run']);
  });

  it('treats multi-word headwords as targets only', () => {
    const definers = graph.definers.get(iceCream.id) ?? [];
    expect(definers.map((edge) => edge.word)).toEqual(['fast']);
    expect(graph.usedBy.has(iceCream.id)).toBe(false);
  });

  it('handles an isolated entry whose definition is null', () => {
    const orphan = makeEntry('orphan', null, ['left alone in the woods']);
    const isolated = buildLexgraph([orphan]);
    expect(isolated.definers.size).toBe(0);
    expect(isolated.usedBy.size).toBe(0);
    expect(neighboursFor(orphan, 'both', 1, isolated)).toEqual([]);
  });
});

describe('lexgraphStats (full dataset)', () => {
  const stats = lexgraphStats(10);

  it('counts the network over all 4,174 headwords', () => {
    expect(stats.nodes).toBe(4174);
    expect(stats.directedEdges).toBe(25191);
    expect(stats.occurrences).toBe(27855);
    expect(stats.nodesWithDefiners).toBe(3979);
    expect(stats.nodesUsedInOtherGlosses).toBe(2973);
  });

  it('summarises degree, density and connectivity', () => {
    expect(stats.meanDegree).toBe(12.07);
    expect(stats.meanEdgeWeight).toBe(1.11);
    expect(stats.density).toBe(0.001446);
    expect(stats.components).toBe(92);
    expect(stats.largestComponent).toBe(4081);
    expect(stats.largestComponentShare).toBe(0.9777);
    expect(stats.singletons).toBe(89);
    expect(stats.degreeHistogram['0']).toBe(89);
    expect(stats.degreeHistogram['50+']).toBe(121);
  });

  it('ranks hubs by total weight with word tie-breaks', () => {
    expect(stats.topHubs).toHaveLength(10);
    expect(stats.topHubs[0]?.word).toBe('act');
    expect(stats.topHubs[0]?.outDegree).toBe(453);
    expect(stats.topHubs[0]?.inDegree).toBe(24);
    expect(stats.topHubs[0]?.totalWeight).toBe(
      (stats.topHubs[0]?.usageWeight ?? 0) + (stats.topHubs[0]?.definerWeight ?? 0),
    );
    const weights = stats.topHubs.map((hub) => hub.totalWeight);
    expect([...weights].sort((a, b) => b - a)).toEqual(weights);
  });

  it('builds a smaller graph for a custom entry pool', () => {
    const subset = allEntries().slice(0, 50);
    const small = lexgraphStats(5, subset);
    expect(small.nodes).toBe(50);
    expect(small.directedEdges).toBeLessThan(stats.directedEdges);
    expect(small.topHubs.length).toBeLessThanOrEqual(5);
  });

  it('handles the empty graph without dividing by zero', () => {
    const empty = lexgraphStats(10, []);
    expect(empty.nodes).toBe(0);
    expect(empty.density).toBe(0);
    expect(empty.meanDegree).toBe(0);
    expect(empty.meanEdgeWeight).toBe(0);
    expect(empty.components).toBe(0);
    expect(empty.largestComponent).toBe(0);
    expect(empty.largestComponentShare).toBe(0);
    expect(empty.singletons).toBe(0);
    expect(empty.degreeHistogram['0']).toBe(0);
    expect(empty.topHubs).toEqual([]);
  });
});

describe('caching', () => {
  it('reuses one graph for the full dataset and rebuilds on demand', () => {
    const first = lexgraph();
    expect(lexgraph()).toBe(first);
    expect(lexgraph(allEntries())).toBe(first);
    const before = lexgraphStats(1).topHubs;
    clearLexgraphCache();
    const second = lexgraph();
    expect(second).not.toBe(first);
    expect(lexgraphStats(1).topHubs).toEqual(before);
    const custom = lexgraph(allEntries().slice(0, 10));
    expect(custom.entries.size).toBe(10);
  });
});

describe('neighboursFor', () => {
  const entry = allEntries().find((candidate) => candidate.word === 'abandon') as VocabularyEntry;

  it('returns definers with gloss enrichment', () => {
    const definers = neighboursFor(entry, 'defines', 1);
    expect(definers.length).toBeGreaterThan(0);
    for (const neighbour of definers) {
      expect(neighbour.relation).toBe('defines');
      expect(neighbour.weight).toBeGreaterThanOrEqual(1);
      expect(entry.volumes).toEqual(expect.arrayContaining(neighbour.sharedVolumes));
    }
    const trait = definers.find((neighbour) => neighbour.word.toLowerCase() === 'trait');
    expect(trait?.definition).toContain('distinguishing feature');
  });

  it('filters by minimum weight and direction', () => {
    const both = neighboursFor(entry, 'both', 1);
    const definers = neighboursFor(entry, 'defines', 1);
    const usedBy = neighboursFor(entry, 'used-by', 1);
    expect(usedBy.every((neighbour) => neighbour.relation === 'used-by')).toBe(true);
    expect(definers.length + usedBy.length).toBe(both.length);
    const strong = neighboursFor(entry, 'both', 2);
    expect(strong.length).toBeLessThanOrEqual(both.length);
    for (const neighbour of strong) {
      expect(neighbour.weight).toBeGreaterThanOrEqual(2);
    }
  });
});
