/**
 * Speaking endpoints: Part 1 topics, Part 2 cue cards, Part 3 discussions.
 */

import type { RequestContext, Route } from "../router.js";
import { route } from "../router.js";
import { notFound, sendJson } from "../http.js";
import {
  paginate,
  parseOptionalInt,
  parsePagination,
} from "../lib/pagination.js";
import { findById, parseEnumOption, textMatches } from "../lib/collections.js";
import type { SpeakingItem } from "../types.js";
import { speakingItems, speakingTopics } from "../data/index.js";

function listSpeaking(ctx: RequestContext): void {
  const { query, res } = ctx;
  const part = parseOptionalInt(query.get("part"), "part", 1, 3);
  const topic = parseEnumOption(query.get("topic"), speakingTopics, "topic");
  const q = query.get("q");

  let items: readonly SpeakingItem[] = speakingItems;
  if (part !== null) {
    items = items.filter((item) => item.part === part);
  }
  if (topic !== null) {
    items = items.filter((item) => item.topic === topic);
  }
  if (q !== null) {
    items = items.filter((item) => {
      const fields = speakingText(item);
      return textMatches(fields, q);
    });
  }

  const { page, limit } = parsePagination(query);
  sendJson(res, 200, paginate<SpeakingItem>(items, page, limit));
}

function speakingText(item: SpeakingItem): readonly string[] {
  const base = [item.topic];
  if (item.part === 2) {
    return [...base, item.prompt, item.sampleAnswer];
  }
  return [...base, ...item.questions];
}

function getSpeakingItem({ res, params }: RequestContext): void {
  const item = findById(speakingItems, params.id as string);
  if (item === undefined) {
    throw notFound(`Speaking item '${params.id as string}' not found`);
  }
  sendJson(res, 200, { data: item });
}

function listTopics({ res }: RequestContext): void {
  sendJson(res, 200, { data: speakingTopics, count: speakingTopics.length });
}

export const speakingRoutes: readonly Route[] = [
  route(
    "GET",
    "/v1/speaking",
    "Browse the speaking question bank",
    listSpeaking,
  ),
  route("GET", "/v1/speaking/topics", "List speaking topics", listTopics),
  route("GET", "/v1/speaking/:id", "Get one speaking item", getSpeakingItem),
];
