import type { Route } from "../lib/router.ts";
import { OPENAPI_DOCUMENT } from "../openapi.ts";
import { bandDescriptorsRoute } from "./descriptors.ts";
import { bandScoreCalculateRoute, bandScoreRulesRoute } from "./band-score.ts";
import { citationRoute } from "./citation.ts";
import { healthRoute } from "./health.ts";
import { mistakesListRoute } from "./mistakes.ts";
import { createRootRoute } from "./root.ts";
import { speakingListRoute, speakingRandomRoute, speakingTopicRoute } from "./speaking.ts";
import { tipsRoute } from "./tips.ts";
import { vocabularyEntryRoute, vocabularyListRoute, vocabularyRandomRoute } from "./vocabulary.ts";
import { topicsRoute } from "./topics.ts";
import { writingListRoute, writingPromptRoute, writingRandomRoute } from "./writing.ts";

/** Route order matters: static paths must precede their :param siblings. */
const apiRoutes: readonly Route[] = [
  healthRoute,
  vocabularyListRoute,
  vocabularyRandomRoute,
  vocabularyEntryRoute,
  topicsRoute,
  speakingListRoute,
  speakingRandomRoute,
  speakingTopicRoute,
  writingListRoute,
  writingRandomRoute,
  writingPromptRoute,
  mistakesListRoute,
  bandDescriptorsRoute,
  bandScoreRulesRoute,
  bandScoreCalculateRoute,
  tipsRoute,
  citationRoute,
  {
    method: "GET",
    path: "/openapi.json",
    summary: "The OpenAPI 3.1 document for this API.",
    handler: () => ({ status: 200, cacheable: true, body: OPENAPI_DOCUMENT }),
  },
];

export const routes: readonly Route[] = [createRootRoute(apiRoutes), ...apiRoutes];
