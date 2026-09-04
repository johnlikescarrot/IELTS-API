import type { FastifyInstance } from "fastify";
import { getSynonymById, searchSynonyms } from "../data/synonyms.js";
import { registerResource } from "../lib/register-resource.js";

export default async function synonymsRoutes(app: FastifyInstance): Promise<void> {
  registerResource(
    app,
    "/api/v1/synonyms",
    (params) => searchSynonyms(params.q ?? ""),
    getSynonymById,
  );
}
