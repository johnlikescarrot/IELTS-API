/**
 * Deterministic, dependency-free pseudo-random helpers. Many "random practice
 * prompt" endpoints let callers pass a `seed` so a given seed always returns
 * the same prompt, which makes results reproducible and cacheable.
 */

/** Normalise any seed value into a 32-bit unsigned integer. */
export function seedToUint32(seed: unknown): number {
  const text = String(seed);
  let hash = 2166136261; // FNV-1a offset basis.
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * A deterministic PRNG (mulberry32) initialised from {@link seed}. Repeated
 * calls advance the generator deterministically for the same seed.
 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick `count` distinct items (repeated evenly when fewer exist). */
export function pickDistinct<T>(items: readonly T[], count: number, rand: () => number): T[] {
  if (items.length === 0) {
    return [];
  }
  const wanted = Math.max(1, Math.min(count, items.length));
  const pool = [...items];
  const chosen: T[] = [];
  for (let i = 0; i < wanted; i += 1) {
    const index = Math.floor(rand() * pool.length);
    const item = pool.splice(index, 1)[0] as T;
    chosen.push(item);
  }
  return chosen;
}

/** Pick a single element using the given PRNG. */
export function pickOne<T>(items: readonly T[], rand: () => number): T {
  if (items.length === 0) {
    throw new RangeError("cannot pick from an empty array.");
  }
  const index = Math.floor(rand() * items.length);
  return items[index] as T;
}
