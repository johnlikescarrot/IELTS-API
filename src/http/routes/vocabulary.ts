/**
 * Academic vocabulary endpoints backed by the Academic Word List.
 *
 * @packageDocumentation
 */

import { ApiError } from "../../core/errors.ts";
import { sample } from "../../core/random.ts";
import { AWL_FAMILIES } from "../../data/awl.ts";
import {
  AWL_FAMILY_COUNT,
  AWL_FORM_COUNT,
  lookupAwl,
} from "../../text/lexicon.ts";
import { optionalNumber, optionalString, pagination } from "../params.ts";
import { collection, json } from "../respond.ts";
import type { RouteDefinition } from "../route.ts";

const SUBLIST_PARAMETER = {
  name: "sublist",
  in: "query" as const,
  description: "Restrict results to one AWL sublist, 1 to 10.",
  schema: { type: "integer", minimum: 1, maximum: 10 },
};

function filterFamilies(
  sublist: number | undefined,
  query: string | undefined,
): typeof AWL_FAMILIES {
  const needle = query?.toLowerCase();
  return AWL_FAMILIES.filter((family) => {
    if (sublist !== undefined && family.sublist !== sublist) {
      return false;
    }
    if (needle === undefined) {
      return true;
    }
    return (
      family.headword.includes(needle) ||
      family.forms.some((form) => form.includes(needle))
    );
  });
}

/** Vocabulary routes. */
export const vocabularyRoutes: readonly RouteDefinition[] = [
  {
    method: "GET",
    path: "/v1/vocabulary/sublists",
    operationId: "listAwlSublists",
    summary: "Academic Word List sublist summary",
    description:
      "Reports the number of word families and word forms in each of the ten AWL sublists.",
    tags: ["vocabulary"],
    handler: () => {
      const summary = Array.from({ length: 10 }, (_unused, index) => {
        const sublist = index + 1;
        const families = AWL_FAMILIES.filter(
          (family) => family.sublist === sublist,
        );
        return {
          sublist,
          families: families.length,
          forms: families.reduce(
            (total, family) => total + family.forms.length + 1,
            0,
          ),
          headwords: families.map((family) => family.headword),
        };
      });
      return collection(summary, {
        total: AWL_FAMILY_COUNT,
        sources: ["coxhead2000"],
      });
    },
  },
  {
    method: "GET",
    path: "/v1/vocabulary/random",
    operationId: "sampleVocabulary",
    summary: "A reproducible random sample of academic word families",
    description:
      "Draws word families without replacement using a seeded generator. The same seed always returns the same sample, so study sets and experiments are reproducible.",
    tags: ["vocabulary"],
    parameters: [
      SUBLIST_PARAMETER,
      {
        name: "count",
        in: "query",
        description: "Number of families to draw, 1 to 100. Defaults to 10.",
        schema: { type: "integer", minimum: 1, maximum: 100 },
      },
      {
        name: "seed",
        in: "query",
        description: "Seed for the generator. Defaults to 0.",
        schema: { type: "integer", minimum: 0 },
      },
    ],
    handler: ({ request }) => {
      const sublist = optionalNumber(request.query, "sublist", {
        min: 1,
        max: 10,
        integer: true,
      });
      const count =
        optionalNumber(request.query, "count", {
          min: 1,
          max: 100,
          integer: true,
        }) ?? 10;
      const seed =
        optionalNumber(request.query, "seed", { min: 0, integer: true }) ?? 0;
      const population = filterFamilies(sublist, undefined);
      return collection(sample(population, count, seed), {
        seed,
        total: population.length,
        sources: ["coxhead2000"],
      });
    },
  },
  {
    method: "GET",
    path: "/v1/vocabulary",
    operationId: "listVocabulary",
    summary: "Browse the Academic Word List",
    description:
      "Returns AWL word families with optional sublist filtering, substring search and pagination.",
    tags: ["vocabulary"],
    parameters: [
      SUBLIST_PARAMETER,
      {
        name: "q",
        in: "query",
        description:
          "Case-insensitive substring matched against headwords and forms.",
        schema: { type: "string" },
      },
      {
        name: "limit",
        in: "query",
        description: "Maximum number of families to return. Defaults to 50.",
        schema: { type: "integer", minimum: 1, maximum: 1000 },
      },
      {
        name: "offset",
        in: "query",
        description: "Number of families to skip.",
        schema: { type: "integer", minimum: 0 },
      },
    ],
    handler: ({ request }) => {
      const sublist = optionalNumber(request.query, "sublist", {
        min: 1,
        max: 10,
        integer: true,
      });
      const search = optionalString(request.query, "q");
      const { limit, offset } = pagination(request.query);
      const matched = filterFamilies(sublist, search);
      return collection(matched.slice(offset, offset + limit), {
        total: matched.length,
        limit,
        offset,
        sources: ["coxhead2000"],
      });
    },
  },
  {
    method: "GET",
    path: "/v1/vocabulary/:word",
    operationId: "lookupVocabulary",
    summary: "Look up a word in the Academic Word List",
    description:
      "Resolves any inflected or derived form to its AWL family, or reports that the word is not academic vocabulary.",
    tags: ["vocabulary"],
    parameters: [
      {
        name: "word",
        in: "path",
        required: true,
        description: "Any word form.",
        schema: { type: "string" },
      },
    ],
    handler: ({ params }) => {
      const word = params["word"]!.trim();
      if (word.length === 0) {
        throw new ApiError("missing_parameter", "A word must be supplied.");
      }
      const family = lookupAwl(word);
      if (family === undefined) {
        return json({
          query: word.toLowerCase(),
          inAcademicWordList: false,
          family: null,
        });
      }
      return json({
        query: word.toLowerCase(),
        inAcademicWordList: true,
        family,
        isHeadword: family.headword === word.toLowerCase(),
      });
    },
  },
  {
    method: "GET",
    path: "/v1/vocabulary-stats",
    operationId: "getVocabularyStats",
    summary: "Size of the bundled lexical resources",
    description:
      "Reports how many word families and indexed word forms the service holds.",
    tags: ["vocabulary"],
    handler: () =>
      json({
        families: AWL_FAMILY_COUNT,
        indexedForms: AWL_FORM_COUNT,
        sublists: 10,
        source: "coxhead2000",
      }),
  },
];
