import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runPracticeExtraction } from '../../src/lib/practice-cli.js';
import { extractPractice, PRACTICE_SOURCE } from '../../src/data/practice-extract.js';

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
  vi.restoreAllMocks();
});
function workspace() {
  const directory = mkdtempSync(join(tmpdir(), 'ielts-practice-'));
  directories.push(directory);
  return directory;
}

describe('the offline TypeScript extractor CLI', () => {
  it('does nothing on import and rejects invalid invocations', () => {
    expect(runPracticeExtraction([], false)).toBeUndefined();
    expect(() => runPracticeExtraction([], true)).toThrow(/Usage/);
    expect(() => runPracticeExtraction(['a', 'b', 'c'], true)).toThrow(/Usage/);
  });

  it('creates parent directories and generates byte-identical results on repeated runs', () => {
    const directory = workspace();
    const input = join(directory, 'tree.json');
    const output = join(directory, 'nested', 'practice.json');
    const tree = { sha: PRACTICE_SOURCE.commit, truncated: false, tree: [] };
    writeFileSync(input, JSON.stringify(tree));
    runPracticeExtraction([input, output], true);
    const first = readFileSync(output, 'utf8');
    expect(first).toBe(JSON.stringify(extractPractice(tree), null, 2) + '\n');
    runPracticeExtraction([input, output], true);
    expect(readFileSync(output, 'utf8')).toBe(first);
  });

  it('fails before writing on invalid input', () => {
    const directory = workspace();
    const input = join(directory, 'bad.json');
    const output = join(directory, 'output.json');
    writeFileSync(input, '{');
    expect(() => runPracticeExtraction([input, output], true)).toThrow(SyntaxError);
    expect(existsSync(output)).toBe(false);
    expect(() => runPracticeExtraction([join(directory, 'missing'), output], true)).toThrow();
  });

  it('has a thin executable entry point that can also be imported without side effects', async () => {
    await import('../../scripts/extract_practice.js');
  });
});
