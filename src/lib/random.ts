/**
 * FNV-1a 32-bit string hash. Deterministic across Node versions and platforms,
 * which keeps seeded sampling reproducible for a given seed string.
 */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Mulberry32 pseudo-random number generator: tiny, fast and deterministic.
 * Returns floats in [0, 1).
 */
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
 * Deterministically sample `count` items using a Fisher-Yates shuffle driven
 * by the seed string. The same seed always yields the same sample, which makes
 * "word of the day" style endpoints reproducible and cache-friendly.
 */
export function sampleSeeded<T>(items: readonly T[], count: number, seed: string): T[] {
  const random = mulberry32(hashString(seed));
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    swapItems(pool, i, j);
  }
  return pool.slice(0, Math.min(count, pool.length));
}

/** Swap two positions in an array; out-of-range indices are ignored. */
export function swapItems<T>(values: T[], a: number, b: number): void {
  const first = values[a];
  const second = values[b];
  if (first === undefined || second === undefined) {
    return;
  }
  const temporary = first;
  values[a] = second;
  values[b] = temporary;
}
