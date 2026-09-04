import type { FastifyInstance } from "fastify";
import { getWritingTaskById, getWritingTasks } from "../data/writing.js";
import { optionalString, optionalTask } from "../lib/params.js";
import { registerResource } from "../lib/register-resource.js";

export default async function writingRoutes(app: FastifyInstance): Promise<void> {
  registerResource(
    app,
    "/api/v1/writing",
    (params) => getWritingTasks(optionalTask(params.task), optionalString(params.topic)),
    getWritingTaskById,
  );
}
