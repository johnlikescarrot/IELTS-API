import type { FastifyInstance } from "fastify";
import { getIdiomById, searchIdioms } from "../data/idioms.js";
import { optionalString } from "../lib/params.js";
import { registerResource } from "../lib/register-resource.js";

export default async function idiomRoutes(app: FastifyInstance): Promise<void> {
  registerResource(
    app,
    "/api/v1/idioms",
    (params) => {
      const results = searchIdioms(params.q ?? "");
      const topic = optionalString(params.topic);
      if (topic !== undefined) {
        return results.filter((idiom) => idiom.topicId === topic);
      }
      return results;
    },
    getIdiomById,
  );
}
