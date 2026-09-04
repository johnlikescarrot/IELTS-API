import type { FastifyInstance } from "fastify";
import { getMistakeById, searchMistakes } from "../data/common-mistakes.js";
import { registerResource } from "../lib/register-resource.js";

export default async function mistakesRoutes(app: FastifyInstance): Promise<void> {
  registerResource(
    app,
    "/api/v1/mistakes",
    (params) => searchMistakes(params.q ?? ""),
    getMistakeById,
  );
}
