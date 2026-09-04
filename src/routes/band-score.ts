import { computeOverallBand, validateSkillScore, type SkillField } from "../lib/band.ts";
import { readJsonBody } from "../lib/body.ts";
import { ApiError } from "../lib/errors.ts";
import type { Route } from "../lib/router.ts";

/** Documentation for the overall band-score rounding rules. */
export const bandScoreRulesRoute: Route = {
  method: "GET",
  path: "/v1/band-score",
  summary: "Explain how the overall band score is calculated.",
  handler: () => ({
    status: 200,
    cacheable: false,
    body: {
      data: {
        method: "POST four skill scores to this endpoint to compute an overall band.",
        rules: [
          "Each skill score must be between 0 and 9 in half-band steps (e.g. 6 or 6.5).",
          "The overall score is the average of the four skill scores.",
          "The average is rounded to the nearest half band, with quarter bands rounding up: 6.25 becomes 6.5 and 6.75 becomes 7.0.",
        ],
        example: {
          listening: 6.5,
          reading: 6,
          writing: 6,
          speaking: 6.5,
          overall: 6.5,
        },
      },
    },
  }),
};

/** Calculate the overall band score using the official rounding rules. */
export const bandScoreCalculateRoute: Route = {
  method: "POST",
  path: "/v1/band-score",
  summary: "Calculate an overall band score from listening, reading, writing and speaking.",
  handler: async (ctx) => {
    const body = await readJsonBody(ctx.req);
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new ApiError(
        400,
        "invalid_body",
        "Request body must be a JSON object with listening, reading, writing and speaking scores.",
        [
          {
            param: "body",
            message: 'Example: {"listening": 7, "reading": 6.5, "writing": 6, "speaking": 7}.',
          },
        ],
      );
    }
    const record = body as Record<string, unknown>;
    const scores = {
      listening: validateSkillScore("listening", record["listening"]),
      reading: validateSkillScore("reading", record["reading"]),
      writing: validateSkillScore("writing", record["writing"]),
      speaking: validateSkillScore("speaking", record["speaking"]),
    } satisfies Record<SkillField, number>;
    const overall = computeOverallBand(scores);
    return { status: 200, cacheable: false, body: { data: { ...scores, overall } } };
  },
};
