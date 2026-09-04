import type { FastifyInstance } from "fastify";

export default async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/v1/health", async () => ({
    status: "ok",
    version: "1.0.0",
    uptime: process.uptime(),
  }));
}
