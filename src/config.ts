import type { ServiceInfo } from "./lib/api/routes.js";

/**
 * Metadata about this service. Kept here (rather than in the entrypoint) so
 * tests and the HTTP bootstrap share a single source of truth.
 */
export const SERVICE_INFO: ServiceInfo = {
  name: "IELTS API",
  version: "0.1.0",
  description:
    "A free, open-source, no-authentication REST API for IELTS study: band " +
    "score calculation, exam structure reference, writing prompts, speaking " +
    "cue cards, academic vocabulary and reading question types.",
  homepage: "https://github.com/johnlikescarrot/IELTS-API",
  baseUrl: "https://ielts-api.fly.dev",
};
