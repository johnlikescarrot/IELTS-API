import { WRITING_PROMPTS, WRITING_TYPES } from "../data/index.ts";
import type { WritingPrompt } from "../types.ts";
import { ApiError } from "../lib/errors.ts";
import {
  activeFilters,
  getOptionalEnumParam,
  getRangeParam,
  getStringParam,
} from "../lib/validate.ts";
import { paginate } from "../lib/paginate.ts";
import { getParam, type Route } from "../lib/router.ts";
import { sampleSeeded } from "../lib/random.ts";
import { matchesAllTokens } from "../lib/search.ts";
import { todaySeed } from "./vocabulary.ts";

const MODULES = ["academic", "general"] as const;
const TASKS = ["1", "2"] as const;

const FILTER_PARAMS = ["module", "task", "type", "q"] as const;

function filterWriting(query: URLSearchParams): readonly WritingPrompt[] {
  let items: readonly WritingPrompt[] = WRITING_PROMPTS;
  const module = getOptionalEnumParam(query, "module", MODULES);
  if (module !== undefined) {
    items = items.filter((prompt) => prompt.module === module);
  }
  const task = getOptionalEnumParam(query, "task", TASKS);
  if (task !== undefined) {
    items = items.filter((prompt) => String(prompt.task) === task);
  }
  const type = getOptionalEnumParam(query, "type", WRITING_TYPES);
  if (type !== undefined) {
    items = items.filter((prompt) => prompt.type === type);
  }
  const search = getStringParam(query, "q");
  if (search !== undefined) {
    items = items.filter((prompt) => matchesAllTokens([prompt.prompt, prompt.type], search));
  }
  return items;
}

/** List writing prompts with module, task, type and text filters. */
export const writingListRoute: Route = {
  method: "GET",
  path: "/v1/writing",
  summary: "List academic and general training writing prompts.",
  handler: (ctx) => {
    const page = getRangeParam(ctx.query, "page", 1, 1, 1_000_000);
    const perPage = getRangeParam(ctx.query, "per_page", 20, 1, 100);
    const filtered = filterWriting(ctx.query);
    const sorted = [...filtered].sort((a, b) => a.id.localeCompare(b.id));
    const { data, meta } = paginate(
      sorted,
      page,
      perPage,
      "/v1/writing",
      activeFilters(ctx.query, FILTER_PARAMS),
    );
    return { status: 200, body: { data, meta }, cacheable: true };
  },
};

/** Deterministic random writing prompt. */
export const writingRandomRoute: Route = {
  method: "GET",
  path: "/v1/writing/random",
  summary: "Sample writing prompts deterministically; the seed defaults to today's date.",
  handler: (ctx) => {
    const count = getRangeParam(ctx.query, "count", 1, 1, 30);
    const seed = getStringParam(ctx.query, "seed") ?? todaySeed();
    const filtered = filterWriting(ctx.query);
    const data = sampleSeeded(filtered, count, seed);
    return {
      status: 200,
      cacheable: true,
      body: { data, meta: { seed, count: data.length, available: filtered.length } },
    };
  },
};

/** One writing prompt by id, e.g. w001. */
export const writingPromptRoute: Route = {
  method: "GET",
  path: "/v1/writing/:id",
  summary: "Fetch one writing prompt by its id.",
  handler: (ctx) => {
    const id = getParam(ctx, "id");
    const found = WRITING_PROMPTS.find((prompt) => prompt.id === id);
    if (found === undefined) {
      throw new ApiError(
        404,
        "not_found",
        `No writing prompt matches '${id}'. List ids with GET /v1/writing.`,
      );
    }
    return { status: 200, body: { data: found }, cacheable: true };
  },
};
