import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PRACTICE_SOURCE } from '../src/data/practice-source.js';
import type { PracticeIndex } from '../src/types.js';

const originalArgv = process.argv;
const directories: string[] = [];
afterEach(() => {
  process.argv = originalArgv;
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true });
  vi.resetModules();
});

describe('the offline practice compiler CLI', () => {
  it('requires exactly an input and output filename', async () => {
    process.argv = ['node', 'build-practice.js'];
    await expect(import('../src/build-practice.js')).rejects.toThrow('Usage:');
  });

  it('writes a deterministic JSON file and trailing newline using real file I/O', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'practice-build-'));
    directories.push(directory);
    const input = join(directory, 'tree.json');
    const output = join(directory, 'practice.json');
    writeFileSync(
      input,
      JSON.stringify({
        sha: PRACTICE_SOURCE.commit,
        truncated: false,
        tree: [
          {
            path: 'Reading_1232_Basic/frontend/data/A1-A2/lesson_001.json',
            type: 'blob',
            mode: '100644',
            sha: 'a'.repeat(40),
            size: 10,
          },
        ],
      }),
    );
    process.argv = ['node', 'build-practice.js', input, output];
    await import('../src/build-practice.js');
    const text = readFileSync(output, 'utf8');
    const data = JSON.parse(text) as PracticeIndex;
    expect(data.items).toHaveLength(1);
    expect(data.items[0]?.id).toBe('reading-basic-a1-a2-0001');
    expect(text).toBe(`${JSON.stringify(data, null, 2)}\n`);
    vi.resetModules();
    await import('../src/build-practice.js');
    expect(readFileSync(output, 'utf8')).toBe(text);
  });
});
