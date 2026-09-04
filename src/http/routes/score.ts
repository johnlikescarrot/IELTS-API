/**
 * Scoring endpoints: raw-to-band conversion, Overall Band Score computation,
 * criterion averaging and target planning.
 *
 * @packageDocumentation
 */

import { ApiError } from "../../core/errors.ts";
import {
  MODULES,
  SCORED_PAPERS,
  SKILLS,
  type ScoredPaper,
  type Skill,
} from "../../core/types.ts";
import {
  averageCriteriaToBand,
  isReportableBand,
  overallBandScore,
  roundToReportedBand,
} from "../../domain/band.ts";
import { cefrForBand } from "../../domain/cefr.ts";
import {
  CONVERSION_TABLES,
  ITEM_COUNT,
  minimumRawForBand,
  paperFor,
  rawScoreToBand,
} from "../../domain/conversion.ts";
import {
  planForTarget,
  type PartialComponents,
} from "../../domain/planning.ts";
import {
  asObject,
  optionalNumber,
  parseEnum,
  parseNumber,
  parseJsonBody,
  requiredNumber,
  requiredNumberField,
} from "../params.ts";
import { collection, json } from "../respond.ts";
import type { ApiRequest } from "../respond.ts";
import type { RouteDefinition } from "../route.ts";

function parsePaper(value: string): ScoredPaper {
  const matched = SCORED_PAPERS.find((paper) => paper === value);
  if (matched === undefined) {
    throw new ApiError(
      "not_found",
      `Unknown paper '${value}'. Expected one of: ${SCORED_PAPERS.join(", ")}.`,
      { paper: value, allowed: SCORED_PAPERS },
    );
  }
  return matched;
}

function requireReportableBand(name: string, value: number): number {
  if (!isReportableBand(value)) {
    throw new ApiError(
      "invalid_parameter",
      `The '${name}' value must be a multiple of 0.5 between 0 and 9.`,
      { parameter: name, received: value },
    );
  }
  return value;
}

function readComponents(request: ApiRequest): Record<Skill, number> {
  const body = parseJsonBody(request);
  if (body !== undefined) {
    const source = asObject(body, "The request body");
    return {
      listening: requireReportableBand(
        "listening",
        requiredNumberField(source, "listening", { min: 0, max: 9 }),
      ),
      reading: requireReportableBand(
        "reading",
        requiredNumberField(source, "reading", { min: 0, max: 9 }),
      ),
      writing: requireReportableBand(
        "writing",
        requiredNumberField(source, "writing", { min: 0, max: 9 }),
      ),
      speaking: requireReportableBand(
        "speaking",
        requiredNumberField(source, "speaking", { min: 0, max: 9 }),
      ),
    };
  }

  return {
    listening: requireReportableBand(
      "listening",
      requiredNumber(request.query, "listening", { min: 0, max: 9 }),
    ),
    reading: requireReportableBand(
      "reading",
      requiredNumber(request.query, "reading", { min: 0, max: 9 }),
    ),
    writing: requireReportableBand(
      "writing",
      requiredNumber(request.query, "writing", { min: 0, max: 9 }),
    ),
    speaking: requireReportableBand(
      "speaking",
      requiredNumber(request.query, "speaking", { min: 0, max: 9 }),
    ),
  };
}

function overallPayload(request: ApiRequest): ReturnType<typeof json> {
  const components = readComponents(request);
  const result = overallBandScore(components);
  return json({
    ...result,
    cefr: cefrForBand(result.overall).level,
    rule: "A mean fraction of exactly .25 rounds up to the next half band and exactly .75 rounds up to the next whole band.",
  });
}

const overallParameters = SKILLS.map((skill) => ({
  name: skill,
  in: "query" as const,
  required: true,
  description: `${skill[0]!.toUpperCase()}${skill.slice(1)} band score, a multiple of 0.5 between 0 and 9.`,
  schema: { type: "number", minimum: 0, maximum: 9, multipleOf: 0.5 },
}));

