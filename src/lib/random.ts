/**
 * Deterministic pseudo-random utilities.
 *
 * Every "random" endpoint accepts an optional `seed`; the same seed always
 * produces the same output, which makes practice sets reproducible and the
 * whole API trivially testable.
 */

/** FNV-1a 32-bit hash of a string, used to convert seeds to numeric state. */
export function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Mulberry32 PRNG: tiny, fast and good enough for study sets. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Creates a generator. With a seed the output is fully deterministic;
 * without one, the generator is seeded from `Math.random`.
 */
export function createRng(seed?: string): () => number {
  if (seed === undefined) {
    return mulberry32(Math.floor(Math.random() * 0x100000000) >>> 0);
  }
  return mulberry32(hashSeed(seed));
}

/** Returns a Fisher-Yates shuffle of `items`; the input is not mutated. */
export function shuffled<T>(items: readonly T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const atI = copy[i] as T;
    const atJ = copy[j] as T;
    copy[i] = atJ;
    copy[j] = atI;
  }
  return copy;
}

/** Returns up to `count` items chosen without replacement. */
export function sample<T>(items: readonly T[], count: number, rng: () => number): T[] {
  const bounded = Math.max(0, Math.min(count, items.length));
  return shuffled(items, rng).slice(0, bounded);
}
