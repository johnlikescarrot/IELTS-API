import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { format } from 'prettier';
import type { Options } from 'prettier';
import { isEntryPoint } from '../src/lib/cli.js';
import { openApiDocument } from '../src/lib/openapi.js';
import { renderResearch } from '../src/lib/research.js';
import { ROUTES } from '../src/routes/index.js';
import { API_VERSION } from '../src/version.js';

/** Export portable, formatted contract/report snapshots without starting a server. */
export async function exportDocs(directory: string, entry: boolean): Promise<void> {
  if (!entry) return;
  const options = JSON.parse(
    readFileSync(new URL('../.prettierrc.json', import.meta.url), 'utf8'),
  ) as Options;
  const documents = [
    [
      'openapi.json',
      await format(JSON.stringify(openApiDocument(ROUTES, '/', API_VERSION)), { ...options, parser: 'json' }),
    ],
    ['research.html', await format(renderResearch(API_VERSION), { ...options, parser: 'html' })],
  ] as const;
  mkdirSync(directory, { recursive: true });
  for (const [name, body] of documents) writeFileSync(join(directory, name), body, 'utf8');
}

await exportDocs('docs', isEntryPoint(import.meta.url, process.argv[1]));
