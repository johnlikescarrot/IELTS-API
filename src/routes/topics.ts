import type { FastifyInstance } from "fastify";
import { getTopicById, topics } from "../data/topics.js";
import { getVocabularyByTopic } from "../data/vocabulary.js";
import { registerResource } from "../lib/register-resource.js";

export default async function topicsRoutes(app: FastifyInstance): Promise<void> {
  registerResource(app, "/api/v1/topics", () => topics, getTopicById);

  app.get("/api/v1/topics/:id/vocabulary", async (request, reply) => {
    const { id } = request.params as { id: string };
    const topic = getTopicById(id);
    if (topic === undefined) {
      return reply.code(404).send({ error: `Topic '${id}' not found` });
    }
    return getVocabularyByTopic(id);
  });
}
