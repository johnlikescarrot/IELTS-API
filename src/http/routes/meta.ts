/**
 * Service metadata, health and citation endpoints.
 *
 * @packageDocumentation
 */

import {
  API_VERSION,
  CITATION,
  LICENSE,
  REFERENCES,
  REPOSITORY,
  SERVICE_NAME,
  VERSION,
} from "../../meta.ts";
import { json, collection } from "../respond.ts";
import type { RouteDefinition } from "../route.ts";

/** Routes describing the service itself. */
export const metaRoutes: readonly RouteDefinition[] = [
  {
    method: "GET",
    path: "/health",
    operationId: "getHealth",
    summary: "Liveness probe",
    description:
      "Returns a constant payload indicating that the service is able to answer requests. The response contains no timestamps so that it is byte-identical between calls.",
    tags: ["service"],
    responseSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["ok"] },
        version: { type: "string" },
      },
      required: ["status", "version"],
    },
    handler: () => json({ status: "ok", version: VERSION }),
  },
  {
    method: "GET",
    path: "/v1/meta",
    operationId: "getMeta",
    summary: "Service metadata",
    description:
      "Describes the service: name, released version, API version, licence, source repository and the fact that no authentication is required.",
    tags: ["service"],
    handler: () =>
      json({
        name: SERVICE_NAME,
        version: VERSION,
        apiVersion: API_VERSION,
        license: LICENSE,
        repository: REPOSITORY,
        authentication: {
          required: false,
          scheme: null,
          note: "This API is free to use and never requires an API key, token or account.",
        },
        rateLimit: {
          enforced: false,
          note: "The reference implementation applies no rate limiting; deployments may add their own.",
        },
        determinism: {
          deterministic: true,
          note: "Responses depend only on the request. Random selections are seeded and the seed is echoed in the response metadata.",
        },
      }),
  },
  {
    method: "GET",
    path: "/v1/citation",
    operationId: "getCitation",
    summary: "How to cite this software",
    description:
      "Returns structured citation metadata for the running version, including a ready-to-paste BibTeX entry and the scholarly sources behind the bundled datasets and formulas.",
    tags: ["service"],
    handler: () => json(CITATION),
  },
  {
    method: "GET",
    path: "/v1/references",
    operationId: "listReferences",
    summary: "Bibliography of the bundled datasets and formulas",
    description:
      "Lists every published source that the API's data and algorithms are derived from.",
    tags: ["service"],
    handler: () => collection(REFERENCES),
  },
];
