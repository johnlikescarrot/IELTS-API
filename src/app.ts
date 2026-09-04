import cors from "@fastify/cors";
import Fastify, { type FastifyReply } from "fastify";
import { type ZodIssue, type ZodTypeAny, type output } from "zod";

import {
  findPracticePrompt,
  findSkill,
  practicePrompts,
  rawScoreThresholds,
  skills,
  sources,
  type RawScoreTarget,
} from "./catalog.js";
import { openapiDocument } from "./openapi.js";
import { calculateOverallBand } from "./scoring.js";
import {
  overallScoreQuerySchema,
  practiceQuerySchema,
  promptParamsSchema,
  rawScoreQuerySchema,
  skillParamsSchema,
} from "./validation.js";

const cacheControl = "public, max-age=86400, stale-while-revalidate=604800";
const sourceRevision = "2026-09-04";

const service = {
  authentication: "none",
  contentLicense: "CC0-1.0 for original practice prompts; MIT for software",
  dataRevision: sourceRevision,
  name: "IELTS API",
  status: "available",
  version: "1.0.0",
} as const;

const documentationPage = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>IELTS API documentation</title>
  </head>
  <body>
    <main>
      <h1>IELTS API</h1>
      <p>Free, no-authentication reference data and original CC0 practice prompts.</p>
      <p><a href="/openapi.json">OpenAPI 3.1 document</a></p>
      <ul>
        <li><a href="/v1/reference">Reference catalog</a></li>
        <li><a href="/v1/scoring">Scoring guide</a></li>
        <li><a href="/v1/practice">Original practice prompts</a></li>
        <li><a href="/v1/sources">Sources</a></li>
      </ul>
      <p>This independent project is not affiliated with IELTS or its owners.</p>
    </main>
  </body>
