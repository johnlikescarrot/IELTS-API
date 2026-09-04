import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";

import { buildOpenApi } from "./openapi.js";
import bandDescriptorRoutes from "./routes/band-descriptors.js";
import healthRoutes from "./routes/health.js";
import idiomRoutes from "./routes/idioms.js";
import mistakesRoutes from "./routes/mistakes.js";
import readingRoutes from "./routes/reading.js";
import speakingRoutes from "./routes/speaking.js";
import synonymsRoutes from "./routes/synonyms.js";
import tipsRoutes from "./routes/tips.js";
import topicsRoutes from "./routes/topics.js";
import vocabularyRoutes from "./routes/vocabulary.js";
import writingRoutes from "./routes/writing.js";

export interface BuildAppOptions {
  /** Enable fastify's pino logger. Disabled by default for clean tests. */
  logger?: boolean;
}

/** The version served to clients. Keep in sync with package.json. */
export const API_VERSION = "1.0.0";

const ENDPOINTS = [
  "/api/v1/health",
  "/api/v1/topics",
  "/api/v1/topics/:id",
  "/api/v1/topics/:id/vocabulary",
  "/api/v1/vocabulary",
  "/api/v1/vocabulary/:id",
  "/api/v1/synonyms",
  "/api/v1/synonyms/:id",
  "/api/v1/band-descriptors",
  "/api/v1/band-descriptors/:id",
  "/api/v1/writing",
  "/api/v1/writing/:id",
  "/api/v1/speaking",
  "/api/v1/speaking/parts",
  "/api/v1/speaking/parts/:id",
  "/api/v1/speaking/cue-cards",
  "/api/v1/speaking/cue-cards/:id",
  "/api/v1/reading",
  "/api/v1/reading/:id",
  "/api/v1/idioms",
  "/api/v1/idioms/:id",
  "/api/v1/mistakes",
  "/api/v1/mistakes/:id",
  "/api/v1/tips",
  "/api/v1/tips/:id",
];

/**
 * Build a fully-configured Fastify instance. This is the heart of the API and
 * is intentionally separated from the entrypoint so it can be tested in
 * isolation with `app.inject`.
 */
export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? false,
    trustProxy: true,
  });

  await app.register(cors, { origin: "*" });
  await app.register(rateLimit, { max: 1000, timeWindow: "1 minute" });

  app.get("/", async () => ({
    name: "IELTS API",
    version: API_VERSION,
    description:
      "A free, open-source, no-authentication API for IELTS study content. Explore vocabulary, synonyms, band descriptors, writing tasks, speaking practice, reading question types, idioms, common mistakes and exam tips.",
    docs: "/openapi.json",
    health: "/api/v1/health",
    endpoints: ENDPOINTS,
  }));

  app.get("/openapi.json", async () => buildOpenApi());

  await app.register(healthRoutes);
  await app.register(topicsRoutes);
  await app.register(vocabularyRoutes);
  await app.register(synonymsRoutes);
  await app.register(bandDescriptorRoutes);
  await app.register(writingRoutes);
  await app.register(speakingRoutes);
  await app.register(readingRoutes);
  await app.register(idiomRoutes);
  await app.register(mistakesRoutes);
  await app.register(tipsRoutes);

  app.setNotFoundHandler(async (request, reply) => {
    reply.code(404).send({ error: `Route ${request.method} ${request.url} not found` });
  });

  return app;
}
