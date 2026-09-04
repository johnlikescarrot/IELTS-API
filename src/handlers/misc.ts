/**
 * Root, health, and meta endpoints.
 */

import type { RequestContext, Route } from "../router.js";
import { route } from "../router.js";
import { sendJson } from "../http.js";
import {
  API_NAME,
  CITATION_APA,
  CITATION_BIBTEX,
  DESCRIPTION,
  DISCLAIMER,
  HOMEPAGE,
  LICENSE,
  PROVENANCE,
  RELEASE_DATE,
  VERSION,
} from "../meta.js";
import { datasetCounts } from "../data/index.js";
// The full route table is read lazily (inside handlers), so the harmless
// routes.ts <-> handlers module cycle never runs at initialisation time.
import { apiRoutes } from "../routes.js";

function directory(
  routes: readonly Route[],
): { method: string; path: string; summary: string }[] {
  return routes.map((r) => ({
    method: r.method,
    path: r.path,
    summary: r.summary,
  }));
}

function handleRoot({ res }: RequestContext): void {
  sendJson(res, 200, {
    data: {
      name: API_NAME,
      version: VERSION,
      description: DESCRIPTION,
      free: true,
      authentication: "none",
      rateLimit: "none",
      license: LICENSE,
      homepage: HOMEPAGE,
      docs: "/docs",
      openapi: "/openapi.json",
      api: "/v1",
      health: "/health",
      citation: { apa: CITATION_APA, bibtex: CITATION_BIBTEX },
      provenance: PROVENANCE,
      disclaimer: DISCLAIMER,
      endpoints: directory(apiRoutes),
    },
  });
}

function handleV1({ res }: RequestContext): void {
  sendJson(res, 200, {
    data: {
      version: "v1",
      status: "stable",
      endpoints: directory(apiRoutes).filter((e) => e.path.startsWith("/v1")),
    },
  });
}

function handleHealth({ res }: RequestContext): void {
  sendJson(res, 200, {
    status: "ok",
    service: API_NAME,
    version: VERSION,
    uptimeSeconds: Math.floor(process.uptime()),
  });
}

function handleMeta({ res }: RequestContext): void {
  sendJson(res, 200, {
    data: {
      name: API_NAME,
      version: VERSION,
      releaseDate: RELEASE_DATE,
      license: LICENSE,
      homepage: HOMEPAGE,
      counts: datasetCounts,
      citation: { apa: CITATION_APA, bibtex: CITATION_BIBTEX },
      provenance: PROVENANCE,
      disclaimer: DISCLAIMER,
    },
  });
}

export const miscRoutes: readonly Route[] = [
  route("GET", "/", "Service directory", handleRoot),
  route("GET", "/v1", "Version directory (v1)", handleV1),
  route("GET", "/health", "Liveness probe", handleHealth),
  route(
    "GET",
    "/v1/meta",
    "Dataset counts, citation, and provenance",
    handleMeta,
  ),
];
