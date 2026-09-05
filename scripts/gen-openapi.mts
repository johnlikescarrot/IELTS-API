import { writeFileSync } from 'node:fs';
import { openApiDocument } from '../src/lib/openapi.js';
import { ROUTES } from '../src/routes/index.js';
import { API_VERSION } from '../src/version.js';

const doc = openApiDocument(ROUTES, 'http://127.0.0.1:4011/', API_VERSION);
writeFileSync(new URL('../docs/openapi.json', import.meta.url), `${JSON.stringify(doc, null, 2)}\n`);
console.log(
  'openapi.json regenerated:',
  Object.keys((doc as { paths: Record<string, unknown> }).paths).length,
  'paths, version',
  API_VERSION,
);
