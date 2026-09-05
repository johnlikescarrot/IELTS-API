/** Regenerate offline contract and citation artifacts without starting a server. */
import { writeFileSync } from 'node:fs';
import { openApiDocument } from './lib/openapi.js';
import { renderCitationBibtex, renderResearchMarkdown } from './lib/research.js';
import { ROUTES } from './routes/index.js';
import { API_VERSION } from './version.js';

writeFileSync('docs/openapi.json', `${JSON.stringify(openApiDocument(ROUTES, '/', API_VERSION), null, 2)}\n`);
writeFileSync('docs/citation.bib', renderCitationBibtex());
writeFileSync('paper/practice-metadata.md', renderResearchMarkdown());
