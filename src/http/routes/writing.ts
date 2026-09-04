/**
 * Writing endpoints: the prompt corpus, the common-mistake rule base and the
 * transparent band estimator.
 *
 * @packageDocumentation
 */

import { ApiError } from "../../core/errors.ts";
import { sample } from "../../core/random.ts";
import { MODULES, type Module } from "../../core/types.ts";
import {
  MISTAKE_CATEGORIES,
  MISTAKE_RULES,
  MISTAKE_SEVERITIES,
} from "../../data/mistakes.ts";
import {
  WRITING_TASKS,
  WRITING_TASK_TYPES,
  type WritingTask,
} from "../../data/writing-tasks.ts";
import { analyseWriting } from "../../analysis/writing.ts";
import { countIssues, detectIssues } from "../../analysis/issues.ts";
import {
  asObject,
  optionalEnum,
  optionalNumber,
  optionalString,
  pagination,
  parseJsonBody,
  requiredStringField,
} from "../params.ts";
import { collection, json } from "../respond.ts";
import type { ApiRequest } from "../respond.ts";
import type { RouteDefinition } from "../route.ts";

/** Maximum number of characters accepted by the analysis endpoints. */
export const MAX_TEXT_LENGTH = 20_000;

function filterTasks(
  module: Module | undefined,
  taskNumber: number | undefined,
  type: string | undefined,
  topic: string | undefined,
): WritingTask[] {
  return WRITING_TASKS.filter((task) => {
    if (module !== undefined && task.module !== module) {
      return false;
    }
    if (taskNumber !== undefined && task.task !== taskNumber) {
      return false;
    }
    if (type !== undefined && task.type !== type) {
      return false;
    }
    if (topic !== undefined && !task.topic.includes(topic.toLowerCase())) {
      return false;
    }
    return true;
  });
}

function readText(request: ApiRequest): string {
  const source = asObject(parseJsonBody(request), "The request body");
  const text = requiredStringField(source, "text");
  if (text.length > MAX_TEXT_LENGTH) {
    throw new ApiError(
      "payload_too_large",
      `The 'text' field is limited to ${String(MAX_TEXT_LENGTH)} characters.`,
      { limit: MAX_TEXT_LENGTH, received: text.length },
    );
  }
  return text;
}

function readTaskNumber(source: Record<string, unknown>): 1 | 2 {
  const value = source["task"];
  if (value === undefined) {
    return 2;
  }
  if (value === 1 || value === 2 || value === "1" || value === "2") {
    return Number(value) === 1 ? 1 : 2;
  }
  throw new ApiError("invalid_parameter", "The 'task' field must be 1 or 2.", {
    field: "task",
    received: value,
  });
}

const TEXT_BODY_SCHEMA = {
  type: "object",
  required: ["text"],
  properties: {
    text: {
      type: "string",
      maxLength: MAX_TEXT_LENGTH,
      description: "The candidate response to analyse.",
    },
  },
};

