/**
 * Core HTTP behaviour: routing, CORS, errors, OPTIONS, and lifecycle.
 */

import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import {
  as,
  get,
  post,
  request,
  startFixture,
  stopFixture,
  type Fixture,
} from "./helpers.js";
import type { Route } from "../src/router.js";
import { sendJson } from "../src/http.js";

let fixture: Fixture;

before(async () => {
  fixture = await startFixture();
});

after(async () => {
  await stopFixture(fixture);
});

test("GET / returns the service directory", async () => {
  const { status, headers, body } = await get(fixture, "/");
  assert.equal(status, 200);
  assert.equal(headers.get("content-type"), "application/json; charset=utf-8");
  const data = as<{ data: Record<string, unknown> }>(body).data;
  assert.equal(data.name, "IELTS-API");
  assert.equal(data.authentication, "none");
  assert.equal(data.rateLimit, "none");
  assert.ok(Array.isArray(data.endpoints));
  assert.ok((data.endpoints as unknown[]).length >= 20);
  assert.equal(
    typeof as<{ citation: { apa: string } }>(data).citation.apa,
    "string",
  );
});

test("GET /v1 lists only versioned endpoints", async () => {
  const { status, body } = await get(fixture, "/v1");
  assert.equal(status, 200);
  const data = as<{ data: { endpoints: { path: string }[] } }>(body).data;
  assert.ok(data.endpoints.length >= 15);
  assert.ok(data.endpoints.every((e) => e.path.startsWith("/v1")));
});

test("GET /health reports ok", async () => {
  const { status, body } = await get(fixture, "/health");
  assert.equal(status, 200);
  assert.equal(as<{ status: string }>(body).status, "ok");
});

test("CORS headers are sent on every response", async () => {
  const { headers } = await get(fixture, "/v1/words?limit=1");
  assert.equal(headers.get("access-control-allow-origin"), "*");
  assert.equal(
    headers.get("access-control-allow-methods"),
    "GET, POST, OPTIONS",
  );
});

test("OPTIONS returns 204 with CORS", async () => {
  const { status, headers } = await request(fixture, "/v1/words", {
    method: "OPTIONS",
  });
  assert.equal(status, 204);
  assert.equal(headers.get("access-control-allow-origin"), "*");
});

test("unknown paths return 404 with a JSON error body", async () => {
  const { status, body } = await get(fixture, "/v1/nope");
  assert.equal(status, 404);
  const error = as<{ error: { code: string } }>(body).error;
  assert.equal(error.code, "not_found");
});

test("double slashes do not match routes", async () => {
  const { status } = await get(fixture, "/v1//words");
  assert.equal(status, 404);
});

test("trailing slash is normalised away", async () => {
  const withSlash = await get(fixture, "/v1/words/");
  const withoutSlash = await get(fixture, "/v1/words");
  assert.equal(withSlash.status, 200);
  assert.equal(
    as<{ meta: { total: number } }>(withSlash.body).meta.total,
    as<{ meta: { total: number } }>(withoutSlash.body).meta.total,
  );
});

test("malformed percent-encoding in params is treated as no match", async () => {
  const { status } = await get(fixture, "/v1/words/%ZZ");
  assert.equal(status, 404);
});

test("decoded parameters reach handlers", async () => {
  const { status, body } = await get(
    fixture,
    `/v1/words/${encodeURIComponent("w001 ")}`,
  );
  assert.equal(status, 404);
  const error = as<{ error: { code: string; message: string } }>(body).error;
  assert.equal(error.code, "not_found");
  assert.ok(error.message.includes("w001 "));
});

test("disallowed methods return 405 with an Allow header", async () => {
  const { status, headers, body } = await request(fixture, "/v1/words", {
    method: "DELETE",
  });
  assert.equal(status, 405);
  assert.equal(headers.get("allow"), "GET");
  const error = as<{
    error: { code: string; details: { allowed: string[] } };
  }>(body).error;
  assert.equal(error.code, "method_not_allowed");
  assert.deepEqual(error.details.allowed, ["GET"]);
});

test("HEAD is rejected like any other unknown method", async () => {
  const { status } = await request(fixture, "/v1/words", { method: "HEAD" });
  assert.equal(status, 405);
});

test("unexpected handler errors become 500 without leaking details", async () => {
  const boom: Route = {
    method: "GET",
    path: "/__boom",
    summary: "test route that throws",
    handler: () => {
      throw new Error("secret internals");
    },
  };
  const probe = await startFixture([boom]);
  try {
    const { status, body } = await get(probe, "/__boom");
    assert.equal(status, 500);
    const error = as<{ error: { code: string; message: string } }>(body).error;
    assert.equal(error.code, "internal_error");
    assert.ok(!JSON.stringify(body).includes("secret internals"));
  } finally {
    await stopFixture(probe);
  }
});

test("handlers that never respond trigger handler_incomplete", async () => {
  const silent: Route = {
    method: "GET",
    path: "/__silent",
    summary: "test route that does nothing",
    handler: () => undefined,
  };
  const probe = await startFixture([silent]);
  try {
    const { status, body } = await get(probe, "/__silent");
    assert.equal(status, 500);
    assert.equal(
      as<{ error: { code: string } }>(body).error.code,
      "handler_incomplete",
    );
  } finally {
    await stopFixture(probe);
  }
});

test("errors thrown after responding do not corrupt the response", async () => {
  const late: Route = {
    method: "GET",
    path: "/__late",
    summary: "test route that responds then throws",
    handler: (ctx) => {
      sendJson(ctx.res, 200, { ok: true });
      throw new Error("late failure");
    },
  };
  const probe = await startFixture([late]);
  try {
    const { status, body } = await get(probe, "/__late");
    assert.equal(status, 200);
    assert.deepEqual(as<{ ok: boolean }>(body), { ok: true });
  } finally {
    await stopFixture(probe);
  }
});

test("malformed JSON bodies return 400", async () => {
  const { status, body } = await post(fixture, "/v1/bands/overall", "not json");
  assert.equal(status, 400);
  assert.equal(as<{ error: { code: string } }>(body).error.code, "bad_request");
});

test("the entrypoint module boots a real listener", async () => {
  const previous = process.env.PORT;
  process.env.PORT = "0";
  try {
    await import("../src/index.js");
  } finally {
    if (previous === undefined) {
      delete process.env.PORT;
    } else {
      process.env.PORT = previous;
    }
  }
});
