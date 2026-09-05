/**
 * The lexical network derived from the vocabulary dataset.
 *
 * Cambridge glosses are written with a controlled defining vocabulary, so
 * whenever a headword occurs inside another entry's definition a citable,
 * directed relation exists between the two entries: the occurring word
 * *defines* the host entry, and the host entry is one of the glosses the
 * word is *used by*. Counting those occurrences turns the dataset into a
 * reproducible lexical graph — no external corpus, no model, no randomness:
 * the structure is fully determined by the published definitions.
 *
 * Multi-word headwords (e.g. `ice cream`) can never be matched by the
 * single-token scanner, so they legitimately appear as nodes that are defined
 * by other headwords but never as definers themselves.
 */

import { allEntries } from '../data/vocabulary.js';

import type {
  LexgraphEdge,
  LexgraphHub,
  LexgraphNeighbour,
  LexgraphRelation,
  LexgraphStats,
  VocabularyEntry,
} from '../types.js';

/** Word tokens, identical to the analyser tokenisation in textstats. */
const TOKEN_PATTERN = /[a-zA-Z][a-zA-Z'’-]*/g;

/** Degree histogram buckets used by {@link lexgraphStats}. */
const DEGREE_BUCKETS = [
  { label: '0', test: (degree: number) => degree === 0 },
  { label: '1', test: (degree: number) => degree === 1 },
  { label: '2', test: (degree: number) => degree === 2 },
  { label: '3', test: (degree: number) => degree === 3 },
  { label: '4', test: (degree: number) => degree === 4 },
  { label: '5-9', test: (degree: number) => degree >= 5 && degree <= 9 },
  { label: '10-19', test: (degree: number) => degree >= 10 && degree <= 19 },
  { label: '20-49', test: (degree: number) => degree >= 20 && degree <= 49 },
  { label: '50+', test: (degree: number) => degree >= 50 },
];

/** A built lexical network over a concrete set of entries. */
export type Lexgraph = {
  /** Entries by stable identifier. */
  entries: Map<string, VocabularyEntry>;
  /** For each entry: the headwords occurring in its own glosses. */
  definers: Map<string, LexgraphEdge[]>;
  /** For each entry: the glosses its headword occurs in. */
  usedBy: Map<string, LexgraphEdge[]>;
};

/** Round to a fixed number of decimals (statistics are part of the JSON contract). */
function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/** Distinct gloss texts of an entry: the primary definition and every sense. */
function glossTexts(entry: VocabularyEntry): string[] {
  const texts = new Set<string>();
  if (entry.definition !== null) {
    texts.add(entry.definition);
  }
  for (const sense of entry.senses) {
    texts.add(sense.text);
  }
  return [...texts];
}

/**
 * Count headword tokens occurring in a gloss text.
 *
 * @param text - Gloss text.
 * @param idByToken - Lower-cased headword to identifier index.
 * @param ownId - Identifier of the entry being glossed (self-mentions excluded).
 */
function countTokens(
  text: string,
  idByToken: ReadonlyMap<string, string>,
  ownId: string,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const match of text.matchAll(TOKEN_PATTERN)) {
    const id = idByToken.get(match[0].toLowerCase());
    if (id === undefined || id === ownId) {
      continue;
    }
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

/**
 * Build the lexical network for an arbitrary set of entries.
 *
 * The build is O(tokens in glosses): a few hundred milliseconds for the full
 * dataset. Callers passing a custom entry list (a single volume, a
 * part-of-speech slice) get an independent graph over exactly those nodes.
 *
 * @param entries - Vocabulary entries to include as nodes.
 */
export function buildLexgraph(entries: readonly VocabularyEntry[]): Lexgraph {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const idByToken = new Map(entries.map((entry) => [entry.word.toLowerCase(), entry.id]));

  const inCounts = new Map<string, Map<string, number>>();
  const outCounts = new Map<string, Map<string, number>>();
  const bump = (
    index: Map<string, Map<string, number>>,
    key: string,
    other: string,
    weight: number,
  ): void => {
    const counts = index.get(key) ?? new Map<string, number>();
    counts.set(other, (counts.get(other) ?? 0) + weight);
    index.set(key, counts);
  };

  for (const entry of entries) {
    for (const text of glossTexts(entry)) {
      for (const [definerId, weight] of countTokens(text, idByToken, entry.id)) {
        bump(inCounts, entry.id, definerId, weight);
        bump(outCounts, definerId, entry.id, weight);
      }
    }
  }

  const toEdges = (counts: ReadonlyMap<string, number>): LexgraphEdge[] =>
    [...counts].map(([id, weight]) => ({ id, word: (byId.get(id) as VocabularyEntry).word, weight }));

  return {
    entries: byId,
    definers: new Map([...inCounts].map(([id, counts]) => [id, toEdges(counts)])),
    usedBy: new Map([...outCounts].map(([id, counts]) => [id, toEdges(counts)])),
  };
}

let cached: Lexgraph | undefined;

/**
 * Drop the cached full-dataset graph (mirrors {@link clearDatasetCache}).
 */
export function clearLexgraphCache(): void {
  cached = undefined;
}

/**
 * The cached graph over the full dataset, or a fresh build for a custom set.
 *
 * @param entries - Entries to build over; defaults to the full dataset.
 */
export function lexgraph(entries: readonly VocabularyEntry[] = allEntries()): Lexgraph {
  if (entries === allEntries()) {
    cached ??= buildLexgraph(entries);
    return cached;
  }
  return buildLexgraph(entries);
}

/**
 * Adjacent words of one entry, enriched with the fields researchers need to
 * interpret the relation (part of speech, gloss and shared Cambridge volumes).
 *
 * @param entry - Queried vocabulary entry.
 * @param direction - Which side of the network to return.
 * @param minWeight - Exclude edges below this many occurrences.
 * @param graph - Graph to traverse; defaults to the cached full dataset.
 */
export function neighboursFor(
  entry: VocabularyEntry,
  direction: 'defines' | 'used-by' | 'both',
  minWeight: number,
  graph: Lexgraph = lexgraph(),
): LexgraphNeighbour[] {
  const sides: { relation: LexgraphRelation; edges: LexgraphEdge[] }[] = [];
  if (direction === 'defines' || direction === 'both') {
    sides.push({ relation: 'defines', edges: graph.definers.get(entry.id) ?? [] });
  }
  if (direction === 'used-by' || direction === 'both') {
    sides.push({ relation: 'used-by', edges: graph.usedBy.get(entry.id) ?? [] });
  }
  const neighbours: LexgraphNeighbour[] = [];
  for (const side of sides) {
    for (const edge of side.edges) {
      if (edge.weight < minWeight) {
        continue;
      }
      const other = graph.entries.get(edge.id) as VocabularyEntry;
      neighbours.push({
        id: other.id,
        word: other.word,
        partOfSpeech: other.partOfSpeech,
        definition: other.definition,
        relation: side.relation,
        weight: edge.weight,
        sharedVolumes: other.volumes.filter((volume) => entry.volumes.includes(volume)),
      });
    }
  }
  return neighbours;
}

/**
 * Aggregate statistics of the lexical network: size, degree profile,
 * connectivity of the undirected projection and the most connected hubs.
 *
 * @param hubLimit - How many hubs to list.
 * @param entries - Entries to build over; defaults to the full dataset.
 */
export function lexgraphStats(
  hubLimit: number,
  entries: readonly VocabularyEntry[] = allEntries(),
): LexgraphStats {
  const graph = lexgraph(entries);
  const nodes = graph.entries.size;

  let edges = 0;
  let occurrences = 0;
  const weight = new Map<string, { defines: number; usedBy: number }>();
  const touch = (id: string): { defines: number; usedBy: number } => {
    const current = weight.get(id) ?? { defines: 0, usedBy: 0 };
    weight.set(id, current);
    return current;
  };
  const neighboursOf = new Map<string, string[]>();
  const noteNeighbour = (id: string, other: string): void => {
    const list = neighboursOf.get(id) ?? [];
    list.push(other);
    neighboursOf.set(id, list);
  };

  for (const [id, list] of graph.definers) {
    edges += list.length;
    for (const edge of list) {
      occurrences += edge.weight;
      touch(id).defines += edge.weight;
      touch(edge.id).usedBy += edge.weight;
      noteNeighbour(id, edge.id);
      noteNeighbour(edge.id, id);
    }
  }
  const degreeOf = (id: string): number =>
    (graph.definers.get(id) ?? []).length + (graph.usedBy.get(id) ?? []).length;

  const degreeHistogram: Record<string, number> = {};
  for (const bucket of DEGREE_BUCKETS) {
    let count = 0;
    for (const id of graph.entries.keys()) {
      if (bucket.test(degreeOf(id))) {
        count += 1;
      }
    }
    degreeHistogram[bucket.label] = count;
  }

  const visited = new Set<string>();
  let components = 0;
  let singletons = 0;
  let largest = 0;
  for (const id of graph.entries.keys()) {
    if (visited.has(id)) {
      continue;
    }
    components += 1;
    const queue = [id];
    visited.add(id);
    let size = 0;
    for (let head = 0; head < queue.length; head += 1) {
      const current = queue[head] as string;
      size += 1;
      for (const neighbour of neighboursOf.get(current) ?? []) {
        if (!visited.has(neighbour)) {
          visited.add(neighbour);
          queue.push(neighbour);
        }
      }
    }
    if (size === 1) {
      singletons += 1;
    }
    largest = Math.max(largest, size);
  }

  const hubs: LexgraphHub[] = [...graph.entries]
    .map(([id, entry]) => ({
      word: entry.word,
      usageWeight: weight.get(id)?.usedBy ?? 0,
      definerWeight: weight.get(id)?.defines ?? 0,
      totalWeight: (weight.get(id)?.defines ?? 0) + (weight.get(id)?.usedBy ?? 0),
      inDegree: (graph.definers.get(id) ?? []).length,
      outDegree: (graph.usedBy.get(id) ?? []).length,
    }))
    .sort((left, right) =>
      right.totalWeight === left.totalWeight
        ? left.word.localeCompare(right.word)
        : right.totalWeight - left.totalWeight,
    )
    .slice(0, hubLimit);

  const possible = nodes > 1 ? nodes * (nodes - 1) : 1;
  return {
    nodes,
    directedEdges: edges,
    occurrences,
    nodesWithDefiners: graph.definers.size,
    nodesUsedInOtherGlosses: graph.usedBy.size,
    meanDegree: round((2 * edges) / Math.max(1, nodes), 2),
    meanEdgeWeight: round(occurrences / Math.max(1, edges), 2),
    density: round(edges / possible, 6),
    components,
    largestComponent: largest,
    largestComponentShare: round(largest / Math.max(1, nodes), 4),
    singletons,
    degreeHistogram,
    topHubs: hubs,
  };
}
