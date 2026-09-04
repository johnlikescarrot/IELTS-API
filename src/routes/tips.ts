import { STUDY_TIPS, TIP_SKILLS } from "../data/index.ts";
import { activeFilters, getOptionalEnumParam, getRangeParam } from "../lib/validate.ts";
import { paginate } from "../lib/paginate.ts";
import type { Route } from "../lib/router.ts";

const FILTER_PARAMS = ["skill"] as const;

/** Study tips, optionally filtered by skill. */
export const tipsRoute: Route = {
  method: "GET",
  path: "/v1/tips",
  summary: "List study tips for listening, reading, writing, speaking and general strategy.",
  handler: (ctx) => {
    const page = getRangeParam(ctx.query, "page", 1, 1, 1_000_000);
    const perPage = getRangeParam(ctx.query, "per_page", 20, 1, 100);
    const skill = getOptionalEnumParam(ctx.query, "skill", TIP_SKILLS);
    const filtered =
      skill === undefined ? STUDY_TIPS : STUDY_TIPS.filter((tip) => tip.skill === skill);
    const { data, meta } = paginate(
      filtered,
      page,
      perPage,
      "/v1/tips",
      activeFilters(ctx.query, FILTER_PARAMS),
    );
    return { status: 200, body: { data, meta }, cacheable: true };
  },
};
