import { SPEAKING_TOPICS } from "../data/index.ts";
import { ApiError } from "../lib/errors.ts";
import { getRangeParam, getStringParam } from "../lib/validate.ts";
import { paginate } from "../lib/paginate.ts";
import { getParam, type Route } from "../lib/router.ts";
import { sampleSeeded } from "../lib/random.ts";
import { todaySeed } from "./vocabulary.ts";

/** List speaking topics with pagination. */
export const speakingListRoute: Route = {
  method: "GET",
  path: "/v1/speaking",
  summary: "List IELTS Speaking topics (Parts 1, 2 and 3).",
  handler: (ctx) => {
    const page = getRangeParam(ctx.query, "page", 1, 1, 1_000_000);
    const perPage = getRangeParam(ctx.query, "per_page", 20, 1, 100);
    const { data, meta } = paginate(SPEAKING_TOPICS, page, perPage, "/v1/speaking");
    return { status: 200, body: { data, meta }, cacheable: true };
  },
};

/** Deterministic random speaking topic. */
export const speakingRandomRoute: Route = {
  method: "GET",
  path: "/v1/speaking/random",
  summary: "Sample speaking topics deterministically; the seed defaults to today's date.",
  handler: (ctx) => {
    const count = getRangeParam(ctx.query, "count", 1, 1, 10);
    const seed = getStringParam(ctx.query, "seed") ?? todaySeed();
    const data = sampleSeeded(SPEAKING_TOPICS, count, seed);
    return {
      status: 200,
      cacheable: true,
      body: { data, meta: { seed, count: data.length, available: SPEAKING_TOPICS.length } },
    };
  },
};

/** One full speaking topic (Part 1 questions, Part 2 cue card, Part 3). */
export const speakingTopicRoute: Route = {
  method: "GET",
  path: "/v1/speaking/:id",
  summary: "Fetch one speaking topic by its slug id.",
  handler: (ctx) => {
    const id = getParam(ctx, "id");
    const found = SPEAKING_TOPICS.find((topic) => topic.id === id);
    if (found === undefined) {
      throw new ApiError(
        404,
        "not_found",
        `No speaking topic matches '${id}'. List ids with GET /v1/speaking.`,
      );
    }
    return { status: 200, body: { data: found }, cacheable: true };
  },
};
