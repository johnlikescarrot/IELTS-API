/** Offline command-line data generation; deliberately has no HTTP client. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { extractPractice } from '../data/practice-extract.js';

/** Generate a deterministic practice snapshot from an already downloaded Git tree. */
export function runPracticeExtraction(argv: readonly string[], entry: boolean): void {
  if (!entry) return;
  if (argv.length !== 2) throw new Error('Usage: npm run data:practice -- <tree.json> <output.json>');
  const input = JSON.parse(readFileSync(argv[0]!, 'utf8')) as unknown;
  const catalog = extractPractice(input);
  const output = argv[1]!;
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
}
