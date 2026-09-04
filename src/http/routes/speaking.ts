/**
 * Speaking endpoints: the question bank, cue cards and reproducible mock tests.
 *
 * @packageDocumentation
 */

import { ApiError } from "../../core/errors.ts";
import { sample } from "../../core/random.ts";
import {
  SPEAKING_CUE_CARDS,
  SPEAKING_CUE_CARD_TOPICS,
  SPEAKING_QUESTIONS,
  SPEAKING_TOPICS,
} from "../../data/speaking.ts";
import { optionalNumber, optionalString, pagination } from "../params.ts";
import { collection, json } from "../respond.ts";
import type { RouteDefinition } from "../route.ts";

/** Speaking routes. */
export const speakingRoutes: readonly RouteDefinition[] = [
  {
    method: "GET",
    path: "/v1/speaking/topics",
    operationId: "listSpeakingTopics",
    summary: "Topic labels used by the Speaking corpus",
    description:
      "Lists the topic labels available for Part 1 and Part 3 questions and for Part 2 cue cards.",
    tags: ["speaking"],
    handler: () =>
      json({
        questionTopics: SPEAKING_TOPICS,
        cueCardTopics: SPEAKING_CUE_CARD_TOPICS,
      }),
  },
  {
    method: "GET",
    path: "/v1/speaking/questions",
    operationId: "listSpeakingQuestions",
    summary: "Browse Part 1 and Part 3 questions",
    description:
      "Returns Speaking questions filtered by part and topic, with pagination.",
    tags: ["speaking"],
    parameters: [
      {
        name: "part",
        in: "query",
        description: "Speaking part, 1 or 3.",
        schema: { type: "integer", enum: [1, 3] },
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
        description: "Maximum number of questions to return.",
        schema: { type: "integer", minimum: 1, maximum: 1000 },
      },
      {
        name: "offset",
        in: "query",
        description: "Number of questions to skip.",
        schema: { type: "integer", minimum: 0 },
      },
    ],
    handler: ({ request }) => {
      const part = optionalNumber(request.query, "part", {
        min: 1,
        max: 3,
        integer: true,
      });
      if (part === 2) {
        throw new ApiError(
          "invalid_parameter",
          "Part 2 uses cue cards; request /v1/speaking/cue-cards instead.",
          { parameter: "part", received: part },
        );
      }
      const topic = optionalString(request.query, "topic")?.toLowerCase();
      const { limit, offset } = pagination(request.query);
      const matched = SPEAKING_QUESTIONS.filter(
        (question) =>
          (part === undefined || question.part === part) &&
          (topic === undefined || question.topic.includes(topic)),
      );
      return collection(matched.slice(offset, offset + limit), {
        total: matched.length,
        limit,
        offset,
      });
    },
  },
  {
    method: "GET",
    path: "/v1/speaking/cue-cards",
    operationId: "listSpeakingCueCards",
    summary: "Browse Part 2 cue cards",
    description:
      "Returns long-turn cue cards with their bullet prompts and the official preparation and speaking times.",
    tags: ["speaking"],
    parameters: [
      {
        name: "topic",
        in: "query",
        description:
          "Case-insensitive substring matched against the topic label.",
        schema: { type: "string" },
      },
    ],
    handler: ({ request }) => {
      const topic = optionalString(request.query, "topic")?.toLowerCase();
      const matched = SPEAKING_CUE_CARDS.filter(
        (card) => topic === undefined || card.topic.includes(topic),
      );
      return collection(matched, { total: SPEAKING_CUE_CARDS.length });
    },
  },
  {
    method: "GET",
    path: "/v1/speaking/mock-test",
    operationId: "getSpeakingMockTest",
    summary: "A reproducible three-part mock Speaking test",
    description:
      "Assembles a complete mock interview: four Part 1 questions, one Part 2 cue card and three Part 3 discussion questions, drawn with a seeded generator so that the same seed always yields the same test.",
    tags: ["speaking"],
    parameters: [
      {
        name: "seed",
        in: "query",
        description: "Seed for the generator. Defaults to 0.",
        schema: { type: "integer", minimum: 0 },
      },
    ],
    handler: ({ request }) => {
      const seed =
        optionalNumber(request.query, "seed", { min: 0, integer: true }) ?? 0;
      const partOne = SPEAKING_QUESTIONS.filter(
        (question) => question.part === 1,
      );
      const partThree = SPEAKING_QUESTIONS.filter(
        (question) => question.part === 3,
      );
      return json(
        {
          seed,
          part1: sample(partOne, 4, seed),
          part2: sample(SPEAKING_CUE_CARDS, 1, seed + 1)[0]!,
          part3: sample(partThree, 3, seed + 2),
          timing: {
            part1Minutes: 5,
            part2Minutes: 4,
            part3Minutes: 5,
            totalMinutes: 14,
          },
        },
        { seed },
      );
    },
  },
];
