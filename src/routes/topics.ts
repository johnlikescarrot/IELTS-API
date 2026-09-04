import { TOPICS, VOCABULARY } from "../data/index.ts";
import type { Route } from "../lib/router.ts";

/** Vocabulary topics with entry counts, derived from the corpus. */
export const topicsRoute: Route = {
  method: "GET",
  path: "/v1/topics",
  summary: "List vocabulary topics with entry counts.",
  handler: () => {
    const data = TOPICS.map((topic) => ({
      topic,
      vocabularyCount: VOCABULARY.filter((entry) => entry.topics.includes(topic)).length,
    }));
    return { status: 200, cacheable: true, body: { data, meta: { total: data.length } } };
  },
};