</html>`;

type ValidationFailure = {
  error: "invalid_request";
  issues: Array<{ message: string; path: string }>;
};

function sendCacheable(reply: FastifyReply, body: unknown) {
  return reply.header("cache-control", cacheControl).send(body);
}

function sendValidationError(reply: FastifyReply, issues: ZodIssue[]) {
  const body: ValidationFailure = {
    error: "invalid_request",
    issues: issues.map((issue) => ({
      message: issue.message,
      path: issue.path.join(".") || "query",
    })),
  };

  return reply.code(400).send(body);
}

function parse<T extends ZodTypeAny>(
  schema: T,
  value: unknown,
): { data: output<T>; success: true } | { issues: ZodIssue[]; success: false } {
  const result = schema.safeParse(value);

  if (result.success) {
    return { data: result.data, success: true };
  }

  return { issues: result.error.issues, success: false };
}

export async function buildApp() {
  const app = Fastify({
    logger: false,
    routerOptions: { maxParamLength: 256 },
  });

  await app.register(cors, { origin: true });

  app.setNotFoundHandler((request, reply) =>
    reply.code(404).send({
      error: "not_found",
      message: `No route matches ${request.method} ${request.url}`,
    }),
  );

  const overview = () => ({
    ...service,
    documentation: "/docs",
    openapi: "/openapi.json",
    routes: {
      citation: "/v1/citation",
      health: "/v1/health",
      practice: "/v1/practice",
      reference: "/v1/reference",
      scoring: "/v1/scoring",
      sections: "/v1/sections",
      sources: "/v1/sources",
    },
  });

  app.get("/", (_request, reply) => sendCacheable(reply, overview()));
  app.get("/v1", (_request, reply) => sendCacheable(reply, overview()));
  app.get("/docs", (_request, reply) =>
    reply
      .header("cache-control", cacheControl)
      .type("text/html; charset=utf-8")
      .send(documentationPage),
  );
  app.get("/docs/", (_request, reply) =>
    reply
      .header("cache-control", cacheControl)
      .type("text/html; charset=utf-8")
      .send(documentationPage),
  );

  app.get("/v1/health", (_request, reply) =>
    sendCacheable(reply, {
      ...service,
      checks: { catalog: "loaded", sources: "loaded" },
    }),
  );

  app.get("/openapi.json", (_request, reply) =>
    sendCacheable(reply, openapiDocument),
  );

  app.get("/v1/reference", (_request, reply) =>
    sendCacheable(reply, {
      revision: sourceRevision,
      sections: skills,
      sources,
    }),
  );

  app.get("/v1/sources", (_request, reply) =>
    sendCacheable(reply, { revision: sourceRevision, sources }),
  );

  app.get("/v1/sections", (_request, reply) =>
    sendCacheable(reply, { sections: skills }),
  );

  app.get("/v1/sections/:skill", (request, reply) => {
    const parsed = parse(skillParamsSchema, request.params);

    if (!parsed.success) {
      return sendValidationError(reply, parsed.issues);
    }

    return sendCacheable(reply, { section: findSkill(parsed.data.skill) });
  });

  app.get("/v1/scoring", (_request, reply) =>
    sendCacheable(reply, {
      componentScoreRange: { maximum: 9, minimum: 0, step: 0.5 },
      overallMethod:
        "Average the four component scores and round to the nearest whole or half band.",
      rawScoreThresholds,
      warning:
        "Raw-score thresholds are indicative published marks. Exact marks may vary slightly by test version.",
    }),
  );

  app.get("/v1/scoring/overall", (request, reply) => {
    const parsed = parse(overallScoreQuerySchema, request.query);

    if (!parsed.success) {
      return sendValidationError(reply, parsed.issues);
    }

    const components = parsed.data;
    const average =
      (components.listening +
        components.reading +
        components.writing +
        components.speaking) /
      4;

    return sendCacheable(reply, {
      average,
      components,
      overallBand: calculateOverallBand([
        components.listening,
        components.reading,
        components.writing,
        components.speaking,
      ]),
      rounding: "nearest whole or half band",
    });
  });

  app.get("/v1/scoring/raw", (request, reply) => {
    const parsed = parse(rawScoreQuerySchema, request.query);

    if (!parsed.success) {
      return sendValidationError(reply, parsed.issues);
    }

    const target = parsed.data.target as RawScoreTarget;
    const approximateMinimumCorrect =
      rawScoreThresholds[parsed.data.test][target];

    if (approximateMinimumCorrect === undefined) {
      return reply.code(422).send({
        error: "threshold_not_published",
        message: `No indicative ${parsed.data.test} threshold is catalogued for band ${target}.`,
        sourceId: "ielts-scoring-detail",
      });
    }

    return sendCacheable(reply, {
      approximateMinimumCorrect,
      sourceId: "ielts-scoring-detail",
      targetBand: target,
      test: parsed.data.test,
      warning:
        "Indicative only; exact thresholds can vary slightly by test version.",
    });
  });

  app.get("/v1/practice", (request, reply) => {
    const parsed = parse(practiceQuerySchema, request.query);

    if (!parsed.success) {
      return sendValidationError(reply, parsed.issues);
    }

    const filtered = practicePrompts
      .filter(
        (prompt) => !parsed.data.skill || prompt.skill === parsed.data.skill,
      )
      .filter(
        (prompt) =>
          !parsed.data.module ||
          prompt.module === "both" ||
          prompt.module === parsed.data.module,
      )
      .slice(0, parsed.data.limit);

    return sendCacheable(reply, {
      filters: parsed.data,
      license: "CC0-1.0",
      prompts: filtered,
      total: filtered.length,
    });
  });

  app.get("/v1/practice/:id", (request, reply) => {
    const parsed = parse(promptParamsSchema, request.params);

    if (!parsed.success) {
      return sendValidationError(reply, parsed.issues);
    }

    const prompt = findPracticePrompt(parsed.data.id);

    if (prompt === undefined) {
      return reply.code(404).send({
        error: "prompt_not_found",
        message: `No practice prompt exists with id ${parsed.data.id}.`,
      });
    }

    return sendCacheable(reply, { prompt });
  });

  app.get("/v1/citation", (_request, reply) =>
    sendCacheable(reply, {
      citationFile: "/CITATION.cff",
      cffVersion: "1.2.0",
      preferredCitation:
        "IELTS API Contributors (2026). IELTS API (Version 1.0.0) [Computer software].",
      repository: "https://github.com/johnlikescarrot/IELTS-API",
    }),
  );

  return app;
}
