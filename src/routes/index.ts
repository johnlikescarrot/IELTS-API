/**
 * The live route table.
 *
 * Registration order matters: literal paths must come before parameterised
 * ones, because {@link matchRoute} returns the first match.
 */

import { bandRoutes } from './bands.js';
import { citationRoutes } from './citation.js';
import { corpusRoutes } from './corpus.js';
import { formatRoutes } from './format.js';
import { createMetaRoutes } from './meta.js';
import { questionRoutes } from './questions.js';
import { resourceRoutes } from './resources.js';
import { createScholarRoutes } from './scholar.js';
import { scoreRoutes } from './scores.js';
import { topicRoutes } from './topics.js';
import { vocabularyRoutes } from './vocabulary.js';

import type { RouteDefinition } from '../lib/route.js';

/** Domain routes (all versioned under `/v1`). */
export const DOMAIN_ROUTES: readonly RouteDefinition[] = [
  ...vocabularyRoutes,
  ...bandRoutes,
  ...scoreRoutes,
  ...topicRoutes,
  ...questionRoutes,
  ...formatRoutes,
  ...corpusRoutes,
  ...resourceRoutes,
  ...citationRoutes,
];

/**
 * Scholarly discovery routes (`/paper`, `/paper.pdf`, `/robots.txt`,
 * `/sitemap.xml`). They are counted against the domain routes so the paper can
 * quote the size of the API without a circular import.
 */
export const SCHOLAR_ROUTES: readonly RouteDefinition[] = createScholarRoutes(DOMAIN_ROUTES.length);

/** Every route served by the API. */
export const ROUTES: readonly RouteDefinition[] = [
  ...DOMAIN_ROUTES,
  ...SCHOLAR_ROUTES,
  ...createMetaRoutes(DOMAIN_ROUTES, Date.now(), SCHOLAR_ROUTES),
];
