import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { PRACTICE_SOURCE } from '../../src/data/practice-source.js';
import { extractPracticeFile } from '../../src/lib/practice-cli.js';
import { buildPracticeIndex } from '../../src/lib/practice-index.js';

let directory: string;
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'ielts-practice-'));
});
afterEach(() => {
  rmSync(directory, { recursive: true, force: true });
});

describe('offline practice extraction command', () => {
  it('writes deterministic UTF-8 JSON with a final newline', () => {
    const tree = { sha: PRACTICE_SOURCE.treeSha, truncated: false, tree: [] };
    const input = join(directory, 'tree.json');
    const output = join(directory, 'practice.json');
    writeFileSync(input, JSON.stringify(tree));
    extractPracticeFile([input, output]);
    expect(readFileSync(output, 'utf8')).toBe(`${JSON.stringify(buildPracticeIndex(tree), null, 2)}\n`);
    extractPracticeFile([input, output]);
    expect(readFileSync(output, 'utf8')).toBe(`${JSON.stringify(buildPracticeIndex(tree), null, 2)}\n`);
  });

  it.each([{ args: [] }, { args: ['input'] }, { args: ['input', 'output', 'extra'] }])(
    'requires exactly two paths: $args',
    ({ args }) => {
      expect(() => extractPracticeFile(args)).toThrow(/Usage/);
    },
  );

  it('preserves the previous output when input is invalid or truncated', () => {
    const input = join(directory, 'tree.json');
    const output = join(directory, 'practice.json');
    writeFileSync(output, 'previous data');
    writeFileSync(input, '{ invalid JSON');
    expect(() => extractPracticeFile([input, output])).toThrow();
    expect(readFileSync(output, 'utf8')).toBe('previous data');
    writeFileSync(input, JSON.stringify({ sha: PRACTICE_SOURCE.treeSha, tree: [], truncated: true }));
    expect(() => extractPracticeFile([input, output])).toThrow(/complete/);
    expect(readFileSync(output, 'utf8')).toBe('previous data');
  });

  it('reports missing input files', () => {
    expect(() =>
      extractPracticeFile([join(directory, 'missing.json'), join(directory, 'practice.json')]),
    ).toThrow(/ENOENT/);
  });
});
