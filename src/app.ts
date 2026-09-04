/**
 * Library entry point: everything an embedder needs to run or inspect
 * IELTS-API programmatically.
 */

export { createApp, startServer, resolvePort, applyCors } from "./server.js";
export { apiRoutes } from "./routes.js";
export type { Route, RequestContext, Handler, HttpMethod } from "./router.js";
export { ApiError, sendJson, sendError } from "./http.js";
export {
  API_NAME,
  VERSION,
  RELEASE_DATE,
  LICENSE,
  HOMEPAGE,
  DESCRIPTION,
  CITATION_APA,
  CITATION_BIBTEX,
  PROVENANCE,
  DISCLAIMER,
} from "./meta.js";
export { RAW_SCORE_TABLES, rawToBand, overallBand } from "./lib/band.js";
