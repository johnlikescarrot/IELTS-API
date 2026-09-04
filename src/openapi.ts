/**
 * OpenAPI 3.1 document builder. The document is generated from the live
 * route table (passed in by the caller) so the spec can never drift from
 * the implementation; the docs test asserts full route coverage.
 */

import {
  API_NAME,
  CITATION_APA,
  DESCRIPTION,
  DISCLAIMER,
  HOMEPAGE,
  LICENSE,
  PROVENANCE,
  VERSION,
} from "./meta.js";
import type { Route } from "./router.js";

/** Collection roots that accept `page` and `limit`. */
const PAGINATED_PATHS: ReadonlySet<string> = new Set([
  "/v1/words",
  "/v1/practice/tests",
  "/v1/practice/questions",
  "/v1/writing/tasks",
  "/v1/writing/mistakes",
  "/v1/speaking",
  "/v1/tips",
]);

/** Paths that accept a free-text `q` search parameter. */
const SEARCHABLE_PATHS: ReadonlySet<string> = new Set([
  "/v1/words",
  "/v1/practice/tests",
  "/v1/practice/questions",
  "/v1/writing/tasks",
  "/v1/writing/mistakes",
  "/v1/speaking",
]);

interface JsonSchema {
  readonly [key: string]: unknown;
}

const JSON_RESPONSE_SCHEMA: JsonSchema = {
  type: "object",
  additionalProperties: true,
};

function jsonResponse(description: string): unknown {
  return {
    description,
    content: { "application/json": { schema: JSON_RESPONSE_SCHEMA } },
  };
}

const REQUEST_BODIES: Readonly<Record<string, unknown>> = {
  "POST /v1/bands/calculator": {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          required: ["skill", "raw"],
          properties: {
            skill: {
              type: "string",
              enum: [
                "listening",
                "academic_reading",
                "general_training_reading",
              ],
            },
            raw: { type: "integer", minimum: 0, maximum: 40 },
          },
        },
        examples: {
          listening: { value: { skill: "listening", raw: 30 } },
        },
      },
    },
  },
  "POST /v1/bands/overall": {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          required: ["listening", "reading", "writing", "speaking"],
          properties: {
            listening: { type: "number", minimum: 0, maximum: 9 },
            reading: { type: "number", minimum: 0, maximum: 9 },
            writing: { type: "number", minimum: 0, maximum: 9 },
            speaking: { type: "number", minimum: 0, maximum: 9 },
          },
        },
        examples: {
          typical: {
            value: { listening: 7.5, reading: 7, writing: 6, speaking: 6.5 },
          },
        },
      },
    },
  },
};

interface OperationObject {
  [key: string]: unknown;
}

interface PathItemObject {
  [method: string]: OperationObject;
}

export function buildOpenApiDocument(
  routes: readonly Route[],
): Record<string, unknown> {
  const paths: Record<string, PathItemObject> = {};
  for (const r of routes) {
    const key = r.path.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
    const item = paths[key] ?? {};
    const parameters: unknown[] = r.path
      .split("/")
      .filter((seg) => seg.startsWith(":"))
      .map((seg) => {
        const name = seg.slice(1);
        return {
          name,
          in: "path",
          required: true,
          schema: { type: "string" },
        };
      });
    if (r.method === "GET" && PAGINATED_PATHS.has(r.path)) {
      parameters.push(
        {
          name: "page",
          in: "query",
          schema: { type: "integer", minimum: 1, default: 1 },
        },
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
        },
      );
    }
    if (r.method === "GET" && SEARCHABLE_PATHS.has(r.path)) {
      parameters.push({
        name: "q",
        in: "query",
        schema: { type: "string" },
        description: "Case-insensitive free-text search across the resource",
      });
    }
    const operation: OperationObject = {
      summary: r.summary,
      tags: [tagFor(r.path)],
      responses: {
        "200": jsonResponse("Successful response"),
        "400": jsonResponse("Invalid query parameters or body"),
        "404": jsonResponse("Unknown id or route"),
        "405": jsonResponse("Method not allowed"),
      },
    };
    if (parameters.length > 0) {
      operation.parameters = parameters;
    }
    const bodyKey = `${r.method} ${r.path}`;
    const requestBody = REQUEST_BODIES[bodyKey];
    if (requestBody !== undefined) {
      operation.requestBody = requestBody;
    }
    item[r.method.toLowerCase()] = operation;
    paths[key] = item;
  }

  return {
    openapi: "3.1.0",
    info: {
      title: API_NAME,
      version: VERSION,
      description: [
        DESCRIPTION,
        "",
        `Citation (APA): ${CITATION_APA}`,
        "",
        `Provenance: ${PROVENANCE}`,
        "",
        `Disclaimer: ${DISCLAIMER}`,
      ].join("\n"),
      license: { name: LICENSE, url: `${HOMEPAGE}/blob/main/LICENSE` },
      contact: { name: "IELTS-API maintainers", url: HOMEPAGE },
    },
    servers: [{ url: "/", description: "This instance" }],
    tags: [
      { name: "meta", description: "Service discovery and metadata" },
      { name: "vocabulary", description: "Band-scored academic word lists" },
      { name: "practice", description: "Reading and listening practice tests" },
      { name: "writing", description: "Writing tasks and common mistakes" },
      { name: "speaking", description: "Speaking question bank" },
      { name: "tips", description: "Study and exam technique" },
      { name: "bands", description: "Band-score conversion tools" },
      { name: "docs", description: "API documentation" },
    ],
    paths,
  };
}

function tagFor(path: string): string {
  if (
    path === "/" ||
    path === "/health" ||
    path === "/v1" ||
    path === "/v1/meta"
  ) {
    return "meta";
  }
  if (path.startsWith("/v1/words")) {
    return "vocabulary";
  }
  if (path.startsWith("/v1/practice")) {
    return "practice";
  }
  if (path.startsWith("/v1/writing")) {
    return "writing";
  }
  if (path.startsWith("/v1/speaking")) {
    return "speaking";
  }
  if (path.startsWith("/v1/tips")) {
    return "tips";
  }
  if (path.startsWith("/v1/bands")) {
    return "bands";
  }
  return "docs";
}
