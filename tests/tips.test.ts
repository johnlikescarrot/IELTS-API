/**
 * /v1/tips endpoints.
 */

import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { as, get, startFixture, stopFixture, type Fixture } from "./helpers.js";
import type { PaginatedList, Tip } from "../src/types.js";
import { tips } from "../src/data/index.js";

let fixture: Fixture;

before(async () => {
  fixture = await startFixture();
});

after(async () => {
  await stopFixture(fixture);
});

test("lists all tips", async () => {
  const { status, body } = await get(fixture, "/v1/tips?limit=100");
  assert.equal(status, 200);
  const payload = as<PaginatedList<Tip>>(body);
  assert.equal(payload.meta.total, tips.length);
  assert.ok(payload.data.every((tip) => tip.title.length > 0));
});

test("filters by skill", async () => {
  const listening = await get(fixture, "/v1/tips?skill=listening");
  const payload = as<PaginatedList<Tip>>(listening.body);
  assert.ok(payload.data.every((tip) => tip.skill === "listening"));
  assert.equal(
    payload.meta.total,
    tips.filter((tip) => tip.skill === "listening").length,
  );

  const general = await get(fixture, "/v1/tips?skill=general");
  assert.ok(
    as<PaginatedList<Tip>>(general.body).data.every(
      (tip) => tip.skill === "general",
    ),
  );

  const invalid = await get(fixture, "/v1/tips?skill=typography");
  assert.equal(invalid.status, 400);
});

test("single tip lookup and 404", async () => {
  const found = await get(fixture, "/v1/tips/tip-001");
  assert.equal(found.status, 200);
  assert.equal(as<{ data: Tip }>(found.body).data.skill, "listening");

  const missing = await get(fixture, "/v1/tips/tip-999");
  assert.equal(missing.status, 404);
});