/** Scoring routes. */
export const scoreRoutes: readonly RouteDefinition[] = [
  {
    method: "GET",
    path: "/v1/conversion",
    operationId: "listConversionTables",
    summary: "All raw-score conversion tables",
    description:
      "Returns the raw-score to band-score conversion tables for Listening, Academic Reading and General Training Reading.",
    tags: ["scoring"],
    handler: () => collection(Object.values(CONVERSION_TABLES)),
  },
  {
    method: "GET",
    path: "/v1/conversion/:paper",
    operationId: "getConversionTable",
    summary: "One raw-score conversion table",
    description: "Returns the conversion table for a single paper.",
    tags: ["scoring"],
    parameters: [
      {
        name: "paper",
        in: "path",
        required: true,
        description: "The paper whose table is requested.",
        schema: { type: "string", enum: [...SCORED_PAPERS] },
      },
    ],
    handler: ({ params }) =>
      json(CONVERSION_TABLES[parsePaper(params["paper"]!)]),
  },
  {
    method: "GET",
    path: "/v1/conversion/:paper/:raw",
    operationId: "convertRawScore",
    summary: "Convert a raw score to a band score",
    description:
      "Converts a number of correct answers out of 40 into a band score, and reports how many further marks are needed for the next band.",
    tags: ["scoring"],
    parameters: [
      {
        name: "paper",
        in: "path",
        required: true,
        description: "The paper whose table should be used.",
        schema: { type: "string", enum: [...SCORED_PAPERS] },
      },
      {
        name: "raw",
        in: "path",
        required: true,
        description: `Number of correct answers, 0 to ${String(ITEM_COUNT)}.`,
        schema: { type: "integer", minimum: 0, maximum: ITEM_COUNT },
      },
    ],
    handler: ({ params }) => {
      const paper = parsePaper(params["paper"]!);
      const raw = parseNumber("raw", params["raw"]!, {
        min: 0,
        max: ITEM_COUNT,
        integer: true,
      });
      const result = rawScoreToBand(paper, raw);
      return json({ ...result, cefr: cefrForBand(result.band).level });
    },
  },
  {
    method: "GET",
    path: "/v1/score/raw",
    operationId: "convertRawScoreBySkill",
    summary: "Convert a raw score using skill and module",
    description:
      "Convenience wrapper that selects the correct conversion table from a skill and module pair before converting.",
    tags: ["scoring"],
    parameters: [
      {
        name: "skill",
        in: "query",
        required: true,
        description: "Either 'listening' or 'reading'.",
        schema: { type: "string", enum: ["listening", "reading"] },
      },
      {
        name: "module",
        in: "query",
        description:
          "Test module; ignored for Listening. Defaults to 'academic'.",
        schema: { type: "string", enum: [...MODULES] },
      },
      {
        name: "correct",
        in: "query",
        required: true,
        description: `Number of correct answers, 0 to ${String(ITEM_COUNT)}.`,
        schema: { type: "integer", minimum: 0, maximum: ITEM_COUNT },
      },
    ],
    handler: ({ request }) => {
      const skill = parseEnum("skill", request.query.get("skill") ?? "", [
        "listening",
        "reading",
      ] as const);
      const moduleRaw = request.query.get("module");
      const module =
        moduleRaw === null || moduleRaw.trim().length === 0
          ? "academic"
          : parseEnum("module", moduleRaw, MODULES);
      const correct = requiredNumber(request.query, "correct", {
        min: 0,
        max: ITEM_COUNT,
        integer: true,
      });
      const paper = paperFor(skill, module);
      const result = rawScoreToBand(paper, correct);
      return json({ skill, module, ...result });
    },
  },
  {
    method: "GET",
    path: "/v1/score/requirements",
    operationId: "getRawRequirements",
    summary: "Minimum raw score for each band",
    description:
      "Returns, for one paper, the smallest number of correct answers that attains each band on the scale.",
    tags: ["scoring"],
    parameters: [
      {
        name: "paper",
        in: "query",
        required: true,
        description: "The paper to report on.",
        schema: { type: "string", enum: [...SCORED_PAPERS] },
      },
    ],
    handler: ({ request }) => {
      const paper = parsePaper(request.query.get("paper") ?? "");
      const bands = [9, 8.5, 8, 7.5, 7, 6.5, 6, 5.5, 5, 4.5, 4];
      return collection(
        bands.map((band) => ({
          band,
          minimumRaw: minimumRawForBand(paper, band),
        })),
        { sources: ["conversion-tables"] },
      );
    },
  },
  {
    method: "GET",
    path: "/v1/score/overall",
    operationId: "getOverallBand",
    summary: "Compute an Overall Band Score",
    description:
      "Averages the four component band scores and applies the official rounding rule, reporting the unrounded mean and the rounding branch that was taken.",
    tags: ["scoring"],
    parameters: overallParameters,
    handler: ({ request }) => overallPayload(request),
  },
  {
    method: "POST",
    path: "/v1/score/overall",
    operationId: "postOverallBand",
    summary: "Compute an Overall Band Score from a JSON body",
    description:
      "Identical to the GET form, but accepts the four component scores as a JSON object. No authentication is required for either form.",
    tags: ["scoring"],
    requestBody: {
      type: "object",
      required: [...SKILLS],
      properties: Object.fromEntries(
        SKILLS.map((skill) => [
          skill,
          { type: "number", minimum: 0, maximum: 9, multipleOf: 0.5 },
        ]),
      ),
    },
    handler: ({ request }) => overallPayload(request),
  },
  {
    method: "POST",
    path: "/v1/score/criteria",
    operationId: "postCriterionAverage",
    summary: "Average analytic criterion scores",
    description:
      "Averages an arbitrary list of criterion scores and rounds the mean onto the reporting scale, which is how the Writing and Speaking papers combine their four equally weighted criteria.",
    tags: ["scoring"],
    requestBody: {
      type: "object",
      required: ["scores"],
      properties: {
        scores: {
          type: "array",
          minItems: 1,
          items: { type: "number", minimum: 0, maximum: 9 },
        },
      },
    },
    handler: ({ request }) => {
      const source = asObject(parseJsonBody(request), "The request body");
      const scores = source["scores"];
      if (!Array.isArray(scores) || scores.length === 0) {
        throw new ApiError(
          "invalid_parameter",
          "The 'scores' field must be a non-empty array of numbers.",
          { field: "scores" },
        );
      }
      const parsed = scores.map((value, index) =>
        parseNumber(`scores[${String(index)}]`, String(value), {
          min: 0,
          max: 9,
        }),
      );
      const { mean, band } = averageCriteriaToBand(parsed);
      return json({ scores: parsed, mean, band });
    },
  },
  {
    method: "GET",
    path: "/v1/score/round",
    operationId: "roundMean",
    summary: "Apply the IELTS rounding rule to a mean",
    description:
      "Rounds an arbitrary mean onto the reporting scale using the official rule. Useful for verifying third-party implementations.",
    tags: ["scoring"],
    parameters: [
      {
        name: "mean",
        in: "query",
        required: true,
        description: "The unrounded mean to round.",
        schema: { type: "number", minimum: 0, maximum: 9 },
      },
    ],
    handler: ({ request }) => {
      const mean = requiredNumber(request.query, "mean", { min: 0, max: 9 });
      return json({ mean, band: roundToReportedBand(mean) });
    },
  },
  {
    method: "GET",
    path: "/v1/score/target",
    operationId: "getTargetPlan",
    summary: "Score needed in the remaining skill",
    description:
      "Given a target Overall Band Score and three of the four component scores, returns the lowest band in the outstanding skill that reaches the target, or reports that the target is unattainable.",
    tags: ["scoring"],
    parameters: [
      {
        name: "target",
        in: "query",
        required: true,
        description: "Desired Overall Band Score.",
        schema: { type: "number", minimum: 0, maximum: 9, multipleOf: 0.5 },
      },
      ...SKILLS.map((skill) => ({
        name: skill,
        in: "query" as const,
        description: `${skill} band score; omit exactly one of the four skills.`,
        schema: { type: "number", minimum: 0, maximum: 9, multipleOf: 0.5 },
      })),
    ],
    handler: ({ request }) => {
      const target = requireReportableBand(
        "target",
        requiredNumber(request.query, "target", { min: 0, max: 9 }),
      );
      const known: PartialComponents = {};
      for (const skill of SKILLS) {
        const value = optionalNumber(request.query, skill, { min: 0, max: 9 });
        if (value !== undefined) {
          known[skill] = requireReportableBand(skill, value);
        }
      }
      const supplied = SKILLS.filter((skill) => known[skill] !== undefined);
      if (supplied.length !== 3) {
        throw new ApiError(
          "invalid_parameter",
          "Exactly three of the four component scores must be supplied.",
          { supplied, expected: 3 },
        );
      }
      return json(planForTarget(known, target));
    },
  },
];
