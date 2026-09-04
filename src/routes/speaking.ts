import type { FastifyInstance } from "fastify";
import {
  getCueCardById,
  getSpeakingPartById,
  searchSpeaking,
  speakingCueCards,
  speakingParts,
} from "../data/speaking.js";
import { optionalString } from "../lib/params.js";
import { registerResource } from "../lib/register-resource.js";

export default async function speakingRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/v1/speaking", async (request) => {
    const { q } = request.query as { q?: string };
    const result = searchSpeaking(q ?? "");
    return {
      total: result.parts.length + result.cueCards.length,
      parts: result.parts,
      cueCards: result.cueCards,
    };
  });

  registerResource(
    app,
    "/api/v1/speaking/parts",
    (params) => {
      const topic = optionalString(params.topic);
      if (topic !== undefined) {
        return speakingParts.filter((part) => part.topicId === topic);
      }
      return speakingParts;
    },
    getSpeakingPartById,
  );

  registerResource(
    app,
    "/api/v1/speaking/cue-cards",
    (params) => {
      const topic = optionalString(params.topic);
      if (topic !== undefined) {
        return speakingCueCards.filter((card) => card.topicId === topic);
      }
      return speakingCueCards;
    },
    getCueCardById,
  );
}
