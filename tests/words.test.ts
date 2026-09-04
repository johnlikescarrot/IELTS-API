/**
 * /v1/words endpoints: filters, sorting, pagination, and lookup.
 */

import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { as, get, startFixture, stopFixture, type Fixture } from "./helpers.js";
import type { PaginatedList, Word } from "../src/types.js";
import { words } from "../src/data/index.js";

let fixture: Fixture;

before(async () => {
  fixture = await startFixture();
});

after(async () => {
  await stopFixture(fixture);
});

function list(query = ""): Promise<{ status: number; body: unknown }> {
  return get(fixture, `/v1/words${query}`);
}

test("lists vocabulary with the default envelope", async () => {
  const { status, body } = await list();
  assert.equal(status, 200);
  const payload = as<PaginatedList<Word>>(body);
  assert.equal(payload.meta.total, words.length);
  assert.equal(payload.meta.page, 1);
  assert.equal(payload.meta.limit, 20);
  assert.equal(payload.data.length, 20);
});

test("default sort is word ascending", async () => {
  const { body } = await list("?limit=100");
  const data = as<PaginatedList<Word>>(body).data;
  const sorted = [...data]
    .map((w) => w.word)
    .sort((a, b) => a.localeCompare(b));
  assert.deepEqual(
    data.map((w) => w.word),
    sorted,
  );
});

test("pagination walks pages and honours limit", async () => {
  const page2 = await list("?page=2&limit=5");
  const payload = as<PaginatedList<Word>>(page2.body);
  assert.equal(payload.meta.page, 2);
  assert.equal(payload.meta.pages, Math.ceil(words.length / 5));
  assert.equal(payload.data.length, 5);
  const firstPage = as<PaginatedList<Word>>((await list("?limit=5")).body);
  assert.notEqual(payload.data[0]!.id, firstPage.data[0]!.id);
});

test("invalid pagination parameters are rejected", async () => {
  for (const bad of [
    "?page=0",
    "?page=-1",
    "?page=abc",
    "?page=1.5",
    "?limit=0",
    "?limit=101",
    "?limit=many",
  ]) {
    const { status } = await list(bad);
    assert.equal(status, 400, `expected 400 for ${bad}`);
  }
});

test("filter by topic", async () => {
  const { status, body } = await list("?topic=environment");
  assert.equal(status, 200);
  const payload = as<PaginatedList<Word>>(body);
  assert.ok(payload.data.every((w) => w.topic === "environment"));
  assert.equal(
    payload.meta.total,
    words.filter((w) => w.topic === "environment").length,
  );
});

test("unknown topics are rejected", async () => {
  const { status } = await list("?topic=Environment");
  assert.equal(status, 400);
});

test("filter by part of speech", async () => {
  const { body } = await list("?pos=verb");
  const payload = as<PaginatedList<Word>>(body);
  assert.ok(payload.data.length > 0);
  assert.ok(payload.data.every((w) => w.partOfSpeech === "verb"));
});

test("filter by band, including out-of-range values", async () => {
  const valid = await list("?band=8");
  const payload = as<PaginatedList<Word>>(valid.body);
  assert.ok(payload.data.every((w) => w.band === 8));

  const empty = await list("?band=5");
  assert.equal(as<PaginatedList<Word>>(empty.body).meta.total, 0);

  for (const bad of ["?band=4", "?band=10", "?band=8.5", "?band=eight"]) {
    const { status } = await list(bad);
    assert.equal(status, 400, `expected 400 for ${bad}`);
  }
});

test("free-text search spans word, meaning, example, and collocations", async () => {
  const byWord = await list("?q=renewable");
  assert.equal(as<PaginatedList<Word>>(byWord.body).meta.total, 1);

  const byCollocation = await list("?q=carbon emissions");
  assert.ok(as<PaginatedList<Word>>(byCollocation.body).meta.total >= 1);

  const none = await list("?q=zzzznothing");
  assert.equal(as<PaginatedList<Word>>(none.body).meta.total, 0);
});

test("sorting by every field in both directions", async () => {
  const byBandDesc = await list("?sort=band&order=desc&limit=100");
  const desc = as<PaginatedList<Word>>(byBandDesc.body).data;
  assert.equal(desc[0]!.band, 8);
  assert.equal(desc[desc.length - 1]!.band, 6);

  const byBandAsc = await list("?sort=band&limit=100");
  const asc = as<PaginatedList<Word>>(byBandAsc.body).data;
  assert.equal(asc[0]!.band, 6);

  const byTopic = await list("?sort=topic&limit=100");
  const topics = as<PaginatedList<Word>>(byTopic.body).data.map((w) => w.topic);
  assert.deepEqual(
    topics,
    [...topics].sort((a, b) => a.localeCompare(b)),
  );

  const byIdDesc = await list("?sort=id&order=desc&limit=1");
  assert.equal(
    as<PaginatedList<Word>>(byIdDesc.body).data[0]!.id,
    `w${String(words.length).padStart(3, "0")}`,
  );

  const byWordDesc = await list("?sort=word&order=desc&limit=1");
  const lastWord = [...words]
    .map((w) => w.word)
    .sort((a, b) => a.localeCompare(b))[words.length - 1]!;
  assert.equal(
    as<PaginatedList<Word>>(byWordDesc.body).data[0]!.word,
    lastWord,
  );
});

test("invalid sort and order values are rejected", async () => {
  assert.equal((await list("?sort=length")).status, 400);
  assert.equal((await list("?order=random")).status, 400);
});

test("combined filters compose", async () => {
  const { body } = await list("?topic=technology&band=8&pos=noun");
  const payload = as<PaginatedList<Word>>(body);
  assert.ok(payload.data.length > 0);
  assert.ok(
    payload.data.every(
      (w) =>
        w.topic === "technology" && w.band === 8 && w.partOfSpeech === "noun",
    ),
  );
});

test("topics endpoint lists distinct topics", async () => {
  const { status, body } = await get(fixture, "/v1/words/topics");
  assert.equal(status, 200);
  const payload = as<{ data: string[]; count: number }>(body);
  assert.equal(payload.data.length, new Set(words.map((w) => w.topic)).size);
  assert.ok(payload.data.includes("environment"));
  assert.deepEqual(
    payload.data,
    [...payload.data].sort((a, b) => a.localeCompare(b)),
  );
});

test("single word lookup and 404", async () => {
  const found = await get(fixture, "/v1/words/w001");
  assert.equal(found.status, 200);
  assert.equal(as<{ data: Word }>(found.body).data.word, "curriculum");

  const missing = await get(fixture, "/v1/words/w999");
  assert.equal(missing.status, 404);
  assert.equal(
    as<{ error: { code: string } }>(missing.body).error.code,
    "not_found",
  );
});
