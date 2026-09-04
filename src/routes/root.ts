import type { Route } from "../lib/router.ts";
import { API_NAME, VERSION } from "../version.ts";

/**
 * Build the API index route. It receives the full route table so the listing
 * can never drift from the routes actually registered.
 */
export function createRootRoute(listedRoutes: readonly Route[]): Route {
  return {
    method: "GET",
    path: "/",
    summary: "API index: discover every endpoint.",
    handler: () => ({
      status: 200,
      cacheable: true,
      body: {
        data: {
          name: API_NAME,
          version: VERSION,
          description:
            "A free, open, no-authentication REST API for IELTS study data: vocabulary, speaking, writing, mistakes, band descriptors and a band-score calculator.",
          license: "MIT",
          authentication: "none",
          rateLimit: "none",
          documentation: {
            openapi: "/openapi.json",
            health: "/health",
            citation: "/v1/citation",
          },
          endpoints: listedRoutes.map((route) => ({
            method: route.method,
            path: route.path,
            summary: route.summary,
          })),
        },
      },
    }),
  };
}
