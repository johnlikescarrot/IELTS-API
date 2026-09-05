import * as fs from 'node:fs';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { extractPracticeFile } from '../src/lib/practice-cli.js';
import { openApiDocument } from '../src/lib/openapi.js';
import { DOMAIN_ROUTES } from '../src/routes/index.js';
import { API_VERSION } from '../src/version.js';

vi.mock('../src/lib/practice-cli.js', () => ({ extractPracticeFile: vi.fn() }));
vi.mock('node:fs', async (importOriginal) => ({
  ...(await importOriginal<typeof fs>()),
  writeFileSync: vi.fn(),
}));
afterEach(() => {
  vi.restoreAllMocks();
});

describe('TypeScript generation entry points', () => {
  it('forwards command-line arguments to the tested offline extractor', async () => {
    await import('../scripts/extract_practice.js');
    expect(extractPracticeFile).toHaveBeenCalledWith(process.argv.slice(2));
  });

  it('writes the archived OpenAPI snapshot from the live domain route table', async () => {
    const write = vi.mocked(fs.writeFileSync);
    await import('../scripts/generate_openapi.js');
    expect(write).toHaveBeenCalledExactlyOnceWith(
      new URL('../docs/openapi.json', import.meta.url),
      `${JSON.stringify(openApiDocument(DOMAIN_ROUTES, '/', API_VERSION), null, 2)}\n`,
      'utf8',
    );
  });
});
