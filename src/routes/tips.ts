import type { FastifyInstance } from "fastify";
import { getTipById, searchTips } from "../data/tips.js";
import { optionalString } from "../lib/params.js";
import { registerResource } from "../lib/register-resource.js";

export default async function tipsRoutes(app: FastifyInstance): Promise<void> {
  registerResource(
    app,
    "/api/v1/tips",
    (params) => {
      const results = searchTips(params.q ?? "");
      const skill = optionalString(params.skill);
      if (skill !== undefined) {
        return results.filter((tip) => tip.skill === skill);
      }
      return results;
    },
    getTipById,
  );
}
