/** Offline metadata compiler CLI. Fetch the pinned Git tree separately; no network access here. */
import { readFileSync, writeFileSync } from 'node:fs';
import { buildPracticeIndex } from './lib/practice-index.js';

if (process.argv.length !== 4) {
  throw new Error('Usage: npm run data:practice -- <tree.json> <output.json>');
}
const input = JSON.parse(readFileSync(process.argv[2] as string, 'utf8')) as unknown;
const index = buildPracticeIndex(input);
writeFileSync(process.argv[3] as string, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
