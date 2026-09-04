/**
 * /v1/bands endpoints: tables, calculator (GET + POST), overall averaging.
 */

import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import {
  as,
  get,
  post,
  startFixture,
  stopFixture,
  type Fixture,
} from "./helpers.js";
import type { BandBracket } from "../src/types.js";

let fixture: Fixture;

before(async () => {
  fixture = await startFixture();
});

after(async () => {
  await stopFixture(fixture);
});

test("tables expose all three conversion tables", async () => {
  const { status, body } = await get(fixture, "/v1/bands/tables");
  assert.equal(status, 200);
  const payload = as<{
    data: Record<string, readonly BandBracket[]>;
    note: string;
    disclaimer: string;
  }>(body);
  assert.deepEqual(Object.keys(payload.data).sort(), [
    "academic_reading",
    "general_training_reading",
    "listening",
  ]);
  const listening = payload.data.listening!;
  assert.equal(listening[0]!.band, 9);
  assert.equal(listening[listening.length - 1]!.minRaw, 0);
  assert.ok(payload.note.includes("indicative"));
});

test("calculator converts representative raw scores", async () => {
  const cases: { skill: string; raw: number; band: number }[] = [
    { skill: "listening", raw: 30, band: 7 },
    { skill: "listening", raw: 39, band: 9 },
    { skill: "listening", raw: 0, band: 1 },
    { skill: "academic_reading", raw: 23, band: 6 },
    { skill: "academic_reading", raw: 40, band: 9 },
    { skill: "general_training_reading", raw: 40, band: 9 },
    { skill: "general_training_reading", raw: 39, band: 8.5 },
  ];
  for (const expected of cases) {
    const { status, body } = await get(
      fixture,
      `/v1/bands/calculator?skill=${expected.skill}&raw=${expected.raw}`,
    );
    assert.equal(status, 200, `expected 200 for ${JSON.stringify(expected)}`);
    const data = as<{
      data: { skill: string; raw: number; band: number; indicative: boolean };
    }>(body).data;
    assert.equal(data.band, expected.band);
    assert.equal(data.indicative, true);
  }
});

test("calculator validates its inputs (GET)", async () => {
  const bad = [
    "",
    "&raw=30",
    "?skill=listening",
    "?skill=listening&raw=",
    "?skill=writing&raw=30",
    "?skill=listening&raw=41",
    "?skill=listening&raw=-1",
    "?skill=listening&raw=6.5",
    "?skill=listening&raw=thirty",
  ];
  for (const query of bad) {
    const path =
      query.startsWith("?") || query === ""
        ? `/v1/bands/calculator${query}`
        : `/v1/bands/calculator?${query}`;
    const { status } = await get(fixture, path);
    assert.equal(status, 400, `expected 400 for ${path}`);
  }
});

test("calculator accepts JSON bodies (POST)", async () => {
  const valid = await post(
    fixture,
    "/v1/bands/calculator",
    '{"skill":"listening","raw":30}',
  );
  assert.equal(valid.status, 200);
  assert.equal(as<{ data: { band: number } }>(valid.body).data.band, 7);

  const rawAsString = await post(
    fixture,
    "/v1/bands/calculator",
    '{"skill":"academic_reading","raw":"23"}',
  );
  assert.equal(rawAsString.status, 200);
  assert.equal(as<{ data: { band: number } }>(rawAsString.body).data.band, 6);
});

test("calculator rejects invalid bodies (POST)", async () => {
  const bad = [
    "not json",
    "[1,2,3]",
    '"hello"',
    "null",
    "{}",
    '{"skill":"listening"}',
    '{"raw":30}',
    '{"skill":42,"raw":30}',
    '{"skill":"listening","raw":50}',
    '{"skill":"listening","raw":true}',
  ];
  for (const payload of bad) {
    const { status } = await post(fixture, "/v1/bands/calculator", payload);
    assert.equal(status, 400, `expected 400 for ${payload}`);
  }
});

test("overall averages and applies the .25-up rounding rule", async () => {
  const cases: { input: object; overall: number }[] = [
    {
      input: { listening: 7.5, reading: 7, writing: 6, speaking: 6.5 },
      overall: 7,
    },
    {
      input: { listening: 6, reading: 6, writing: 6, speaking: 6 },
      overall: 6,
    },
    {
      input: { listening: 6, reading: 6, writing: 6, speaking: 6.5 },
      overall: 6,
    },
    {
      input: { listening: 6, reading: 6, writing: 6, speaking: 7 },
      overall: 6.5,
    },
    {
      input: { listening: 9, reading: 9, writing: 9, speaking: 9 },
      overall: 9,
    },
    {
      input: { listening: 0, reading: 0, writing: 0, speaking: 0 },
      overall: 0,
    },
  ];
  for (const expected of cases) {
    const { status, body } = await post(
      fixture,
      "/v1/bands/overall",
      JSON.stringify(expected.input),
    );
    assert.equal(
      status,
      200,
      `expected 200 for ${JSON.stringify(expected.input)}`,
    );
    const data = as<{
      data: {
        overall: number;
        listening: number;
        reading: number;
        writing: number;
        speaking: number;
        rounding: string;
      };
    }>(body).data;
    assert.equal(data.overall, expected.overall);
    assert.equal(
      data.listening,
      as<{ listening: number }>(expected.input).listening,
    );
    assert.ok(data.rounding.includes("half band"));
  }
});

test("overall validates component bands", async () => {
  const bad = [
    "[]",
    "42",
    '{"listening":7.5,"reading":7,"writing":6}',
    '{"listening":7.5,"reading":7,"writing":6,"speaking":6.3}',
    '{"listening":-1,"reading":7,"writing":6,"speaking":6}',
    '{"listening":9.5,"reading":7,"writing":6,"speaking":6}',
    '{"listening":"7.5","reading":7,"writing":6,"speaking":6}',
    '{"listening":null,"reading":7,"writing":6,"speaking":6}',
  ];
  for (const payload of bad) {
    const { status } = await post(fixture, "/v1/bands/overall", payload);
    assert.equal(status, 400, `expected 400 for ${payload}`);
  }
});

test("overall GET is method-not-allowed", async () => {
  const { status, headers } = await get(fixture, "/v1/bands/overall");
  assert.equal(status, 405);
  assert.equal(headers.get("allow"), "POST");
});
