/**
 * Dataset loading.
 *
 * The datasets are large (the vocabulary dataset is several megabytes), so they
 * are read lazily from `data/` on first use and cached for the lifetime of the
 * process. No JSON is bundled into the compiled JavaScript, which keeps the
 * package small and lets the data be regenerated without a rebuild.
 */

import { readFileSync } from 'node:fs';

/** Parsed datasets, keyed by file name. */
const cache = new Map<string, unknown>();

/**
 * Load and cache a JSON dataset shipped in `data/`.
 *
 * @param fileName - File name relative to the repository `data/` directory.
 * @returns The parsed dataset.
 */
export function loadDataset<T>(fileName: string): T {
  const cached = cache.get(fileName);
  if (cached !== undefined) {
    return cached as T;
  }
  const location = new URL(`../../data/${fileName}`, import.meta.url);
  const parsed = JSON.parse(readFileSync(location, 'utf8')) as T;
  cache.set(fileName, parsed);
  return parsed;
}

/**
 * Drop every cached dataset.
 *
 * Used by tests and by long-running processes that want to reload data after a
 * regeneration.
 */
export function clearDatasetCache(): void {
  cache.clear();
}