/** Writing routes. */
export const writingRoutes: readonly RouteDefinition[] = [
  {
    method: "GET",
    path: "/v1/writing/tasks/random",
    operationId: "sampleWritingTasks",
    summary: "A reproducible random Writing prompt",
    description:
      "Draws prompts from the corpus with a seeded generator so that practice sets can be reproduced exactly.",
    tags: ["writing"],
    parameters: [
      {
        name: "count",
        in: "query",
        description: "Number of prompts to draw, 1 to 10. Defaults to 1.",
        schema: { type: "integer", minimum: 1, maximum: 10 },
      },
      {
        name: "seed",
        in: "query",
        description: "Seed for the generator. Defaults to 0.",
        schema: { type: "integer", minimum: 0 },
      },
      {
        name: "task",
        in: "query",
        description: "Restrict to Task 1 or Task 2.",
        schema: { type: "integer", enum: [1, 2] },
      },
      {
        name: "module",
        in: "query",
        description: "Restrict to a module.",
        schema: { type: "string", enum: [...MODULES] },
      },
    ],
    handler: ({ request }) => {
      const count =
        optionalNumber(request.query, "count", {
          min: 1,
          max: 10,
          integer: true,
        }) ?? 1;
      const seed =
        optionalNumber(request.query, "seed", { min: 0, integer: true }) ?? 0;
      const taskNumber = optionalNumber(request.query, "task", {
        min: 1,
        max: 2,
        integer: true,
      });
      const module = optionalEnum(request.query, "module", MODULES);
      const population = filterTasks(module, taskNumber, undefined, undefined);
      return collection(sample(population, count, seed), {
        seed,
        total: population.length,
      });
    },
  },
  {
    method: "GET",
    path: "/v1/writing/tasks",
    operationId: "listWritingTasks",
    summary: "Browse the Writing prompt corpus",
    description:
      "Returns Writing prompts filtered by module, task number, question type or topic.",
    tags: ["writing"],
    parameters: [
      {
        name: "module",
        in: "query",
        description: "Test module.",
        schema: { type: "string", enum: [...MODULES] },
      },
      {
        name: "task",
        in: "query",
        description: "Task number, 1 or 2.",
        schema: { type: "integer", enum: [1, 2] },
      },
      {
        name: "type",
        in: "query",
        description: "Question format.",
        schema: { type: "string", enum: [...WRITING_TASK_TYPES] },
      },
      {
        name: "topic",
        in: "query",
        description:
          "Case-insensitive substring matched against the topic label.",
        schema: { type: "string" },
      },
      {
        name: "limit",
        in: "query",
        description: "Maximum number of prompts to return.",
        schema: { type: "integer", minimum: 1, maximum: 1000 },
      },
      {
        name: "offset",
        in: "query",
        description: "Number of prompts to skip.",
        schema: { type: "integer", minimum: 0 },
      },
    ],
    handler: ({ request }) => {
      const module = optionalEnum(request.query, "module", MODULES);
      const taskNumber = optionalNumber(request.query, "task", {
        min: 1,
        max: 2,
        integer: true,
      });
      const type = optionalEnum(request.query, "type", WRITING_TASK_TYPES);
      const topic = optionalString(request.query, "topic");
      const { limit, offset } = pagination(request.query);
      const matched = filterTasks(module, taskNumber, type, topic);
      return collection(matched.slice(offset, offset + limit), {
        total: matched.length,
        limit,
        offset,
      });
    },
  },
  {
    method: "GET",
    path: "/v1/writing/tasks/:id",
    operationId: "getWritingTask",
    summary: "One Writing prompt",
    description: "Returns a single prompt by identifier.",
    tags: ["writing"],
    parameters: [
      {
        name: "id",
        in: "path",
        required: true,
        description: "Prompt identifier, for example 'ac-t1-01'.",
        schema: { type: "string" },
      },
    ],
    handler: ({ params }) => {
      const id = params["id"]!.toLowerCase();
      const task = WRITING_TASKS.find((candidate) => candidate.id === id);
      if (task === undefined) {
        throw new ApiError("not_found", `No Writing prompt with id '${id}'.`, {
          id,
        });
      }
      return json(task);
    },
  },
  {
    method: "GET",
    path: "/v1/writing/mistakes",
    operationId: "listMistakeRules",
    summary: "The common-mistake rule base",
    description:
      "Returns every detection rule, including its regular expression, so that the rule base can be audited, extended or re-implemented.",
    tags: ["writing"],
    parameters: [
      {
        name: "category",
        in: "query",
        description: "Restrict to one linguistic category.",
        schema: { type: "string", enum: [...MISTAKE_CATEGORIES] },
      },
      {
        name: "severity",
        in: "query",
        description: "Restrict to one severity.",
        schema: { type: "string", enum: [...MISTAKE_SEVERITIES] },
      },
    ],
    handler: ({ request }) => {
      const category = optionalEnum(
        request.query,
        "category",
        MISTAKE_CATEGORIES,
      );
      const severity = optionalEnum(
        request.query,
        "severity",
        MISTAKE_SEVERITIES,
      );
      const matched = MISTAKE_RULES.filter(
        (rule) =>
          (category === undefined || rule.category === category) &&
          (severity === undefined || rule.severity === severity),
      );
      return collection(matched, { total: MISTAKE_RULES.length });
    },
  },
  {
    method: "POST",
    path: "/v1/writing/check",
    operationId: "checkWriting",
    summary: "Detect common mistakes in a response",
    description:
      "Applies the rule base to a candidate response and returns every match with its position, message and suggested correction.",
    tags: ["writing"],
    requestBody: TEXT_BODY_SCHEMA,
    handler: ({ request }) => {
      const text = readText(request);
      const issues = detectIssues(text);
      return json({ issues, counts: countIssues(issues) });
    },
  },
  {
    method: "POST",
    path: "/v1/writing/analyse",
    operationId: "analyseWriting",
    summary: "Estimate a Writing band with a transparent rubric",
    description:
      "Returns readability statistics, an Academic Word List profile, a cohesive-device profile, detected mistakes and a per-criterion band estimate. Every criterion score is accompanied by the rationale that produced it. The estimate is a research and feedback instrument, not a prediction of an examiner award.",
    tags: ["writing"],
    requestBody: {
      type: "object",
      required: ["text"],
      properties: {
        text: { type: "string", maxLength: MAX_TEXT_LENGTH },
        task: { type: "integer", enum: [1, 2], default: 2 },
        module: { type: "string", enum: [...MODULES] },
        issueLimit: { type: "integer", minimum: 0 },
      },
    },
    handler: ({ request }) => {
      const source = asObject(parseJsonBody(request), "The request body");
      const text = requiredStringField(source, "text");
      if (text.length > MAX_TEXT_LENGTH) {
        throw new ApiError(
          "payload_too_large",
          `The 'text' field is limited to ${String(MAX_TEXT_LENGTH)} characters.`,
          { limit: MAX_TEXT_LENGTH, received: text.length },
        );
      }
      const taskNumber = readTaskNumber(source);
      const moduleValue = source["module"];
      const options: Parameters<typeof analyseWriting>[1] =
        typeof moduleValue === "string"
          ? {
              task: taskNumber,
              module: parseModule(moduleValue),
            }
          : { task: taskNumber };
      return json(analyseWriting(text, options));
    },
  },
];

function parseModule(value: string): Module {
  const matched = MODULES.find((module) => module === value.toLowerCase());
  if (matched === undefined) {
    throw new ApiError(
      "invalid_parameter",
      `The 'module' field must be one of: ${MODULES.join(", ")}.`,
      { field: "module", received: value },
    );
  }
  return matched;
}
