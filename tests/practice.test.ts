/**
 * /v1/practice endpoints: tests, sections, and the question bank.
 */

import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { as, get, startFixture, stopFixture, type Fixture } from "./helpers.js";
import type {
  ListeningTest,
  PaginatedList,
  PracticeTest,
  QuestionRef,
  ReadingTest,
} from "../src/types.js";
import { allQuestions, practiceTests } from "../src/data/index.js";

let fixture: Fixture;

before(async () => {
  fixture = await startFixture();
});

after(async () => {
  await stopFixture(fixture);
});

test("lists all practice tests", async () => {
  const { status, body } = await get(fixture, "/v1/practice/tests");
  assert.equal(status, 200);
  const payload = as<PaginatedList<PracticeTest>>(body);
  assert.equal(payload.meta.total, practiceTests.length);
  assert.deepEqual(
    payload.data.map((t) => t.id),
    practiceTests.map((t) => t.id),
  );
});

test("filters by skill", async () => {
  const reading = await get(fixture, "/v1/practice/tests?skill=reading");
  const readingList = as<PaginatedList<PracticeTest>>(reading.body);
  assert.ok(readingList.data.every((t) => t.skill === "reading"));
  assert.equal(readingList.meta.total, 2);

  const listening = await get(fixture, "/v1/practice/tests?skill=listening");
  assert.equal(as<PaginatedList<PracticeTest>>(listening.body).meta.total, 2);

  const invalid = await get(fixture, "/v1/practice/tests?skill=writing");
  assert.equal(invalid.status, 400);
});

test("module filter includes listening tests for both modules", async () => {
  const academic = await get(fixture, "/v1/practice/tests?module=academic");
  const academicList = as<PaginatedList<PracticeTest>>(academic.body);
  assert.equal(academicList.meta.total, 4);
  assert.ok(
    academicList.data.every(
      (t) => t.module === "academic" || t.module === "both",
    ),
  );

  const gt = await get(fixture, "/v1/practice/tests?module=general_training");
  const gtList = as<PaginatedList<PracticeTest>>(gt.body);
  assert.equal(gtList.meta.total, 2);
  assert.ok(gtList.data.every((t) => t.module === "both"));

  const invalid = await get(fixture, "/v1/practice/tests?module=school");
  assert.equal(invalid.status, 400);
});

test("free-text search on tests", async () => {
  const { body } = await get(fixture, "/v1/practice/tests?q=Science");
  assert.equal(as<PaginatedList<PracticeTest>>(body).meta.total, 1);

  const none = await get(fixture, "/v1/practice/tests?q=zzzz");
  assert.equal(as<PaginatedList<PracticeTest>>(none.body).meta.total, 0);
});

test("full test retrieval by id", async () => {
  const reading = await get(fixture, "/v1/practice/tests/rt-001");
  assert.equal(reading.status, 200);
  const readingTest = as<{ data: ReadingTest }>(reading.body).data;
  assert.equal(readingTest.sections.length, 3);
  assert.ok(readingTest.sections[0]!.passage.includes("Antikythera"));

  const listening = await get(fixture, "/v1/practice/tests/lt-001");
  const listeningTest = as<{ data: ListeningTest }>(listening.body).data;
  assert.equal(listeningTest.module, "both");
  assert.ok(listeningTest.sections[0]!.transcript.length > 200);

  const missing = await get(fixture, "/v1/practice/tests/rt-999");
  assert.equal(missing.status, 404);
});

test("section lookup by id", async () => {
  const { status, body } = await get(
    fixture,
    "/v1/practice/sections/rt-001-s1",
  );
  assert.equal(status, 200);
  const section = as<{
    data: { testId: string; testTitle: string; skill: string; title: string };
  }>(body).data;
  assert.equal(section.testId, "rt-001");
  assert.equal(section.skill, "reading");
  assert.equal(section.title, "The Antikythera Mechanism");

  const listeningSection = await get(
    fixture,
    "/v1/practice/sections/lt-002-s2",
  );
  const listeningData = as<{
    data: { skill: string; scenario: string };
  }>(listeningSection.body).data;
  assert.equal(listeningData.skill, "listening");
  assert.ok(listeningData.scenario.includes("radio"));

  const missing = await get(fixture, "/v1/practice/sections/rt-001-s99");
  assert.equal(missing.status, 404);
});

test("question bank pagination covers every question", async () => {
  const { status, body } = await get(
    fixture,
    "/v1/practice/questions?limit=100",
  );
  assert.equal(status, 200);
  const payload = as<PaginatedList<QuestionRef>>(body);
  assert.equal(payload.meta.total, allQuestions.length);
  assert.equal(payload.data.length, allQuestions.length);
});

test("question bank filters", async () => {
  const byTest = await get(fixture, "/v1/practice/questions?testId=lt-001");
  assert.equal(
    as<PaginatedList<QuestionRef>>(byTest.body).meta.total,
    allQuestions.filter((q) => q.testId === "lt-001").length,
  );

  const bySection = await get(
    fixture,
    "/v1/practice/questions?sectionId=rt-001-s2",
  );
  const sectionQuestions = as<PaginatedList<QuestionRef>>(bySection.body);
  assert.equal(sectionQuestions.meta.total, 6);
  assert.ok(sectionQuestions.data.every((q) => q.sectionId === "rt-001-s2"));

  const bySkill = await get(fixture, "/v1/practice/questions?skill=listening");
  assert.equal(
    as<PaginatedList<QuestionRef>>(bySkill.body).meta.total,
    allQuestions.filter((q) => q.skill === "listening").length,
  );

  const byType = await get(
    fixture,
    "/v1/practice/questions?type=multiple_choice",
  );
  const typeQuestions = as<PaginatedList<QuestionRef>>(byType.body);
  assert.ok(typeQuestions.data.length > 0);
  assert.ok(typeQuestions.data.every((q) => q.type === "multiple_choice"));

  const byBand = await get(fixture, "/v1/practice/questions?band=8");
  assert.ok(
    as<PaginatedList<QuestionRef>>(byBand.body).data.every((q) => q.band === 8),
  );

  const invalidType = await get(fixture, "/v1/practice/questions?type=essay");
  assert.equal(invalidType.status, 400);

  const unknownTest = await get(
    fixture,
    "/v1/practice/questions?testId=rt-999",
  );
  assert.equal(as<PaginatedList<QuestionRef>>(unknownTest.body).meta.total, 0);
});

test("question bank free-text search finds explanations", async () => {
  const { body } = await get(fixture, "/v1/practice/questions?q=sponge");
  const payload = as<PaginatedList<QuestionRef>>(body);
  assert.ok(payload.meta.total >= 1);
});
