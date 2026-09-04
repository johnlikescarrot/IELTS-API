import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { findSkill, type SkillId } from "../src/catalog.js";
import { calculateOverallBand } from "../src/scoring.js";

describe("IELTS API", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("serves a discoverable no-auth API overview, health check, OpenAPI document, and docs", async () => {
    const root = await app.inject("/");
    const versionedRoot = await app.inject("/v1");
    const health = await app.inject({
      headers: { origin: "https://consumer.example" },
      url: "/v1/health",
    });
    const specification = await app.inject("/openapi.json");
    const docs = await app.inject("/docs");
    const docsWithSlash = await app.inject("/docs/");

    expect(root.statusCode).toBe(200);
    expect(root.headers["cache-control"]).toContain("max-age=86400");
    expect(root.json()).toMatchObject({
      authentication: "none",
      documentation: "/docs",
      name: "IELTS API",
      openapi: "/openapi.json",
    });
    expect(versionedRoot.json()).toMatchObject({ version: "1.0.0" });
    expect(health.headers["access-control-allow-origin"]).toBe(
      "https://consumer.example",
    );
    expect(health.json()).toMatchObject({
      checks: { catalog: "loaded", sources: "loaded" },
      status: "available",
    });
    expect(specification.json()).toMatchObject({
      openapi: "3.1.0",
      paths: { "/v1/practice": expect.any(Object) },
    });
    expect(docs.statusCode).toBe(200);
    expect(docs.headers["content-type"]).toContain("text/html");
    expect(docsWithSlash.statusCode).toBe(200);
  });

  it("returns cited reference data, sources, and individual sections", async () => {
    const reference = await app.inject("/v1/reference");
    const sourceList = await app.inject("/v1/sources");
    const sections = await app.inject("/v1/sections");
    const section = await app.inject("/v1/sections/writing");

    expect(reference.statusCode).toBe(200);
    expect(reference.json().sections).toHaveLength(4);
    expect(reference.json().sources).toHaveLength(3);
    expect(sourceList.json()).toMatchObject({ revision: "2026-09-04" });
    expect(
      sections.json().sections.map((item: { id: string }) => item.id),
    ).toEqual(["listening", "reading", "writing", "speaking"]);
    expect(section.json()).toMatchObject({
      section: { id: "writing", parts: 2, questionsOrTasks: 2 },
    });
  });

  it("reports malformed section parameters as structured client errors", async () => {
    const response = await app.inject("/v1/sections/not-a-skill");

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "invalid_request",
      issues: [{ path: "skill" }],
    });
  });

  it("returns scoring guidance and calculates transparent overall bands", async () => {
    const scoring = await app.inject("/v1/scoring");
    const calculated = await app.inject(
      "/v1/scoring/overall?listening=6.5&reading=6.5&writing=5.0&speaking=7.0",
    );

    expect(scoring.json()).toMatchObject({
      componentScoreRange: { maximum: 9, minimum: 0, step: 0.5 },
      rawScoreThresholds: { listening: { 7: 30 } },
    });
    expect(calculated.statusCode).toBe(200);
    expect(calculated.json()).toEqual({
      average: 6.25,
      components: { listening: 6.5, reading: 6.5, speaking: 7, writing: 5 },
      overallBand: 6.5,
      rounding: "nearest whole or half band",
    });
  });

  it("rounds component averages at all documented boundary directions", () => {
    expect(calculateOverallBand([6, 6, 6, 6.5])).toBe(6);
    expect(calculateOverallBand([6, 6, 6, 7])).toBe(6.5);
    expect(calculateOverallBand([6.5, 6.5, 6.5, 7.5])).toBe(7);
  });

  it("rejects invalid overall-score queries", async () => {
    const response = await app.inject(
      "/v1/scoring/overall?listening=9.5&reading=6&writing=6&speaking=6",
    );

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "invalid_request",
      issues: [{ path: "listening" }],
    });
  });

  it("returns raw-score guidance and explains both unavailable and invalid requests", async () => {
    const available = await app.inject(
      "/v1/scoring/raw?test=listening&target=7",
    );
    const unavailable = await app.inject(
      "/v1/scoring/raw?test=listening&target=4",
    );
    const invalid = await app.inject("/v1/scoring/raw?test=listening&target=9");

    expect(available.statusCode).toBe(200);
    expect(available.json()).toMatchObject({
      approximateMinimumCorrect: 30,
      targetBand: 7,
      test: "listening",
    });
    expect(unavailable.statusCode).toBe(422);
    expect(unavailable.json()).toMatchObject({
      error: "threshold_not_published",
    });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json()).toMatchObject({ error: "invalid_request" });
  });

  it("lists and filters only original CC0 practice prompts", async () => {
    const all = await app.inject("/v1/practice");
    const academicWriting = await app.inject(
      "/v1/practice?skill=writing&module=academic&limit=1",
    );
    const generalWriting = await app.inject(
      "/v1/practice?skill=writing&module=general_training",
    );
    const speaking = await app.inject("/v1/practice?skill=speaking&limit=1");

    expect(all.json()).toMatchObject({
      filters: { limit: 10 },
      license: "CC0-1.0",
      total: 5,
    });
    expect(academicWriting.json()).toMatchObject({
      filters: { limit: 1, module: "academic", skill: "writing" },
      prompts: [{ id: "writing-academic-bicycle-data" }],
      total: 1,
    });
    expect(
      generalWriting.json().prompts.map((item: { id: string }) => item.id),
    ).toEqual([
      "writing-general-library-letter",
      "writing-both-public-green-space",
    ]);
    expect(speaking.json()).toMatchObject({
      prompts: [{ skill: "speaking" }],
      total: 1,
    });
  });

  it("rejects invalid practice filters and supports prompt lookup failures", async () => {
    const malformedFilter = await app.inject("/v1/practice?skill=reading");
    const unknownParameter = await app.inject("/v1/practice?unrecognised=1");
    const validPrompt = await app.inject(
      "/v1/practice/writing-both-public-green-space",
    );
    const missingPrompt = await app.inject("/v1/practice/no-such-prompt");
    const longId = "x".repeat(121);
    const malformedId = await app.inject(`/v1/practice/${longId}`);

    expect(malformedFilter.statusCode).toBe(400);
    expect(unknownParameter.json()).toMatchObject({
      error: "invalid_request",
      issues: [{ path: "query" }],
    });
    expect(validPrompt.json()).toMatchObject({
      prompt: { id: "writing-both-public-green-space", license: "CC0-1.0" },
    });
    expect(missingPrompt.statusCode).toBe(404);
    expect(missingPrompt.json()).toMatchObject({ error: "prompt_not_found" });
    expect(malformedId.statusCode).toBe(400);
    expect(malformedId.json()).toMatchObject({
      error: "invalid_request",
      issues: [{ path: "id" }],
    });
  });

  it("serves citation metadata and a consistent unknown-route response", async () => {
    const citation = await app.inject("/v1/citation");
    const unknownRoute = await app.inject("/not-a-route");

    expect(citation.json()).toMatchObject({
      cffVersion: "1.2.0",
      citationFile: "/CITATION.cff",
      repository: "https://github.com/johnlikescarrot/IELTS-API",
    });
    expect(unknownRoute.statusCode).toBe(404);
    expect(unknownRoute.json()).toMatchObject({
      error: "not_found",
      message: "No route matches GET /not-a-route",
    });
  });

  it("fails fast if an internal catalog skill reference is invalid", () => {
    expect(() => findSkill("not-a-skill" as SkillId)).toThrow(
      "Unknown skill in catalog",
    );
  });
});
