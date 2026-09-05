import { writeFileSync } from 'node:fs';

import { openApiDocument } from '../src/lib/openapi.js';
import { DOMAIN_ROUTES } from '../src/routes/index.js';
import { API_VERSION } from '../src/version.js';

writeFileSync(
  new URL('../docs/openapi.json', import.meta.url),
  `${JSON.stringify(openApiDocument(DOMAIN_ROUTES, '/', API_VERSION), null, 2)}\n`,
  'utf8',
);
