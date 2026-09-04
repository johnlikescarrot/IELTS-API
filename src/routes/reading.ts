import type { FastifyInstance } from "fastify";
import { getReadingQuestionTypeById, searchReadingQuestionTypes } from "../data/reading.js";
import { registerResource } from "../lib/register-resource.js";

export default async function readingRoutes(app: FastifyInstance): Promise<void> {
  registerResource(
    app,
    "/api/v1/reading",
    (params) => searchReadingQuestionTypes(params.q ?? ""),
    getReadingQuestionTypeById,
  );
}
