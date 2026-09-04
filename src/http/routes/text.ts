/**
 * Text-analytics endpoints that expose the underlying measures independently of
 * band estimation.
 *
 * @packageDocumentation
 */

import { ApiError } from "../../core/errors.ts";
import { cohesionProfile, COHESION_DEVICES } from "../../data/cohesion.ts";
import { lexicalProfile } from "../../text/lexicon.ts";
import { readability } from "../../text/readability.ts";
import {
  splitParagraphs,
  splitSentences,
  tokenizeWords,
} from "../../text/tokenize.ts";
import { asObject, parseJsonBody, requiredStringField } from "../params.ts";
import { collection, json } from "../respond.ts";
import type { ApiRequest } from "../respond.ts";
import type { RouteDefinition } from "../route.ts";
import { MAX_TEXT_LENGTH } from "./writing.ts";

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

const TEXT_BODY_SCHEMA = {
  type: "object",
  required: ["text"],
  properties: {
    text: { type: "string", maxLength: MAX_TEXT_LENGTH },
  },
};

/** Text-analytics routes. */
export const textRoutes: readonly RouteDefinition[] = [
  {
    method: "POST",
    path: "/v1/text/readability",
    operationId: "postReadability",
    summary: "Readability indices",
    description:
      "Computes Flesch Reading Ease, Flesch-Kincaid Grade Level, the Gunning fog index and the Automated Readability Index, together with the surface statistics they are derived from.",
    tags: ["text"],
    requestBody: TEXT_BODY_SCHEMA,
    handler: ({ request }) =>
      json(readability(readText(request)), {
        sources: ["flesch1948", "kincaid1975", "gunning1952", "senter1967"],
      }),
  },
  {
    method: "POST",
    path: "/v1/text/lexical-profile",
    operationId: "postLexicalProfile",
    summary: "Academic vocabulary profile",
    description:
      "Reports type-token statistics and coverage of the Academic Word List, broken down by sublist.",
    tags: ["text"],
    requestBody: TEXT_BODY_SCHEMA,
    handler: ({ request }) =>
      json(lexicalProfile(readText(request)), { sources: ["coxhead2000"] }),
  },
  {
    method: "POST",
    path: "/v1/text/cohesion",
    operationId: "postCohesion",
    summary: "Cohesive-device profile",
    description:
      "Counts cohesive devices by rhetorical function and reports their density per hundred words.",
    tags: ["text"],
    requestBody: TEXT_BODY_SCHEMA,
    handler: ({ request }) => {
      const text = readText(request);
      const tokens = tokenizeWords(text);
      return json(cohesionProfile(text, tokens.length));
    },
  },
  {
    method: "POST",
    path: "/v1/text/segment",
    operationId: "postSegment",
    summary: "Tokenise and segment a text",
    description:
      "Returns the paragraph, sentence and word segmentation used by every other analysis endpoint, so that results can be independently verified.",
    tags: ["text"],
    requestBody: TEXT_BODY_SCHEMA,
    handler: ({ request }) => {
      const text = readText(request);
      const paragraphs = splitParagraphs(text);
      const sentences = splitSentences(text);
      const words = tokenizeWords(text);
      return json({
        paragraphs,
        sentences,
        words,
        counts: {
          paragraphs: paragraphs.length,
          sentences: sentences.length,
          words: words.length,
          types: new Set(words).size,
        },
      });
    },
  },
  {
    method: "GET",
    path: "/v1/text/cohesive-devices",
    operationId: "listCohesiveDevices",
    summary: "The inventory of cohesive devices",
    description:
      "Lists every cohesive device recognised by the analyser, grouped by rhetorical function.",
    tags: ["text"],
    handler: () => collection(COHESION_DEVICES),
  },
];
