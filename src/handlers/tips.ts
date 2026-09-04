/**
 * Study-tip endpoints.
 */

import type { RequestContext, Route } from "../router.js";
import { route } from "../router.js";
import { notFound, sendJson } from "../http.js";
import { paginate, parsePagination } from "../lib/pagination.js";
import { findById, parseEnumOption } from "../lib/collections.js";
import type { Tip } from "../types.js";
import { TIP_SKILLS } from "../types.js";
import { tips } from "../data/index.js";

function listTips(ctx: RequestContext): void {
  const { query, res } = ctx;
  const skill = parseEnumOption(query.get("skill"), TIP_SKILLS, "skill");

  let items: readonly Tip[] = tips;
  if (skill !== null) {
    items = items.filter((tip) => tip.skill === skill);
  }

  const { page, limit } = parsePagination(query);
  sendJson(res, 200, paginate<Tip>(items, page, limit));
}

function getTip({ res, params }: RequestContext): void {
  const tip = findById(tips, params.id as string);
  if (tip === undefined) {
    throw notFound(`Tip '${params.id as string}' not found`);
  }
  sendJson(res, 200, { data: tip });
}

export const tipRoutes: readonly Route[] = [
  route("GET", "/v1/tips", "List study tips (optionally by skill)", listTips),
  route("GET", "/v1/tips/:id", "Get one study tip", getTip),
];
