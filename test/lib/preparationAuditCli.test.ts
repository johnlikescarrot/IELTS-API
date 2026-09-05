import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalArgv = process.argv;
let temp: string;
beforeEach(() => {
  vi.resetModules();
  temp = mkdtempSync(join(tmpdir(), 'ielts-audit-'));
});
afterEach(() => {
  process.argv = originalArgv;
  rmSync(temp, { recursive: true, force: true });
});

describe('offline audit CLI', () => {
  it('writes the exact versioned report', async () => {
    const input = fileURLToPath(new URL('../../data/msneloy-tree.json', import.meta.url));
    const output = join(temp, 'audit.json');
    process.argv = ['node', 'audit_msneloy.ts', input, output];
    await import('../../scripts/audit_msneloy.js');
    expect(readFileSync(output, 'utf8')).toBe(
      readFileSync(new URL('../../data/msneloy-audit.json', import.meta.url), 'utf8'),
    );
  });

  it.each([{ args: [] }, { args: ['input.json'] }])(
    'requires both input and output paths: $args',
    async ({ args }) => {
      process.argv = ['node', 'audit_msneloy.ts', ...args];
      await expect(import('../../scripts/audit_msneloy.js')).rejects.toThrow('Usage:');
    },
  );
});
