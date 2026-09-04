/**
 * Library entry point (src/app.ts) re-exports and /v1/meta.
 */

import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { as, get, startFixture, stopFixture, type Fixture } from "./helpers.js";
import {
  apiRoutes,
  applyCors,
  createApp,
  startServer,
  resolvePort,
  ApiError,
  sendJson,
  sendError,
  VERSION,
  API_NAME,
  CITATION_APA,
  CITATION_BIBTEX,
  RAW_SCORE_TABLES,
  rawToBand,
  overallBand,
} from "../src/app.js";

let fixture: Fixture;

before(async () => {
  fixture = await startFixture();
});

after(async () => {
  await stopFixture(fixture);
});

test("app.ts re-exports the public library surface", () => {
  assert.equal(typeof createApp, "function");
  assert.equal(typeof startServer, "function");
  assert.equal(typeof resolvePort, "function");
  assert.equal(typeof applyCors, "function");
  assert.equal(typeof ApiError, "function");
  assert.equal(typeof sendJson, "function");
  assert.equal(typeof sendError, "function");
  assert.ok(apiRoutes.length >= 20);
  assert.equal(API_NAME, "IELTS-API");
  assert.equal(VERSION, "1.0.0");
  assert.ok(CITATION_APA.includes("IELTS-API"));
  assert.ok(CITATION_BIBTEX.includes("@software"));
  assert.ok(RAW_SCORE_TABLES.listening.length > 0);
  assert.equal(rawToBand("listening", 30), 7);
  assert.equal(
    overallBand({ listening: 6, reading: 6, writing: 6, speaking: 7 }).overall,
    6.5,
  );
});

test("/v1/meta advertises counts, citation, and provenance", async () => {
  const { status, body } = await get(fixture, "/v1/meta");
  assert.equal(status, 200);
  const data = as<{
    data: {
      name: string;
      version: string;
      releaseDate: string;
      license: string;
      counts: Record<string, number>;
      citation: { apa: string; bibtex: string };
      provenance: string;
      disclaimer: string;
    };
  }>(body).data;
  assert.equal(data.name, "IELTS-API");
  assert.equal(data.license, "MIT");
  assert.ok(data.counts.words >= 40);
  assert.ok(data.counts.practiceQuestions >= 50);
  assert.ok(data.citation.bibtex.includes("@software"));
  assert.ok(data.provenance.includes("zhengyishiming"));
  assert.ok(data.disclaimer.includes("not affiliated"));
});
