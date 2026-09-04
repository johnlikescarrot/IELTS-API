/**
 * Band-score endpoints: raw-score tables, a raw-to-band calculator
 * (GET and POST), and the four-skill overall-band calculator.
 */

import type { RequestContext, Route } from "../router.js";
import { route } from "../router.js";
import { asObject, sendJson } from "../http.js";
import { requiredEnum } from "../lib/collections.js";
import {
  RAW_SCORE_TABLES,
  overallBand,
  rawToBand,
  toBandValue,
  toRawScore,
} from "../lib/band.js";
import { RAW_SCORE_SKILLS } from "../types.js";
import { DISCLAIMER } from "../meta.js";

const TABLE_NOTE =
  "Tables are indicative, commonly published conversion ranges; exact " +
  "boundaries vary slightly between test versions.";

function getTables({ res }: RequestContext): void {
  sendJson(res, 200, {
    data: RAW_SCORE_TABLES,
    note: TABLE_NOTE,
    disclaimer: DISCLAIMER,
  });
}

function getCalculator(ctx: RequestContext): void {
  const { query, res } = ctx;
  const skill = requiredEnum(query.get("skill"), RAW_SCORE_SKILLS, "skill");
  const raw = toRawScore(query.get("raw"));
  sendJson(res, 200, {
    data: { skill, raw, band: rawToBand(skill, raw), indicative: true },
    note: TABLE_NOTE,
  });
}

function postCalculator(ctx: RequestContext): void {
  const { body, res } = ctx;
  const parsed = asObject(body, "Request body must be a JSON object");
  const skill = requiredEnum(parsed.skill, RAW_SCORE_SKILLS, "skill");
  const raw = toRawScore(parsed.raw);
  sendJson(res, 200, {
    data: { skill, raw, band: rawToBand(skill, raw), indicative: true },
    note: TABLE_NOTE,
  });
}

function postOverall(ctx: RequestContext): void {
  const { body, res } = ctx;
  const parsed = asObject(body, "Request body must be a JSON object");
  const input = {
    listening: toBandValue(parsed.listening, "listening"),
    reading: toBandValue(parsed.reading, "reading"),
    writing: toBandValue(parsed.writing, "writing"),
    speaking: toBandValue(parsed.speaking, "speaking"),
  };
  sendJson(res, 200, { data: overallBand(input) });
}

export const bandRoutes: readonly Route[] = [
  route(
    "GET",
    "/v1/bands/tables",
    "Raw-score (0-40) to band-score tables",
    getTables,
  ),
  route(
    "GET",
    "/v1/bands/calculator",
    "Convert a raw score to a band (GET)",
    getCalculator,
  ),
  route(
    "POST",
    "/v1/bands/calculator",
    "Convert a raw score to a band (POST)",
    postCalculator,
  ),
  route(
    "POST",
    "/v1/bands/overall",
    "Average four component bands into an overall band",
    postOverall,
  ),
];
