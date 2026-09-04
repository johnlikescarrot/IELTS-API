/**
 * Endpoints exposing the band scale, the CEFR alignment and the analytic band
 * descriptors.
 *
 * @packageDocumentation
 */

import { ApiError } from "../../core/errors.ts";
import { RUBRICS, RUBRIC_CRITERIA, type Rubric } from "../../core/types.ts";
import {
  BAND_SCALE,
  BAND_SCALE_DESCRIPTIONS,
  isReportableBand,
} from "../../domain/band.ts";
import { CEFR_ALIGNMENT, cefrForBand } from "../../domain/cefr.ts";
import {
  RUBRIC_CRITERIA_ORDER,
  descriptorsFor,
} from "../../domain/descriptors.ts";
import { optionalEnum, optionalNumber, parseNumber } from "../params.ts";
import { collection, json } from "../respond.ts";
import type { RouteDefinition } from "../route.ts";

function bandSummary(band: number): {
  band: number;
  whole: number;
  label: string;
  cefr: string;
  cefrAligned: boolean;
} {
  const cefr = cefrForBand(band);
  return {
    band,
    whole: Math.floor(band),
    label: BAND_SCALE_DESCRIPTIONS[Math.floor(band)]!,
    cefr: cefr.level,
    cefrAligned: cefr.aligned,
  };
}

/** Routes for the band scale, CEFR alignment and band descriptors. */
export const scaleRoutes: readonly RouteDefinition[] = [
  {
    method: "GET",
    path: "/v1/bands",
    operationId: "listBands",
    summary: "The complete nine-band scale",
    description:
      "Returns every reportable band from 0 to 9 in half-band steps, with the public scale description for the containing whole band and the indicative CEFR level.",
    tags: ["scale"],
    handler: () => collection(BAND_SCALE.map(bandSummary)),
  },
  {
    method: "GET",
    path: "/v1/bands/:band",
    operationId: "getBand",
    summary: "A single band",
    description:
      "Returns the scale description and CEFR alignment for one reportable band.",
    tags: ["scale"],
    parameters: [
      {
        name: "band",
        in: "path",
        required: true,
        description: "A multiple of 0.5 between 0 and 9.",
        schema: { type: "number", minimum: 0, maximum: 9, multipleOf: 0.5 },
      },
    ],
    handler: ({ params }) => {
      const band = parseNumber("band", params["band"]!, {
        min: 0,
        max: 9,
      });
      if (!isReportableBand(band)) {
        throw new ApiError(
          "invalid_parameter",
          "The 'band' parameter must be a multiple of 0.5 between 0 and 9.",
          { parameter: "band", received: band },
        );
      }
      return json(bandSummary(band));
    },
  },
  {
    method: "GET",
    path: "/v1/cefr",
    operationId: "listCefrAlignment",
    summary: "IELTS to CEFR alignment table",
    description:
      "Returns the published alignment between IELTS band ranges and CEFR levels. Bands below 4.0 are reported as unaligned rather than being mapped speculatively.",
    tags: ["scale"],
    handler: () =>
      collection(CEFR_ALIGNMENT, {
        sources: ["councilofeurope2020"],
      }),
  },
  {
    method: "GET",
    path: "/v1/cefr/:band",
    operationId: "getCefrForBand",
    summary: "CEFR level for a band",
    description: "Maps one band score onto its indicative CEFR level.",
    tags: ["scale"],
    parameters: [
      {
        name: "band",
        in: "path",
        required: true,
        description: "Any band score between 0 and 9.",
        schema: { type: "number", minimum: 0, maximum: 9 },
      },
    ],
    handler: ({ params }) => {
      const band = parseNumber("band", params["band"]!, {
        min: 0,
        max: 9,
      });
      return json({ band, ...cefrForBand(band) });
    },
  },
  {
    method: "GET",
    path: "/v1/descriptors",
    operationId: "listRubrics",
    summary: "Available rubrics and their criteria",
    description:
      "Lists the rubrics for which analytic band descriptors are available, together with the criteria assessed under each.",
    tags: ["descriptors"],
    handler: () =>
      collection(
        RUBRICS.map((rubric) => ({
          rubric,
          criteria: RUBRIC_CRITERIA_ORDER[rubric],
        })),
      ),
  },
  {
    method: "GET",
    path: "/v1/descriptors/:rubric",
    operationId: "getDescriptors",
    summary: "Analytic band descriptors for a rubric",
    description:
      "Returns paraphrased band descriptors for every criterion of a rubric, optionally filtered by criterion or by whole band.",
    tags: ["descriptors"],
    parameters: [
      {
        name: "rubric",
        in: "path",
        required: true,
        description: "The rubric to describe.",
        schema: { type: "string", enum: [...RUBRICS] },
      },
      {
        name: "criterion",
        in: "query",
        description: "Restrict the response to a single criterion.",
        schema: { type: "string", enum: [...RUBRIC_CRITERIA] },
      },
      {
        name: "band",
        in: "query",
        description: "Restrict the response to a single whole band, 0 to 9.",
        schema: { type: "integer", minimum: 0, maximum: 9 },
      },
    ],
    handler: ({ params, request }) => {
      const rubric = parseRubric(params["rubric"]!);
      const criterion = optionalEnum(
        request.query,
        "criterion",
        RUBRIC_CRITERIA,
      );
      const band = optionalNumber(request.query, "band", {
        min: 0,
        max: 9,
        integer: true,
      });

      const filter: {
        criterion?: (typeof RUBRIC_CRITERIA)[number];
        band?: number;
      } = {};
      if (criterion !== undefined) {
        filter.criterion = criterion;
      }
      if (band !== undefined) {
        filter.band = band;
      }

      const results = descriptorsFor(rubric, filter);
      if (results.length === 0) {
        throw new ApiError(
          "not_found",
          "No descriptors match the requested filters.",
          { rubric, ...filter },
        );
      }
      return collection(results);
    },
  },
];

function parseRubric(value: string): Rubric {
  const matched = RUBRICS.find((rubric) => rubric === value);
  if (matched === undefined) {
    throw new ApiError(
      "not_found",
      `Unknown rubric '${value}'. Expected one of: ${RUBRICS.join(", ")}.`,
      { rubric: value, allowed: RUBRICS },
    );
  }
  return matched;
}
