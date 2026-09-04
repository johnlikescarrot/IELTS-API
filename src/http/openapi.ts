/**
 * Generation of the OpenAPI 3.1 document from the route table.
 *
 * The specification is derived from exactly the same records that dispatch
 * live traffic, so documentation drift is structurally impossible.
 *
 * @packageDocumentation
 */

import { LICENSE, REPOSITORY, SERVICE_NAME, VERSION } from "../meta.ts";
import type { RouteDefinition, SchemaObject } from "./route.ts";

const ERROR_SCHEMA: SchemaObject = {
  type: "object",
  required: ["error"],
  properties: {
    error: {
      type: "object",
      required: ["code", "message", "details"],
      properties: {
        code: { type: "string" },
        message: { type: "string" },
        details: { type: "object", additionalProperties: true },
      },
    },
  },
};

const META_SCHEMA: SchemaObject = {
  type: "object",
  properties: {
    count: { type: "integer" },
    total: { type: "integer" },
    offset: { type: "integer" },
    limit: { type: "integer" },
    seed: { type: "integer" },
    sources: { type: "array", items: { type: "string" } },
  },
};

function openApiPath(pattern: string): string {
  return pattern
    .split("/")
    .map((segment) =>
      segment.startsWith(":") ? `{${segment.slice(1)}}` : segment,
    )
    .join("/");
}

function operationFor(route: RouteDefinition): Record<string, unknown> {
  const responses: Record<string, unknown> = {
    "200": {
      description: "Successful response.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["data"],
            properties: {
              data: route.responseSchema ?? {
                description: "Endpoint-specific payload.",
              },
              meta: META_SCHEMA,
            },
          },
        },
      },
    },
    "400": {
      description: "The request was malformed or a parameter was invalid.",
      content: { "application/json": { schema: ERROR_SCHEMA } },
    },
    "404": {
      description: "No resource matches the request.",
      content: { "application/json": { schema: ERROR_SCHEMA } },
    },
  };

  const operation: Record<string, unknown> = {
    operationId: route.operationId,
    summary: route.summary,
    description: route.description,
    tags: [...route.tags],
    security: [],
    responses,
  };

  if (route.parameters !== undefined && route.parameters.length > 0) {
    operation["parameters"] = route.parameters.map((parameter) => ({
      name: parameter.name,
      in: parameter.in,
      required: parameter.required ?? parameter.in === "path",
      description: parameter.description,
      schema: parameter.schema,
    }));
  }

  if (route.requestBody !== undefined) {
    operation["requestBody"] = {
      required: true,
      content: { "application/json": { schema: route.requestBody } },
    };
  }

  return operation;
}

/**
 * Builds the OpenAPI document.
 *
 * @param routes - The route table.
 * @returns A plain object ready to be serialised as JSON or YAML.
 */
export function buildOpenApiDocument(
  routes: readonly RouteDefinition[],
): Record<string, unknown> {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const route of routes) {
    if (route.method === "OPTIONS" || route.method === "HEAD") {
      continue;
    }
    const path = openApiPath(route.path);
    const entry = paths[path] ?? {};
    entry[route.method.toLowerCase()] = operationFor(route);
    paths[path] = entry;
  }

  const tags = [...new Set(routes.flatMap((route) => route.tags))]
    .sort()
    .map((name) => ({ name }));

  return {
    openapi: "3.1.0",
    info: {
      title: SERVICE_NAME,
      version: VERSION,
      summary:
        "A free, authentication-free IELTS scoring and language-assessment API.",
      description: [
        "IELTS-API is a dependency-free reference implementation of IELTS score arithmetic,",
        "raw-score conversion, CEFR alignment, academic vocabulary profiling, readability",
        "analysis and transparent Writing band estimation.",
        "",
        "No authentication is required for any endpoint. No API key, token or account exists.",
        "All responses are deterministic: identical requests produce byte-identical bodies,",
        "and endpoints that sample randomly accept an explicit seed.",
      ].join("\n"),
      license: { name: LICENSE, identifier: LICENSE },
      contact: { name: SERVICE_NAME, url: REPOSITORY },
    },
    externalDocs: {
      description:
        "Source repository, citation metadata and reproducibility notes",
      url: REPOSITORY,
    },
    servers: [{ url: "/", description: "The server hosting this document" }],
    security: [],
    tags,
    paths,
    components: {
      securitySchemes: {},
      schemas: { Error: ERROR_SCHEMA, Meta: META_SCHEMA },
    },
  };
}
