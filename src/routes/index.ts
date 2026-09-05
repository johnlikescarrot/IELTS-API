/**
 * The live route table.
 *
 * Registration order matters: literal paths must come before parameterised
 * ones, because {@link matchRoute} returns the first match.
 */

import { analysisRoutes } from './analysis.js';
import { bandRoutes } from './bands.js';
import { corpusRoutes } from './corpus.js';
import { createMetaRoutes } from './meta.js';
import { practiceRoutes } from './practice.js';
import { resourceRoutes } from './resources.js';
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
  ...corpusRoutes,
  ...practiceRoutes,
  ...resourceRoutes,
  ...analysisRoutes,
];

/** Every route served by the API. */
export const ROUTES: readonly RouteDefinition[] = [...DOMAIN_ROUTES, ...createMetaRoutes(DOMAIN_ROUTES)];
