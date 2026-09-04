/**
 * Practice-test endpoints: reading and listening tests, sections, and a
 * flattened, filterable question bank.
 */

import type { RequestContext, Route } from "../router.js";
import { route } from "../router.js";
import { notFound, sendJson } from "../http.js";
import {
  paginate,
  parseOptionalInt,
  parsePagination,
} from "../lib/pagination.js";
import { findById, parseEnumOption, textMatches } from "../lib/collections.js";
import type { PracticeTest, QuestionRef } from "../types.js";
import { MODULES, QUESTION_TYPES, TEST_SKILLS } from "../types.js";
import { allQuestions, practiceTests, sectionsById } from "../data/index.js";

function listTests(ctx: RequestContext): void {
  const { query, res } = ctx;
  const skill = parseEnumOption(query.get("skill"), TEST_SKILLS, "skill");
  const module = parseEnumOption(query.get("module"), MODULES, "module");
  const q = query.get("q");

  let items: readonly PracticeTest[] = practiceTests;
  if (skill !== null) {
    items = items.filter((t) => t.skill === skill);
  }
  if (module !== null) {
    // Listening applies to both modules, so it matches every filter value.
    items = items.filter((t) => t.module === module || t.module === "both");
  }
  if (q !== null) {
    items = items.filter((t) => textMatches([t.title, t.id], q));
  }

  const { page, limit } = parsePagination(query);
  sendJson(res, 200, paginate<PracticeTest>(items, page, limit));
}

function getTest({ res, params }: RequestContext): void {
  const test = findById(practiceTests, params.id as string);
  if (test === undefined) {
    throw notFound(`Test '${params.id as string}' not found`);
  }
  sendJson(res, 200, { data: test });
}

function getSection({ res, params }: RequestContext): void {
  const ref = sectionsById.get(params.id as string);
  if (ref === undefined) {
    throw notFound(`Section '${params.id as string}' not found`);
  }
  sendJson(res, 200, {
    data: {
      testId: ref.test.id,
      testTitle: ref.test.title,
      skill: ref.test.skill,
      ...ref.section,
    },
  });
}

function listQuestions(ctx: RequestContext): void {
  const { query, res } = ctx;
  const testId = query.get("testId");
  const sectionId = query.get("sectionId");
  const skill = parseEnumOption(query.get("skill"), TEST_SKILLS, "skill");
  const type = parseEnumOption(query.get("type"), QUESTION_TYPES, "type");
  const band = parseOptionalInt(query.get("band"), "band", 5, 9);
  const q = query.get("q");

  let items: readonly QuestionRef[] = allQuestions;
  if (testId !== null) {
    items = items.filter((item) => item.testId === testId);
  }
  if (sectionId !== null) {
    items = items.filter((item) => item.sectionId === sectionId);
  }
  if (skill !== null) {
    items = items.filter((item) => item.skill === skill);
  }
  if (type !== null) {
    items = items.filter((item) => item.type === type);
  }
  if (band !== null) {
    items = items.filter((item) => item.band === band);
  }
  if (q !== null) {
    items = items.filter((item) =>
      textMatches([item.prompt, item.explanation], q),
    );
  }

  const { page, limit } = parsePagination(query);
  sendJson(res, 200, paginate<QuestionRef>(items, page, limit));
}

export const practiceRoutes: readonly Route[] = [
  route(
    "GET",
    "/v1/practice/tests",
    "List practice tests (reading, listening)",
    listTests,
  ),
  route("GET", "/v1/practice/tests/:id", "Get a full practice test", getTest),
  route(
    "GET",
    "/v1/practice/sections/:id",
    "Get one section of a test",
    getSection,
  ),
  route(
    "GET",
    "/v1/practice/questions",
    "Search the question bank",
    listQuestions,
  ),
];
