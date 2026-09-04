/**
 * /v1/speaking endpoints: parts 1-3, topics, and single lookup.
 */

import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { as, get, startFixture, stopFixture, type Fixture } from "./helpers.js";
import type {
  PaginatedList,
  SpeakingCueCard,
  SpeakingItem,
  SpeakingPart1,
} from "../src/types.js";
import { speakingItems } from "../src/data/index.js";

let fixture: Fixture;

before(async () => {
  fixture = await startFixture();
});

after(async () => {
  await stopFixture(fixture);
});

test("lists the whole speaking bank", async () => {
  const { status, body } = await get(fixture, "/v1/speaking?limit=100");
  assert.equal(status, 200);
  const payload = as<PaginatedList<SpeakingItem>>(body);
  assert.equal(payload.meta.total, speakingItems.length);
});

test("filters by part", async () => {
  const part1 = await get(fixture, "/v1/speaking?part=1");
  const list1 = as<PaginatedList<SpeakingItem>>(part1.body);
  assert.equal(list1.meta.total, 5);
  assert.ok(list1.data.every((item) => item.part === 1));

  const part2 = await get(fixture, "/v1/speaking?part=2");
  assert.equal(as<PaginatedList<SpeakingItem>>(part2.body).meta.total, 5);

  const part3 = await get(fixture, "/v1/speaking?part=3");
  assert.equal(as<PaginatedList<SpeakingItem>>(part3.body).meta.total, 4);

  const invalid = await get(fixture, "/v1/speaking?part=4");
  assert.equal(invalid.status, 400);
});

test("filters by topic", async () => {
  const technology = await get(fixture, "/v1/speaking?topic=technology");
  const payload = as<PaginatedList<SpeakingItem>>(technology.body);
  assert.equal(payload.meta.total, 1);
  assert.equal(payload.data[0]!.id, "sp-204");

  const badTopic = await get(fixture, "/v1/speaking?topic=space");
  assert.equal(badTopic.status, 400);
});

test("free-text search hits part 2 prompts and part 1 questions", async () => {
  const prompt = await get(fixture, "/v1/speaking?q=relax");
  assert.equal(as<PaginatedList<SpeakingItem>>(prompt.body).meta.total, 1);

  const questions = await get(fixture, "/v1/speaking?q=free+time");
  assert.ok(as<PaginatedList<SpeakingItem>>(questions.body).meta.total >= 1);
});

test("single item lookups", async () => {
  const cueCard = await get(fixture, "/v1/speaking/sp-201");
  assert.equal(cueCard.status, 200);
  const card = as<{ data: SpeakingCueCard }>(cueCard.body).data;
  assert.equal(card.part, 2);
  assert.ok(card.points.length === 4);
  assert.ok(card.sampleAnswer.split(/\s+/).length > 80);
  assert.ok(card.keyVocabulary.length >= 3);

  const part1 = await get(fixture, "/v1/speaking/sp-101");
  const topic = as<{ data: SpeakingPart1 }>(part1.body).data;
  assert.equal(topic.questions.length, 5);

  const missing = await get(fixture, "/v1/speaking/sp-999");
  assert.equal(missing.status, 404);
});

test("topics endpoint lists distinct speaking topics", async () => {
  const { body } = await get(fixture, "/v1/speaking/topics");
  const payload = as<{ data: string[]; count: number }>(body);
  assert.equal(
    payload.count,
    new Set(speakingItems.map((item) => item.topic)).size,
  );
});
