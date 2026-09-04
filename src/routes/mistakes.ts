import { COMMON_MISTAKES, MISTAKE_CATEGORIES } from "../data/index.ts";
import type { CommonMistake } from "../types.ts";
import {
  activeFilters,
  getEnumParam,
  getOptionalEnumParam,
  getRangeParam,
  getStringParam,
} from "../lib/validate.ts";
import { paginate, sortItems } from "../lib/paginate.ts";
import type { Route } from "../lib/router.ts";
import { matchesAllTokens } from "../lib/search.ts";

const SORT_FIELDS = ["id", "category"] as const;
type SortField = (typeof SORT_FIELDS)[number];

const ORDERS = ["asc", "desc"] as const;

const FILTER_PARAMS = ["category", "q"] as const;

const COMPARATORS: Record<SortField, (a: CommonMistake, b: CommonMistake) => number> = {
  id: (a, b) => a.id - b.id,
  category: (a, b) => a.category.localeCompare(b.category) || a.id - b.id,
};

/** List common learner mistakes with category filter and text search. */
export const mistakesListRoute: Route = {
  method: "GET",
  path: "/v1/mistakes",
  summary: "List common learner mistakes with corrections and explanations.",
  handler: (ctx) => {
    const page = getRangeParam(ctx.query, "page", 1, 1, 1_000_000);
    const perPage = getRangeParam(ctx.query, "per_page", 20, 1, 100);
    const sort = getEnumParam(ctx.query, "sort", SORT_FIELDS, "id");
    const order = getEnumParam(ctx.query, "order", ORDERS, "asc");
    const category = getOptionalEnumParam(ctx.query, "category", MISTAKE_CATEGORIES);
    const search = getStringParam(ctx.query, "q");

    let items: readonly CommonMistake[] = COMMON_MISTAKES;
    if (category !== undefined) {
      items = items.filter((mistake) => mistake.category === category);
    }
    if (search !== undefined) {
      items = items.filter((mistake) =>
        matchesAllTokens(
          [mistake.incorrect, mistake.correct, mistake.explanation, mistake.category],
          search,
        ),
      );
    }
    const sorted = sortItems(items, sort, order, COMPARATORS);
    const { data, meta } = paginate(
      sorted,
      page,
      perPage,
      "/v1/mistakes",
      activeFilters(ctx.query, FILTER_PARAMS),
    );
    return { status: 200, body: { data, meta }, cacheable: true };
  },
};
