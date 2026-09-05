/**
 * The live route table.
 *
 * Registration order matters: literal paths must come before parameterised
 * ones, because {@link matchRoute} returns the first match.
 */

import { bandRoutes } from './bands.js';
import { corpusRoutes } from './corpus.js';
import { createMetaRoutes } from './meta.js';
import { paraphraseRoutes } from './paraphrases.js';
import { questionTypeRoutes } from './questionTypes.js';
import { resourceRoutes } from './resources.js';
import { scenarioRoutes } from './scenarios.js';
import { scoreRoutes } from './scores.js';
import { speakingBankRoutes } from './speakingBank.js';
import { testRoutes } from './tests.js';
import { topicRoutes } from './topics.js';
import { vocabularyRoutes } from './vocabulary.js';
import { writingRecallRoutes } from './writingRecall.js';

import type { RouteDefinition } from '../lib/route.js';

/** Domain routes (all versioned under `/v1`). */
export const DOMAIN_ROUTES: readonly RouteDefinition[] = [
  ...vocabularyRoutes,
  ...bandRoutes,
  ...scoreRoutes,
  ...topicRoutes,
  ...questionTypeRoutes,
  ...testRoutes,
  ...corpusRoutes,
  ...resourceRoutes,
  ...paraphraseRoutes,
  ...scenarioRoutes,
  ...writingRecallRoutes,
  ...speakingBankRoutes,
];

/** Every route served by the API. */
export const ROUTES: readonly RouteDefinition[] = [...DOMAIN_ROUTES, ...createMetaRoutes(DOMAIN_ROUTES)];
