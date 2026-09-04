/**
 * A seeded pseudo-random number generator.
 *
 * Endpoints that return a random selection accept a `seed` parameter and use
 * this generator, so that any published example can be reproduced exactly. When
 * no seed is supplied the generator is still deterministic: it defaults to
 * seed 0, and the seed actually used is echoed back in the response metadata.
 *
 * The algorithm is mulberry32, a small 32-bit generator with a period of 2^32
 * that passes the standard smoke tests for non-cryptographic use. It must not
 * be used for security purposes.
 *
 * @packageDocumentation
 */

/** A function returning successive pseudo-random values in `[0, 1)`. */
export type RandomSource = () => number;

/**
 * Creates a mulberry32 generator.
 *
 * @param seed - Any 32-bit integer seed.
 */
export function mulberry32(seed: number): RandomSource {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Draws `count` items from `items` without replacement, using a seeded
 * partial Fisher-Yates shuffle.
 *
 * @param items - The population to sample from.
 * @param count - Number of items to draw; clamped to the population size.
 * @param seed - Seed for the generator.
 * @returns The sampled items in draw order.
 */
export function sample<T>(
  items: readonly T[],
  count: number,
  seed: number,
): T[] {
  const pool = [...items];
  const take = Math.max(0, Math.min(count, pool.length));
  const random = mulberry32(seed);
  const drawn: T[] = [];

  for (let index = 0; index < take; index += 1) {
    const pick = index + Math.floor(random() * (pool.length - index));
    const chosen = pool[pick]!;
    pool[pick] = pool[index]!;
    pool[index] = chosen;
    drawn.push(chosen);
  }
  return drawn;
}
