/**
 * Documentation endpoints: /openapi.json and /docs.
 */

import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { as, get, startFixture, stopFixture, type Fixture } from "./helpers.js";
import { apiRoutes } from "../src/routes.js";

let fixture: Fixture;

before(async () => {
  fixture = await startFixture();
});

after(async () => {
  await stopFixture(fixture);
});

test("openapi.json covers every registered route", async () => {
  const { status, body } = await get(fixture, "/openapi.json");
  assert.equal(status, 200);
  const doc = as<{
    openapi: string;
    info: { title: string; version: string; license: { name: string } };
    paths: Record<string, Record<string, { summary: string }>>;
  }>(body);
  assert.equal(doc.openapi, "3.1.0");
  assert.equal(doc.info.title, "IELTS-API");
  assert.equal(doc.info.license.name, "MIT");

  for (const r of apiRoutes) {
    const key = r.path.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
    const operation = doc.paths[key];
    assert.ok(operation !== undefined, `missing path ${key}`);
    assert.ok(
      operation[r.method.toLowerCase()] !== undefined,
      `missing ${r.method} ${key}`,
    );
  }
  assert.notEqual(doc.paths["/v1/bands/calculator"]!.get, undefined);
  assert.notEqual(doc.paths["/v1/bands/calculator"]!.post, undefined);
});

test("openapi.json documents pagination and search parameters", async () => {
  const { body } = await get(fixture, "/openapi.json");
  const doc = as<{
    paths: Record<string, { get?: { parameters?: { name: string }[] } }>;
  }>(body);
  const wordsParams = doc.paths["/v1/words"]!.get!.parameters ?? [];
  const names = wordsParams.map((p) => p.name);
  assert.ok(names.includes("page"));
  assert.ok(names.includes("limit"));
  assert.ok(names.includes("q"));
});

test("openapi.json carries citation and provenance metadata", async () => {
  const { body } = await get(fixture, "/openapi.json");
  const doc = as<{ info: { description: string } }>(body);
  assert.ok(doc.info.description.includes("Citation"));
  assert.ok(doc.info.description.includes("Provenance"));
  assert.ok(doc.info.description.includes("Disclaimer"));
});

test("/docs serves an HTML page with citation meta tags", async () => {
  const { status, headers, body } = await get(fixture, "/docs");
  assert.equal(status, 200);
  assert.ok((headers.get("content-type") ?? "").includes("text/html"));
  const html = as<string>(body);
  assert.ok(html.includes("IELTS-API"));
  assert.ok(html.includes("/v1/words"));
  assert.ok(html.includes("citation_title"));
  assert.ok(html.includes("</html>"));
  assert.ok(headers.get("access-control-allow-origin") === "*");
});
