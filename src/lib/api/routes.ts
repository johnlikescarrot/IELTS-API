/**
 * Registers every HTTP endpoint on a {@link Router}. All business logic lives
 * here (and in the domain modules) so the transport layer stays thin.
 */
import { Router } from "../server/router.js";
import type { HandlerContext } from "../server/types.js";
import { ok } from "../server/response.js";
import { badRequest, notFound } from "../errors.js";
import { parseInteger, parseEnum, parsePage } from "../params.js";
import { paginate } from "../paginate.js";
import { mulberry32, pickOne, seedToUint32 } from "../random.js";
import { MAX_RAW, MIN_RAW, assertValidScores, overallBand, rawToBand, tableFor } from "../bands.js";
import type { ComponentScores, TestModule } from "../types.js";
import { VALID_BANDS } from "../types.js";
import { EXAM_OVERVIEW, getPaper } from "../../data/exam.js";
import {
  WRITING_PROMPTS,
  WRITING_CATEGORIES,
  WRITING_TASK_GUIDE,
  getWritingPrompt,
} from "../../data/writing.js";
import { CUE_CARDS, CUE_CARD_CATEGORIES, SPEAKING_PARTS, getCueCard } from "../../data/speaking.js";
import { QUESTION_TYPES, getQuestionType } from "../../data/reading.js";
import { VOCABULARY, VOCAB_CATEGORY_IDS, getVocabCategory } from "../../data/vocabulary.js";
import { generateEssays, MIN_GENERATED, MAX_GENERATED } from "../essayGenerator.js";

export interface ServiceInfo {
  name: string;
  version: string;
  description: string;
  homepage: string;
  baseUrl: string;
}

const MODULES: readonly TestModule[] = ["academic", "general"];

/** Parse the test-module query param, defaulting to `academic`. */
function readModule(raw: string | undefined): TestModule {
  return parseEnum(raw, "module", MODULES) ?? "academic";
}

/** Read one component band from a query string, throwing on bad input. */
function readBandParam(query: URLSearchParams, name: string): number {
  const raw = query.get(name);
  if (raw === null || raw.trim() === "") {
    throw badRequest(`query parameter "${name}" is required.`, { name });
  }
  const value = Number(raw);
  if (!VALID_BANDS.includes(value as number)) {
    throw badRequest(
      `query parameter "${name}" must be a valid band between 1 and 9 in ` +
        `half-band steps; received "${raw}".`,
      { name, allowed: VALID_BANDS, received: raw },
    );
  }
  return value;
}

/** Coerce a JSON body into component scores, letting {@link assertValidScores} validate. */
function scoresFromBody(body: unknown): Partial<ComponentScores> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw badRequest("request body must be a JSON object of component scores.");
  }
  const record = body as Record<string, unknown>;
  const coerce = (key: string): number | undefined =>
    typeof record[key] === "number" ? (record[key] as number) : undefined;
  return {
    listening: coerce("listening"),
    reading: coerce("reading"),
    writing: coerce("writing"),
    speaking: coerce("speaking"),
  };
}

/** Build a deterministic PRNG from a seed, or Math.random when no seed given. */
function randFrom(query: URLSearchParams): () => number {
  const seed = query.get("seed");
  if (seed !== null && seed !== "") {
    return mulberry32(seedToUint32(seed));
  }
  return Math.random;
}

/** Resolve the cue-card pool, validating an optional category filter. */
function cueCardPool(ctx: HandlerContext): readonly (typeof CUE_CARDS)[number][] {
  const category = ctx.query.get("category");
  if (category !== null && category !== "" && !CUE_CARD_CATEGORIES.includes(category)) {
    throw badRequest(
      `unknown cue-card category "${category}"; expected one of ` +
        `${CUE_CARD_CATEGORIES.join(", ")}.`,
      { allowed: CUE_CARD_CATEGORIES },
    );
  }
  return category ? CUE_CARDS.filter((card) => card.category === category) : CUE_CARDS;
}

