import { writeFileSync } from 'node:fs';
import type * as Fs from 'node:fs';
import { expect, it, vi } from 'vitest';
import { openApiDocument } from '../src/lib/openapi.js';
import { renderCitationBibtex, renderResearchMarkdown } from '../src/lib/research.js';
import { ROUTES } from '../src/routes/index.js';
import { API_VERSION } from '../src/version.js';

vi.mock('node:fs', async (original) => ({
  ...(await original<typeof Fs>()),
  writeFileSync: vi.fn(),
}));

it('regenerates all contract and scholarly artifacts without binding a port', async () => {
  await import('../src/build-docs.js');
  expect(writeFileSync).toHaveBeenCalledTimes(3);
  expect(writeFileSync).toHaveBeenCalledWith(
    'docs/openapi.json',
    `${JSON.stringify(openApiDocument(ROUTES, '/', API_VERSION), null, 2)}\n`,
  );
  expect(writeFileSync).toHaveBeenCalledWith('docs/citation.bib', renderCitationBibtex());
  expect(writeFileSync).toHaveBeenCalledWith('paper/practice-metadata.md', renderResearchMarkdown());
});
