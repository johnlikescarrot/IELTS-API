/** Local, offline metadata extraction command; no upstream blobs are fetched. */

import { readFileSync, writeFileSync } from 'node:fs';

import { buildPracticeIndex } from './practice-index.js';

/** Generate a practice index from a downloaded, pinned GitHub recursive tree. */
export function extractPracticeFile(argv: readonly string[]): void {
  if (argv.length !== 2) throw new Error('Usage: npm run data:practice -- <tree.json> <output.json>');
  const input = JSON.parse(readFileSync(argv[0] as string, 'utf8')) as unknown;
  const index = buildPracticeIndex(input);
  writeFileSync(argv[1] as string, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
}
