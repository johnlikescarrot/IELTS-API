import type { FastifyInstance } from "fastify";
import { getVocabularyById, searchVocabulary } from "../data/vocabulary.js";
import { optionalString } from "../lib/params.js";
import { registerResource } from "../lib/register-resource.js";

export default async function vocabularyRoutes(app: FastifyInstance): Promise<void> {
  registerResource(
    app,
    "/api/v1/vocabulary",
    (params) => {
      const results = searchVocabulary(params.q ?? "");
      const topic = optionalString(params.topic);
      if (topic !== undefined) {
        return results.filter((entry) => entry.topicId === topic);
      }
      return results;
    },
    getVocabularyById,
  );
}
