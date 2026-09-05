import { afterAll, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { exportDocs } from '../scripts/export_docs.js';

const directory = mkdtempSync(join(tmpdir(), 'ielts-docs-'));
afterAll(() => {
  rmSync(directory, { recursive: true, force: true });
});

describe('archived research and OpenAPI snapshots', () => {
  it('are byte-reproducible from the live generators', async () => {
    await exportDocs(directory, true);
    for (const name of ['openapi.json', 'research.html']) {
      expect(readFileSync(join(directory, name), 'utf8')).toBe(
        readFileSync(new URL(`../docs/${name}`, import.meta.url), 'utf8'),
      );
    }
  });
});
