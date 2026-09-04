import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/server.js";
import { buildOpenApi } from "../src/openapi.js";

describe("IELTS API (integration)", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("serves API metadata at the root", async () => {
    const res = await app.inject({ method: "GET", url: "/" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.name).toBe("IELTS API");
    expect(body.version).toBe("1.0.0");
    expect(body.endpoints).toContain("/api/v1/vocabulary");
  });

  it("serves the OpenAPI document", async () => {
    const res = await app.inject({ method: "GET", url: "/openapi.json" });
    expect(res.statusCode).toBe(200);
    const doc = res.json();
    expect(doc.openapi).toBe("3.0.3");
    expect(doc.paths["/api/v1/vocabulary"]).toBeDefined();
  });

  it("buildOpenApi returns a valid document", () => {
    const doc = buildOpenApi();
    expect(doc.openapi).toBe("3.0.3");
    expect(doc.components?.schemas?.Paginated).toBeDefined();
  });

  it("health check returns ok", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/health" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe("ok");
    expect(typeof body.uptime).toBe("number");
  });

  it("returns a 404 for unknown routes", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/definitely-not-real" });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toContain("not found");
  });

  it("lists topics with pagination and clamps the limit", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/topics?limit=500&offset=0" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.total).toBeGreaterThan(0);
    expect(body.limit).toBe(100);
    expect(body.offset).toBe(0);
    expect(Array.isArray(body.items)).toBe(true);
  });

  it("returns a topic by id", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/topics/education" });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe("Education");
  });

  it("returns 404 for a missing topic", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/topics/nope" });
    expect(res.statusCode).toBe(404);
  });

  it("returns vocabulary for a topic", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/topics/education/vocabulary" });
    expect(res.statusCode).toBe(200);
    expect(res.json().length).toBeGreaterThan(0);
  });

  it("returns 404 for a missing topic vocabulary", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/topics/nope/vocabulary" });
    expect(res.statusCode).toBe(404);
  });

  it("lists vocabulary and searches", async () => {
    const list = await app.inject({ method: "GET", url: "/api/v1/vocabulary" });
    expect(list.statusCode).toBe(200);
    expect(list.json().items.length).toBeGreaterThan(0);

    const search = await app.inject({ method: "GET", url: "/api/v1/vocabulary?q=curriculum" });
    expect(search.json().items[0].word).toBe("curriculum");
  });

  it("filters vocabulary by topic", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/vocabulary?topic=environment" });
    expect(res.json().items.length).toBeGreaterThan(0);
    expect(res.json().items.every((v: { topicId: string }) => v.topicId === "environment")).toBe(
      true,
    );

    const none = await app.inject({ method: "GET", url: "/api/v1/vocabulary?topic=nope" });
    expect(none.json().total).toBe(0);
  });

  it("paginates an empty slice beyond the data", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/vocabulary?offset=1000&limit=10" });
    expect(res.statusCode).toBe(200);
    expect(res.json().items).toEqual([]);
    expect(res.json().total).toBeGreaterThan(0);
  });

  it("returns a single vocabulary entry", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/vocabulary/vocab-educ-1" });
    expect(res.statusCode).toBe(200);
    expect(res.json().word).toBe("curriculum");
  });

  it("returns 404 for a missing vocabulary entry", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/vocabulary/vocab-nope" });
    expect(res.statusCode).toBe(404);
  });

  it("lists and searches synonyms", async () => {
    const list = await app.inject({ method: "GET", url: "/api/v1/synonyms" });
    expect(list.json().items.length).toBeGreaterThan(0);

    const search = await app.inject({ method: "GET", url: "/api/v1/synonyms?q=crucial" });
    expect(search.json().items[0].headword).toBe("important");
  });

  it("returns a synonym group and 404 for a missing one", async () => {
    const ok = await app.inject({ method: "GET", url: "/api/v1/synonyms/syn-important" });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().headword).toBe("important");

    const missing = await app.inject({ method: "GET", url: "/api/v1/synonyms/nope" });
    expect(missing.statusCode).toBe(404);
  });

  it("lists band descriptors with skill, band and combined filters", async () => {
    const all = await app.inject({ method: "GET", url: "/api/v1/band-descriptors" });
    expect(all.json().total).toBeGreaterThan(0);

    const skill = await app.inject({
      method: "GET",
      url: "/api/v1/band-descriptors?skill=writing",
    });
    expect(skill.json().items.every((d: { skill: string }) => d.skill === "writing")).toBe(true);

    const band = await app.inject({ method: "GET", url: "/api/v1/band-descriptors?band=7" });
    expect(band.json().items.every((d: { band: number }) => d.band === 7)).toBe(true);

    const both = await app.inject({
      method: "GET",
      url: "/api/v1/band-descriptors?skill=writing&band=7",
    });
    expect(both.json().items).toHaveLength(1);
  });

  it("returns a band descriptor and 404 for a missing one", async () => {
    const ok = await app.inject({ method: "GET", url: "/api/v1/band-descriptors/band-writing-9" });
    expect(ok.statusCode).toBe(200);

    const missing = await app.inject({ method: "GET", url: "/api/v1/band-descriptors/nope" });
    expect(missing.statusCode).toBe(404);
  });

  it("lists and filters writing tasks", async () => {
    const all = await app.inject({ method: "GET", url: "/api/v1/writing" });
    expect(all.json().total).toBeGreaterThan(0);

    const task = await app.inject({ method: "GET", url: "/api/v1/writing?task=2" });
    expect(task.json().items.every((w: { task: number }) => w.task === 2)).toBe(true);

    const topic = await app.inject({ method: "GET", url: "/api/v1/writing?topic=education" });
    expect(topic.json().items.length).toBeGreaterThan(0);

    const both = await app.inject({
      method: "GET",
      url: "/api/v1/writing?task=1&topic=technology",
    });
    expect(both.json().items).toHaveLength(1);
  });

  it("returns a writing task and 404 for a missing one", async () => {
    const ok = await app.inject({ method: "GET", url: "/api/v1/writing/writing-t2-education-1" });
    expect(ok.statusCode).toBe(200);

    const missing = await app.inject({ method: "GET", url: "/api/v1/writing/nope" });
    expect(missing.statusCode).toBe(404);
  });

  it("searches speaking parts and cue cards", async () => {
    const all = await app.inject({ method: "GET", url: "/api/v1/speaking" });
    expect(all.json().total).toBeGreaterThan(0);

    const search = await app.inject({ method: "GET", url: "/api/v1/speaking?q=hometown" });
    expect(search.json().parts.length).toBeGreaterThan(0);
  });

  it("lists and filters speaking parts", async () => {
    const all = await app.inject({ method: "GET", url: "/api/v1/speaking/parts" });
    expect(all.json().items.length).toBeGreaterThan(0);

    const filtered = await app.inject({
      method: "GET",
      url: "/api/v1/speaking/parts?topic=travel",
    });
    expect(filtered.json().items.every((p: { topicId: string }) => p.topicId === "travel")).toBe(
      true,
    );

    const ok = await app.inject({ method: "GET", url: "/api/v1/speaking/parts/speak-1-hometown" });
    expect(ok.statusCode).toBe(200);

    const missing = await app.inject({ method: "GET", url: "/api/v1/speaking/parts/nope" });
    expect(missing.statusCode).toBe(404);
  });

  it("lists and filters cue cards", async () => {
    const all = await app.inject({ method: "GET", url: "/api/v1/speaking/cue-cards" });
    expect(all.json().items.length).toBeGreaterThan(0);

    const filtered = await app.inject({
      method: "GET",
      url: "/api/v1/speaking/cue-cards?topic=technology",
    });
    expect(
      filtered.json().items.every((c: { topicId: string }) => c.topicId === "technology"),
    ).toBe(true);

    const ok = await app.inject({ method: "GET", url: "/api/v1/speaking/cue-cards/cue-tech-1" });
    expect(ok.statusCode).toBe(200);

    const missing = await app.inject({ method: "GET", url: "/api/v1/speaking/cue-cards/nope" });
    expect(missing.statusCode).toBe(404);
  });

  it("lists and searches reading question types", async () => {
    const all = await app.inject({ method: "GET", url: "/api/v1/reading" });
    expect(all.json().items.length).toBeGreaterThan(0);

    const search = await app.inject({ method: "GET", url: "/api/v1/reading?q=headings" });
    expect(search.json().items[0].id).toBe("reading-headings");

    const ok = await app.inject({ method: "GET", url: "/api/v1/reading/reading-tfng" });
    expect(ok.statusCode).toBe(200);

    const missing = await app.inject({ method: "GET", url: "/api/v1/reading/nope" });
    expect(missing.statusCode).toBe(404);
  });

  it("lists, searches and filters idioms", async () => {
    const all = await app.inject({ method: "GET", url: "/api/v1/idioms" });
    expect(all.json().items.length).toBeGreaterThan(0);

    const search = await app.inject({ method: "GET", url: "/api/v1/idioms?q=iceberg" });
    expect(search.json().items[0].id).toBe("idiom-2");

    const filtered = await app.inject({ method: "GET", url: "/api/v1/idioms?topic=technology" });
    expect(
      filtered.json().items.every((i: { topicId: string }) => i.topicId === "technology"),
    ).toBe(true);

    const ok = await app.inject({ method: "GET", url: "/api/v1/idioms/idiom-1" });
    expect(ok.statusCode).toBe(200);

    const missing = await app.inject({ method: "GET", url: "/api/v1/idioms/nope" });
    expect(missing.statusCode).toBe(404);
  });

  it("lists and searches common mistakes", async () => {
    const all = await app.inject({ method: "GET", url: "/api/v1/mistakes" });
    expect(all.json().items.length).toBeGreaterThan(0);

    const search = await app.inject({ method: "GET", url: "/api/v1/mistakes?q=goverment" });
    expect(search.json().items[0].id).toBe("mistake-5");

    const ok = await app.inject({ method: "GET", url: "/api/v1/mistakes/mistake-1" });
    expect(ok.statusCode).toBe(200);

    const missing = await app.inject({ method: "GET", url: "/api/v1/mistakes/nope" });
    expect(missing.statusCode).toBe(404);
  });

  it("lists, searches and filters exam tips", async () => {
    const all = await app.inject({ method: "GET", url: "/api/v1/tips" });
    expect(all.json().items.length).toBeGreaterThan(0);

    const search = await app.inject({ method: "GET", url: "/api/v1/tips?q=plan" });
    expect(search.json().items[0].id).toBe("tip-writing-1");

    const filtered = await app.inject({ method: "GET", url: "/api/v1/tips?skill=listening" });
    expect(filtered.json().items.every((t: { skill: string }) => t.skill === "listening")).toBe(
      true,
    );

    const ok = await app.inject({ method: "GET", url: "/api/v1/tips/tip-listening-1" });
    expect(ok.statusCode).toBe(200);

    const missing = await app.inject({ method: "GET", url: "/api/v1/tips/nope" });
    expect(missing.statusCode).toBe(404);
  });

  it("allows cross-origin requests", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/health",
      headers: { origin: "https://example.com" },
    });
    expect(res.headers["access-control-allow-origin"]).toBe("*");
  });
});
