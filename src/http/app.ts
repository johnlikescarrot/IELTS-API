/**
 * Assembly of the complete API: the route table, the dispatcher and the
 * self-hosted documentation page.
 *
 * The dispatcher is a pure function from {@link ApiRequest} to
 * {@link ApiResponse}: it opens no sockets, reads no clock and touches no
 * filesystem, which is what makes the whole surface testable in-process and
 * byte-for-byte reproducible.
 *
 * @packageDocumentation
 */

import { ApiError } from "../core/errors.ts";
import { API_VERSION, REPOSITORY, SERVICE_NAME, VERSION } from "../meta.ts";
import { buildOpenApiDocument } from "./openapi.ts";
import { optionalBoolean } from "./params.ts";
import {
  BASE_HEADERS,
  json,
  raw,
  render,
  renderError,
  type ApiRequest,
  type ApiResponse,
} from "./respond.ts";
import type { RouteDefinition } from "./route.ts";
import { Router, type HttpMethod } from "./router.ts";
import { metaRoutes } from "./routes/meta.ts";
import { scaleRoutes } from "./routes/scale.ts";
import { scoreRoutes } from "./routes/score.ts";
import { speakingRoutes } from "./routes/speaking.ts";
import { textRoutes } from "./routes/text.ts";
import { vocabularyRoutes } from "./routes/vocabulary.ts";
import { writingRoutes } from "./routes/writing.ts";

const DOMAIN_ROUTES: readonly RouteDefinition[] = [
  ...metaRoutes,
  ...scaleRoutes,
  ...scoreRoutes,
  ...vocabularyRoutes,
  ...writingRoutes,
  ...speakingRoutes,
  ...textRoutes,
];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Renders a dependency-free HTML documentation page from the route table.
 *
 * The page loads no external scripts, fonts or stylesheets, so it works offline
 * and sends no data to third parties.
 *
 * @param routes - The route table.
 */
export function renderDocsPage(routes: readonly RouteDefinition[]): string {
  const grouped = new Map<string, RouteDefinition[]>();
  for (const route of routes) {
    const tag = route.tags[0] ?? "other";
    const bucket = grouped.get(tag) ?? [];
    bucket.push(route);
    grouped.set(tag, bucket);
  }

  const sections = [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([tag, items]) => {
      const rows = items
        .map(
          (route) =>
            `<article><h3><code>${route.method} ${escapeHtml(route.path)}</code></h3>` +
            `<p><strong>${escapeHtml(route.summary)}</strong></p>` +
            `<p>${escapeHtml(route.description)}</p></article>`,
        )
        .join("\n");
      return `<section><h2>${escapeHtml(tag)}</h2>\n${rows}\n</section>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${SERVICE_NAME} ${VERSION} - API documentation</title>
<style>
:root { color-scheme: light dark; }
body { font-family: system-ui, sans-serif; margin: 0 auto; max-width: 52rem; padding: 2rem 1rem; line-height: 1.6; }
code { font-family: ui-monospace, monospace; }
h3 code { background: rgba(127,127,127,0.15); padding: 0.15rem 0.4rem; border-radius: 0.25rem; }
article { border-left: 3px solid rgba(127,127,127,0.35); padding-left: 1rem; margin: 1.25rem 0; }
section { margin-bottom: 2.5rem; }
</style>
</head>
<body>
<h1>${SERVICE_NAME} <small>${VERSION}</small></h1>
<p>A free IELTS scoring and language-assessment API. <strong>No authentication is required for any endpoint.</strong></p>
<p>Machine-readable specification: <a href="/openapi.json">/openapi.json</a>. Source and citation metadata: <a href="${REPOSITORY}">${REPOSITORY}</a>.</p>
${sections}
</body>
</html>
`;
}

/** A dispatchable application. */
export interface App {
  /** The complete route table, including the service-level routes. */
  readonly routes: readonly RouteDefinition[];
  /** Dispatches a normalised request. */
  readonly handle: (request: ApiRequest) => ApiResponse;
}

/**
 * Builds the application.
 *
 * @returns An {@link App} whose `handle` function is pure.
 */
export function createApp(): App {
  const routes: RouteDefinition[] = [...DOMAIN_ROUTES];

  const openApiRoute: RouteDefinition = {
    method: "GET",
    path: "/openapi.json",
    operationId: "getOpenApiDocument",
    summary: "OpenAPI 3.1 specification",
    description:
      "Returns the machine-readable description of every endpoint, generated from the same route table that serves traffic.",
    tags: ["service"],
    handler: () =>
      raw(
        "application/json; charset=utf-8",
        `${JSON.stringify(buildOpenApiDocument(routes), null, 2)}\n`,
      ),
  };

  const docsRoute: RouteDefinition = {
    method: "GET",
    path: "/docs",
    operationId: "getDocs",
    summary: "Human-readable documentation",
    description:
      "Returns a self-contained HTML page describing every endpoint. The page loads no third-party resources.",
    tags: ["service"],
    handler: () => raw("text/html; charset=utf-8", renderDocsPage(routes)),
  };

  const indexRoute: RouteDefinition = {
    method: "GET",
    path: "/",
    operationId: "getIndex",
    summary: "Service index",
    description:
      "Lists every available endpoint with its summary, so that the API is discoverable without out-of-band documentation.",
    tags: ["service"],
    handler: () =>
      json({
        name: SERVICE_NAME,
        version: VERSION,
        apiVersion: API_VERSION,
        authentication: "none",
        documentation: "/docs",
        specification: "/openapi.json",
        citation: "/v1/citation",
        repository: REPOSITORY,
        endpoints: routes.map((route) => ({
          method: route.method,
          path: route.path,
          summary: route.summary,
        })),
      }),
  };

  routes.push(openApiRoute, docsRoute, indexRoute);

  const router = new Router<RouteDefinition>();
  for (const route of routes) {
    router.add(route.method, route.path, route);
  }

  const handle = (request: ApiRequest): ApiResponse => {
    const pretty = safePretty(request);

    if (request.method === "OPTIONS") {
      return {
        status: 204,
        headers: { ...BASE_HEADERS, "content-length": "0" },
        body: "",
      };
    }

    const lookupMethod = request.method === "HEAD" ? "GET" : request.method;
    const resolved = router.resolve(lookupMethod, request.path);

    if (resolved.kind === "not-found") {
      return renderError(
        new ApiError("not_found", `No route matches ${request.path}.`, {
          path: request.path,
          documentation: "/docs",
        }),
        pretty,
      );
    }

    if (resolved.kind === "method-not-allowed") {
      const response = renderError(
        new ApiError(
          "method_not_allowed",
          `${request.method} is not supported for ${request.path}.`,
          { allowed: resolved.allowed },
        ),
        pretty,
      );
      return {
        ...response,
        headers: { ...response.headers, allow: resolved.allowed.join(", ") },
      };
    }

    try {
      const definition = resolved.match.route.handler;
      const result = definition.handler({
        request,
        params: resolved.match.params,
      });
      const response = render(result, pretty);
      if (request.method === "HEAD") {
        return { ...response, body: "" };
      }
      return response;
    } catch (error) {
      return renderError(error, pretty);
    }
  };

  return { routes, handle };
}

function safePretty(request: ApiRequest): boolean {
  try {
    return optionalBoolean(request.query, "pretty") ?? true;
  } catch {
    return true;
  }
}

/** The HTTP methods the application responds to. */
export const SUPPORTED_METHODS: readonly HttpMethod[] = [
  "GET",
  "POST",
  "HEAD",
  "OPTIONS",
];
