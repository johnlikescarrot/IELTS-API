/**
 * /v1/writing endpoints: tasks with model answers, and common mistakes.
 */

import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { as, get, startFixture, stopFixture, type Fixture } from "./helpers.js";
import type {
  PaginatedList,
  WritingMistake,
  WritingTask,
} from "../src/types.js";
import { writingMistakes, writingTasks } from "../src/data/index.js";

let fixture: Fixture;

before(async () => {
  fixture = await startFixture();
});

after(async () => {
  await stopFixture(fixture);
});

test("lists all writing tasks", async () => {
  const { status, body } = await get(fixture, "/v1/writing/tasks");
  assert.equal(status, 200);
  const payload = as<PaginatedList<WritingTask>>(body);
  assert.equal(payload.meta.total, writingTasks.length);
});

test("filters by task number", async () => {
  const task1 = await get(fixture, "/v1/writing/tasks?task=1");
  const list1 = as<PaginatedList<WritingTask>>(task1.body);
  assert.equal(list1.meta.total, 4);
  assert.ok(list1.data.every((t) => t.task === 1));

  const task2 = await get(fixture, "/v1/writing/tasks?task=2");
  assert.ok(
    as<PaginatedList<WritingTask>>(task2.body).data.every((t) => t.task === 2),
  );

  const invalid = await get(fixture, "/v1/writing/tasks?task=3");
  assert.equal(invalid.status, 400);
});

test("filters by format and module", async () => {
  const letters = await get(fixture, "/v1/writing/tasks?format=letter");
  const letterList = as<PaginatedList<WritingTask>>(letters.body);
  assert.equal(letterList.meta.total, 1);
  assert.equal(letterList.data[0]!.module, "general_training");

  const essays = await get(fixture, "/v1/writing/tasks?format=essay");
  assert.equal(as<PaginatedList<WritingTask>>(essays.body).meta.total, 4);

  const gt = await get(fixture, "/v1/writing/tasks?module=general_training");
  assert.equal(as<PaginatedList<WritingTask>>(gt.body).meta.total, 1);

  const badFormat = await get(fixture, "/v1/writing/tasks?format=poem");
  assert.equal(badFormat.status, 400);
});

test("filters by topic and free text", async () => {
  const environment = await get(fixture, "/v1/writing/tasks?topic=environment");
  assert.equal(
    as<PaginatedList<WritingTask>>(environment.body).meta.total,
    writingTasks.filter((t) => t.topic === "environment").length,
  );

  const badTopic = await get(fixture, "/v1/writing/tasks?topic=space");
  assert.equal(badTopic.status, 400);

  const search = await get(fixture, "/v1/writing/tasks?q=plastic");
  assert.ok(as<PaginatedList<WritingTask>>(search.body).meta.total >= 1);
});

test("single task lookup returns the full model answer", async () => {
  const { status, body } = await get(fixture, "/v1/writing/tasks/wt-005");
  assert.equal(status, 200);
  const task = as<{ data: WritingTask }>(body).data;
  assert.equal(task.task, 2);
  assert.equal(task.modelBand, 8);
  assert.ok(task.modelAnswer.length > 500);
  assert.ok(task.keyPoints.length >= 3);

  const missing = await get(fixture, "/v1/writing/tasks/wt-999");
  assert.equal(missing.status, 404);
});

test("topics endpoint lists distinct writing topics", async () => {
  const { body } = await get(fixture, "/v1/writing/topics");
  const payload = as<{ data: string[]; count: number }>(body);
  assert.equal(payload.count, new Set(writingTasks.map((t) => t.topic)).size);
});

test("mistakes list and filters", async () => {
  const all = await get(fixture, "/v1/writing/mistakes");
  const allList = as<PaginatedList<WritingMistake>>(all.body);
  assert.equal(allList.meta.total, writingMistakes.length);

  const grammar = await get(fixture, "/v1/writing/mistakes?category=grammar");
  const grammarList = as<PaginatedList<WritingMistake>>(grammar.body);
  assert.ok(grammarList.data.length > 0);
  assert.ok(grammarList.data.every((m) => m.category === "grammar"));

  const badCategory = await get(fixture, "/v1/writing/mistakes?category=logic");
  assert.equal(badCategory.status, 400);

  const search = await get(fixture, "/v1/writing/mistakes?q=unique");
  assert.equal(as<PaginatedList<WritingMistake>>(search.body).meta.total, 1);
});

test("single mistake lookup and 404", async () => {
  const found = await get(fixture, "/v1/writing/mistakes/wm-001");
  assert.equal(found.status, 200);
  const mistake = as<{ data: WritingMistake }>(found.body).data;
  assert.equal(mistake.category, "grammar");
  assert.notEqual(mistake.incorrect, mistake.corrected);

  const missing = await get(fixture, "/v1/writing/mistakes/wm-999");
  assert.equal(missing.status, 404);
});
