import type { Route } from "../lib/router.ts";
import { VERSION } from "../version.ts";

/** Liveness and version information. */
export const healthRoute: Route = {
  method: "GET",
  path: "/health",
  summary: "Liveness check with version and uptime.",
  handler: () => ({
    status: 200,
    cacheable: false,
    body: {
      data: {
        status: "ok",
        version: VERSION,
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      },
    },
  }),
};
