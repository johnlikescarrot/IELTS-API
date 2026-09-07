/** Regenerate the archive from the same route table served at runtime. */
import { writeFileSync } from 'node:fs';
import { API_VERSION, openApiDocument, ROUTES } from '../dist/index.js';

writeFileSync(
  new URL('../docs/openapi.json', import.meta.url),
  `${JSON.stringify(openApiDocument(ROUTES, '/', API_VERSION), null, 2)}\n`,
);
