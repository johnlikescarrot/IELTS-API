import { describe, expect, it } from "vitest";
import { getJson } from "./helpers/http.ts";
import { routes } from "../src/routes/index.ts";
import { OPENAPI_DOCUMENT } from "../src/openapi.ts";
import { VERSION } from "../src/version.ts";

interface OpenApiBody {
  openapi: string;
  info: { title: string; version: string };
  paths: Record<string, Record<string, unknown>>;
}

describe("GET /openapi.json", () => {
  it("serves the OpenAPI 3.1 document", async () => {
    const { status, headers, body } = await getJson<OpenApiBody>("/openapi.json");
    expect(status).toBe(200);
    expect(headers.get("etag")).not.toBeNull();
    expect(body.openapi).toBe("3.1.0");
    expect(body.info.title).toBe("IELTS-API");
    expect(body.info.version).toBe(VERSION);
  });
});

describe("spec and route table stay in sync", () => {
  it("documents every registered route path and method", () => {
    for (const route of routes) {
      const specPath = route.path.replace(/:([^/]+)/gu, "{$1}");
      const entry = OPENAPI_DOCUMENT.paths[specPath];
      expect(entry, `OpenAPI is missing ${specPath}`).toBeDefined();
      const method = route.method.toLowerCase();
      expect(entry, `${specPath} is missing ${method}`).toHaveProperty(method);
    }
  });

  it("does not document routes that do not exist", () => {
    const registered = new Set(routes.map((route) => route.path.replace(/:([^/]+)/gu, "{$1}")));
    for (const specPath of Object.keys(OPENAPI_DOCUMENT.paths)) {
      expect(registered.has(specPath), `${specPath} is not a registered route`).toBe(true);
    }
  });
});