/** Filter the curated prompt bank by optional task / module / category. */
function filterPrompts(ctx: HandlerContext) {
  const { query } = ctx;
  const rawTask = parseInteger(query.get("task"), "task", { min: 1, max: 2 });
  const module = readModule(query.get("module") ?? undefined);
  const rawCategory = query.get("category");
  if (rawCategory !== null && rawCategory !== "" && !WRITING_CATEGORIES.includes(rawCategory)) {
    throw badRequest(
      `unknown writing category "${rawCategory}"; expected one of ` +
        `${WRITING_CATEGORIES.join(", ")}.`,
      { allowed: WRITING_CATEGORIES },
    );
  }
  return WRITING_PROMPTS.filter((prompt) => {
    if (rawTask !== undefined && prompt.task !== rawTask) return false;
    if (module && prompt.module !== module && prompt.module !== "both") {
      return false;
    }
    if (rawCategory && prompt.category !== rawCategory) return false;
    return true;
  });
}

/** Register all routes on the supplied router and return it for chaining. */
export function registerRoutes(router: Router, info: ServiceInfo): Router {
  // ---- Root & health ------------------------------------------------------
  router.get("/", (_ctx) =>
    ok({
      name: info.name,
      version: info.version,
      description: info.description,
      homepage: info.homepage,
      baseUrl: info.baseUrl,
      auth: "none",
      pricing: "free",
      endpoints: router.list().map((route) => ({
        method: route.method,
        path: route.template,
        params: router.paramNamesOf(route),
      })),
    }),
  );

  router.get("/health", (_ctx) =>
    ok({
      status: "ok",
      service: info.name,
      version: info.version,
      uptimeSeconds: Math.floor(process.uptime()),
    }),
  );

  // ---- Exam structure -----------------------------------------------------
  router.get("/v1/exam/overview", (_ctx) => ok(EXAM_OVERVIEW));

  router.get("/v1/exam/papers/:id", (ctx) => {
    const id = ctx.params.id as "listening" | "reading" | "writing" | "speaking";
    const paper = getPaper(id);
    if (!paper) {
      throw notFound(`No exam paper with id "${ctx.params.id}".`);
    }
    return ok(paper);
  });

  // ---- Bands --------------------------------------------------------------
  router.get("/v1/bands/overall", (ctx) => {
    const scores: ComponentScores = {
      listening: readBandParam(ctx.query, "listening"),
      reading: readBandParam(ctx.query, "reading"),
      writing: readBandParam(ctx.query, "writing"),
      speaking: readBandParam(ctx.query, "speaking"),
    };
    assertValidScores(scores);
    return ok({ overall: overallBand(scores), scores });
  });

  router.post("/v1/bands/overall", (ctx) => {
    const scores = scoresFromBody(ctx.body);
    assertValidScores(scores);
    return ok({ overall: overallBand(scores), scores });
  });

  router.get("/v1/bands/listening", (ctx) => {
    const raw = parseInteger(ctx.query.get("raw"), "raw", {
      required: true,
      min: MIN_RAW,
      max: MAX_RAW,
    }) as number;
    return ok({
      paper: "listening",
      raw,
      band: rawToBand(tableFor("listening"), raw),
    });
  });

  router.get("/v1/bands/reading", (ctx) => {
    const module = readModule(ctx.query.get("module") ?? undefined);
    const raw = parseInteger(ctx.query.get("raw"), "raw", {
      required: true,
      min: MIN_RAW,
      max: MAX_RAW,
    }) as number;
    return ok({
      paper: "reading",
      module,
      raw,
      band: rawToBand(tableFor("reading", module), raw),
    });
  });

  router.get("/v1/bands/tables", (_ctx) =>
    ok({
      listening: tableFor("listening"),
      reading: {
        academic: tableFor("reading", "academic"),
        general: tableFor("reading", "general"),
      },
    }),
  );

  // ---- Writing ------------------------------------------------------------
  router.get("/v1/writing/tasks", (_ctx) => ok(WRITING_TASK_GUIDE));

  router.get("/v1/writing/categories", (_ctx) => ok(WRITING_CATEGORIES));

  router.get("/v1/writing/prompts", (ctx) => {
    const filtered = filterPrompts(ctx);
    const page = parsePage(ctx.query);
    return ok(paginate(filtered, page));
  });

  router.get("/v1/writing/prompts/generate", (ctx) => {
    const count =
      parseInteger(ctx.query.get("count"), "count", {
        min: MIN_GENERATED,
        max: MAX_GENERATED,
      }) ?? 1;
    const seed = ctx.query.get("seed") ?? "ielts-api";
    const prompts = generateEssays({ seed, count });
    return ok(prompts, {
      seed: seedToUint32(seed),
      count: prompts.length,
      deterministic: true,
      note: "Prompts are synthetic and reproducible for the given seed.",
    });
  });

  router.get("/v1/writing/prompts/random", (ctx) => {
    const seed = randFrom(ctx.query);
    const filtered = filterPrompts(ctx);
    if (filtered.length === 0) {
      throw notFound("No writing prompts match the current filters.");
    }
    const prompt = pickOne(filtered, seed);
    return ok(prompt);
  });

  router.get("/v1/writing/prompts/:id", (ctx) => {
    const prompt = getWritingPrompt(ctx.params.id as string);
    if (!prompt) {
      throw notFound(`No writing prompt with id "${ctx.params.id}".`);
    }
    return ok(prompt);
  });

  // ---- Speaking -----------------------------------------------------------
  router.get("/v1/speaking/parts", (_ctx) => ok(SPEAKING_PARTS));

  router.get("/v1/speaking/cue-cards", (ctx) => {
    const page = parsePage(ctx.query);
    return ok(paginate(cueCardPool(ctx), page));
  });

  router.get("/v1/speaking/cue-cards/random", (ctx) => {
    const seed = randFrom(ctx.query);
    return ok(pickOne(cueCardPool(ctx), seed));
  });

  router.get("/v1/speaking/cue-cards/:id", (ctx) => {
    const card = getCueCard(ctx.params.id as string);
    if (!card) {
      throw notFound(`No cue card with id "${ctx.params.id}".`);
    }
    return ok(card);
  });

  // ---- Vocabulary ---------------------------------------------------------
  router.get("/v1/vocabulary/categories", (_ctx) =>
    ok(
      VOCABULARY.map((category) => ({
        id: category.id,
        name: category.name,
        count: category.words.length,
      })),
    ),
  );

  router.get("/v1/vocabulary/words", (ctx) => {
    const categoryId = ctx.query.get("category");
    let words;
    if (categoryId && categoryId !== "") {
      const category = getVocabCategory(categoryId);
      if (!category) {
        throw badRequest(
          `unknown vocabulary category "${categoryId}"; expected one of ` +
            `${VOCAB_CATEGORY_IDS.join(", ")}.`,
          { allowed: VOCAB_CATEGORY_IDS },
        );
      }
      words = category.words;
    } else {
      words = VOCABULARY.flatMap((category) =>
        category.words.map((word) => ({ ...word, category: category.id })),
      );
    }
    const page = parsePage(ctx.query);
    return ok(paginate(words, page));
  });

  // ---- Reading ------------------------------------------------------------
  router.get("/v1/reading/question-types", (ctx) => {
    const page = parsePage(ctx.query);
    return ok(paginate(QUESTION_TYPES, page));
  });

  router.get("/v1/reading/question-types/:id", (ctx) => {
    const type = getQuestionType(ctx.params.id as string);
    if (!type) {
      throw notFound(`No question type with id "${ctx.params.id}".`);
    }
    return ok(type);
  });

  return router;
}
