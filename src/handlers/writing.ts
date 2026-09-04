/**
 * Writing endpoints: tasks with model answers, and common mistakes.
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
import type { WritingMistake, WritingTask } from "../types.js";
import { MISTAKE_CATEGORIES, MODULES } from "../types.js";
import { writingMistakes, writingTasks, writingTopics } from "../data/index.js";

const WRITING_FORMATS = ["report", "letter", "essay"] as const;

function listTasks(ctx: RequestContext): void {
  const { query, res } = ctx;
  const task = parseOptionalInt(query.get("task"), "task", 1, 2);
  const format = parseEnumOption(
    query.get("format"),
    WRITING_FORMATS,
    "format",
  );
  const module = parseEnumOption(query.get("module"), MODULES, "module");
  const topic = parseEnumOption(query.get("topic"), writingTopics, "topic");
  const q = query.get("q");

  let items: readonly WritingTask[] = writingTasks;
  if (task !== null) {
    items = items.filter((t) => t.task === task);
  }
  if (format !== null) {
    items = items.filter((t) => t.format === format);
  }
  if (module !== null) {
    items = items.filter((t) => t.module === module);
  }
  if (topic !== null) {
    items = items.filter((t) => t.topic === topic);
  }
  if (q !== null) {
    items = items.filter((t) =>
      textMatches([t.prompt, t.topic, t.modelAnswer], q),
    );
  }

  const { page, limit } = parsePagination(query);
  sendJson(res, 200, paginate<WritingTask>(items, page, limit));
}

function getTask({ res, params }: RequestContext): void {
  const task = findById(writingTasks, params.id as string);
  if (task === undefined) {
    throw notFound(`Writing task '${params.id as string}' not found`);
  }
  sendJson(res, 200, { data: task });
}

function listTopics({ res }: RequestContext): void {
  sendJson(res, 200, { data: writingTopics, count: writingTopics.length });
}

function listMistakes(ctx: RequestContext): void {
  const { query, res } = ctx;
  const category = parseEnumOption(
    query.get("category"),
    MISTAKE_CATEGORIES,
    "category",
  );
  const q = query.get("q");

  let items: readonly WritingMistake[] = writingMistakes;
  if (category !== null) {
    items = items.filter((m) => m.category === category);
  }
  if (q !== null) {
    items = items.filter((m) =>
      textMatches([m.incorrect, m.corrected, m.explanation], q),
    );
  }

  const { page, limit } = parsePagination(query);
  sendJson(res, 200, paginate<WritingMistake>(items, page, limit));
}

function getMistake({ res, params }: RequestContext): void {
  const mistake = findById(writingMistakes, params.id as string);
  if (mistake === undefined) {
    throw notFound(`Writing mistake '${params.id as string}' not found`);
  }
  sendJson(res, 200, { data: mistake });
}

export const writingRoutes: readonly Route[] = [
  route(
    "GET",
    "/v1/writing/tasks",
    "List writing tasks with model answers",
    listTasks,
  ),
  route("GET", "/v1/writing/tasks/:id", "Get one writing task", getTask),
  route("GET", "/v1/writing/topics", "List writing task topics", listTopics),
  route(
    "GET",
    "/v1/writing/mistakes",
    "List common writing mistakes",
    listMistakes,
  ),
  route(
    "GET",
    "/v1/writing/mistakes/:id",
    "Get one writing mistake",
    getMistake,
  ),
];
