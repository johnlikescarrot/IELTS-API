/**
 * The live route table.
 *
 * Registration order matters: literal paths must come before parameterised
 * ones, because {@link matchRoute} returns the first match.
 */

import { bandRoutes } from './bands.js';
import { catalogRoutes } from './catalog.js';
import { corpusRoutes } from './corpus.js';
import { createMetaRoutes } from './meta.js';
import { questionTypeRoutes } from './question-types.js';
import { resourceRoutes } from './resources.js';
import { scoreRoutes } from './scores.js';
import { skillRoutes } from './skills.js';
import { topicRoutes } from './topics.js';
import { vocabularyRoutes } from './vocabulary.js';

import type { RouteDefinition } from '../lib/route.js';

/** Domain routes (all versioned under `/v1`). */
export const DOMAIN_ROUTES: readonly RouteDefinition[] = [
  ...skillRoutes,
  ...vocabularyRoutes,
  ...bandRoutes,
  ...scoreRoutes,
  ...topicRoutes,
  ...questionTypeRoutes,
  ...catalogRoutes,
  ...corpusRoutes,
  ...resourceRoutes,
];

/** Every route served by the API. */
export const ROUTES: readonly RouteDefinition[] = [...DOMAIN_ROUTES, ...createMetaRoutes(DOMAIN_ROUTES)];
