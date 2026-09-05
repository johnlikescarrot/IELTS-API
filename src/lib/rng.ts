/**
 * Deterministic pseudo-random number generation.
 *
 * `Math.random()` cannot be used for reproducible research endpoints such as
 * "word of the day": every replica must answer the same request identically.
 * The generator below is seeded from a string hash, so `/v1/vocabulary/daily`
 * is stable for a given date across processes, machines and releases.
 */

/** FNV-1a 32-bit string hash. */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/**
 * Create a seeded generator producing values in `[0, 1)`.
 *
 * mulberry32 is a small, fast, well-distributed 32-bit PRNG.
 *
 * @param seed - 32-bit seed.
 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministically pick `count` distinct indices from a population.
 *
 * @param seed - Seed string (e.g. an ISO date).
 * @param population - Size of the population.
 * @param count - How many distinct indices to return.
 * @returns Indices in ascending order.
 */
export function seededIndices(seed: string, population: number, count: number): number[] {
  if (population <= 0 || count <= 0) {
    return [];
  }
  const size = Math.min(count, population);
  const random = mulberry32(hashString(seed));
  const indices = Array.from({ length: population }, (_unused, index) => index);
  for (let position = 0; position < size; position += 1) {
    const swap = position + Math.floor(random() * (population - position));
    const left = indices[position] as number;
    const right = indices[swap] as number;
    indices[position] = right;
    indices[swap] = left;
  }
  return indices.slice(0, size).sort((a, b) => a - b);
}

/**
 * Deterministically permute a list (Fisher-Yates).
 *
 * Unlike {@link seededIndices}, which returns ascending indices, this keeps a
 * genuine shuffled order: useful when the presentation order of drill options
 * must itself be reproducible.
 *
 * @param seed - Seed string; identical seeds return identical permutations.
 * @param items - Items to permute; the input is not modified.
 * @returns A new array holding the items in seeded order.
 */
export function shuffled<T>(seed: string, items: readonly T[]): T[] {
  const result = [...items];
  const random = mulberry32(hashString(seed));
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    const left = result[index] as T;
    const right = result[swap] as T;
    result[index] = right;
    result[swap] = left;
  }
  return result;
}
