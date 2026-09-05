/**
 * The live route table.
 *
 * Registration order matters: literal paths must come before parameterised
 * ones, because {@link matchRoute} returns the first match.
 */

import { archiveRoutes } from './archive.js';
import { bandRoutes } from './bands.js';
import { corpusRoutes } from './corpus.js';
import { frameworkRoutes } from './frameworks.js';
import { materialRoutes } from './materials.js';
import { createMetaRoutes } from './meta.js';
import { questionTypeRoutes } from './questionTypes.js';
import { resourceRoutes } from './resources.js';
import { scoreRoutes } from './scores.js';
import { studyRoutes } from './study.js';
import { testRoutes } from './tests.js';
import { toolRoutes } from './tools.js';
import { topicRoutes } from './topics.js';
import { vocabularyRoutes } from './vocabulary.js';

import type { RouteDefinition } from '../lib/route.js';

/** Domain routes (all versioned under `/v1`). */
export const DOMAIN_ROUTES: readonly RouteDefinition[] = [
  ...vocabularyRoutes,
  ...bandRoutes,
  ...scoreRoutes,
  ...topicRoutes,
  ...questionTypeRoutes,
  ...frameworkRoutes,
  ...testRoutes,
  ...corpusRoutes,
  ...toolRoutes,
  ...studyRoutes,
  ...materialRoutes,
  ...archiveRoutes,
  ...resourceRoutes,
];

/** Every route served by the API. */
export const ROUTES: readonly RouteDefinition[] = [...DOMAIN_ROUTES, ...createMetaRoutes(DOMAIN_ROUTES)];
