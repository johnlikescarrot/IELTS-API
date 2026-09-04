/**
 * The complete production route table.
 *
 * Order matters: static segments are registered before parameterised ones
 * (e.g. `/v1/words/topics` before `/v1/words/:id`).
 */

import type { Route } from "./router.js";
import { miscRoutes } from "./handlers/misc.js";
import { wordRoutes } from "./handlers/words.js";
import { practiceRoutes } from "./handlers/practice.js";
import { writingRoutes } from "./handlers/writing.js";
import { speakingRoutes } from "./handlers/speaking.js";
import { tipRoutes } from "./handlers/tips.js";
import { bandRoutes } from "./handlers/bands.js";
import { docRoutes } from "./handlers/docs.js";

export const apiRoutes: readonly Route[] = [
  ...miscRoutes,
  ...wordRoutes,
  ...practiceRoutes,
  ...writingRoutes,
  ...speakingRoutes,
  ...tipRoutes,
  ...bandRoutes,
  ...docRoutes,
];
