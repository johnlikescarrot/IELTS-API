import { describe, expect, it } from "vitest";
import { buildOpenApiDocument } from "../../src/http/openapi.ts";
import { createApp } from "../../src/http/app.ts";

const routes = createApp().routes;
const document = buildOpenApiDocument(routes) as Record<string, any>;

describe("buildOpenApiDocument", () => {
  it("declares OpenAPI 3.1 with no security schemes", () => {
    expect(document["openapi"]).toBe("3.1.0");
    expect(document["security"]).toEqual([]);
    expect(document["components"]["securitySchemes"]).toEqual({});
  });

  it("documents every non-preflight route", () => {
    const documented = Object.values(
      document["paths"] as Record<string, any>,
    ).flatMap((entry) => Object.keys(entry as object)).length;
    expect(documented).toBe(routes.length);
  });

  it("converts colon parameters into brace parameters", () => {
    expect(document["paths"]["/v1/bands/{band}"]).toBeDefined();
    expect(document["paths"]["/v1/bands/:band"]).toBeUndefined();
  });

  it("groups two methods on one path", () => {
    const overall = document["paths"]["/v1/score/overall"];
    expect(Object.keys(overall as object).sort()).toEqual(["get", "post"]);
  });

  it("marks path parameters as required and keeps query parameters optional", () => {
    const operation = document["paths"]["/v1/descriptors/{rubric}"]["get"];
    const byName = new Map(
      (operation["parameters"] as any[]).map((parameter) => [
        parameter.name,
        parameter,
      ]),
    );
    expect(byName.get("rubric").required).toBe(true);
    expect(byName.get("criterion").required).toBe(false);
  });

  it("documents request bodies and default responses", () => {
    const operation = document["paths"]["/v1/writing/analyse"]["post"];
    expect(operation["requestBody"]["required"]).toBe(true);
    expect(Object.keys(operation["responses"] as object)).toEqual([
      "200",
      "400",
      "404",
    ]);
    expect(operation["security"]).toEqual([]);
  });

  it("omits parameters and request bodies where there are none", () => {
    const health = document["paths"]["/health"]["get"];
    expect(health["parameters"]).toBeUndefined();
    expect(health["requestBody"]).toBeUndefined();
    expect(
      health["responses"]["200"]["content"]["application/json"]["schema"][
        "properties"
      ]["data"]["required"],
    ).toEqual(["status", "version"]);
  });

  it("collects sorted tags", () => {
    const tags = (document["tags"] as { name: string }[]).map(
      (tag) => tag.name,
    );
    expect(tags).toEqual([...tags].sort());
    expect(tags).toContain("scoring");
  });

  it("skips OPTIONS and HEAD routes", () => {
    const filtered = buildOpenApiDocument([
      {
        method: "OPTIONS",
        path: "/x",
        operationId: "o",
        summary: "s",
        description: "d",
        tags: ["t"],
        handler: () => ({ kind: "json", data: null }),
      },
      {
        method: "HEAD",
        path: "/x",
        operationId: "h",
        summary: "s",
        description: "d",
        tags: ["t"],
        handler: () => ({ kind: "json", data: null }),
      },
    ]) as Record<string, any>;
    expect(filtered["paths"]).toEqual({});
  });
});
