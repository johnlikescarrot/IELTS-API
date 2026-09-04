import { VERSION } from "./version.ts";

/** OpenAPI 3.1 document served at /openapi.json. */
export const OPENAPI_DOCUMENT = {
  openapi: "3.1.0",
  info: {
    title: "IELTS-API",
    version: VERSION,
    summary: "A free, open, no-authentication REST API for IELTS study data.",
    description:
      "Structured IELTS study data: 120 academic vocabulary entries with CEFR levels, ten speaking topics for Parts 1-3, thirty academic and general training writing prompts, forty common learner mistakes with corrections, paraphrased band descriptors, and an official-rule overall band-score calculator. No authentication, no rate limits, CORS enabled.",
    license: { name: "MIT", url: "https://opensource.org/licenses/MIT" },
    contact: {
      name: "IELTS-API",
      url: "https://github.com/johnlikescarrot/IELTS-API",
    },
  },
  servers: [{ url: "/" }],
  tags: [
    { name: "meta", description: "Discovery, health and citation endpoints." },
    { name: "vocabulary", description: "Academic vocabulary with CEFR levels and topics." },
    { name: "speaking", description: "Speaking practice topics for Parts 1-3." },
    { name: "writing", description: "Academic and general training writing prompts." },
    { name: "mistakes", description: "Common learner mistakes with corrections." },
    { name: "band-scores", description: "Band descriptors and the overall score calculator." },
    { name: "tips", description: "Study tips by skill." },
  ],
  paths: {
    "/": {
      get: {
        tags: ["meta"],
        summary: "API index: discover every endpoint.",
        responses: ok("The API index with an endpoints array."),
      },
    },
    "/health": {
      get: {
        tags: ["meta"],
        summary: "Liveness check with version and uptime.",
        responses: ok("Status, version, uptime and timestamp."),
      },
    },
    "/openapi.json": {
      get: {
        tags: ["meta"],
        summary: "This OpenAPI 3.1 document.",
        responses: ok("The OpenAPI document."),
      },
    },
    "/v1/citation": {
      get: {
        tags: ["meta"],
        summary: "Citation metadata for the API in BibTeX, RIS, APA or JSON form.",
        parameters: [
          {
            name: "format",
            in: "query",
            schema: { type: "string", enum: ["bibtex", "ris", "apa", "json"], default: "json" },
            description: "Output format for reference managers.",
          },
        ],
        responses: {
          ...ok("Citation metadata (JSON object or plain text)."),
          ...badRequest("Unknown format."),
        },
      },
    },
    "/v1/vocabulary": {
      get: {
        tags: ["vocabulary"],
        summary: "List vocabulary entries with filtering, search, sorting and pagination.",
        parameters: [
          enumParam("topic", "Filter by topic, e.g. environment."),
          enumParam("cefr", "Filter by CEFR level."),
          enumParam("part_of_speech", "Filter by part of speech."),
          {
            name: "q",
            in: "query",
            schema: { type: "string" },
            description: "All words must appear in the word, definition, synonyms or topics.",
          },
          enumParam("sort", "Sort field.", ["id", "word", "cefr"], "id"),
          enumParam("order", "Sort direction.", ["asc", "desc"], "asc"),
          pageParam(),
          perPageParam(),
        ],
        responses: ok("A paginated list of vocabulary entries."),
      },
    },
    "/v1/vocabulary/random": {
      get: {
        tags: ["vocabulary"],
        summary: "Sample vocabulary deterministically; the seed defaults to today's UTC date.",
        parameters: [
          {
            name: "count",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 50, default: 1 },
          },
          { name: "seed", in: "query", schema: { type: "string" } },
          enumParam("topic", "Filter by topic before sampling."),
          enumParam("cefr", "Filter by CEFR level before sampling."),
          enumParam("part_of_speech", "Filter by part of speech before sampling."),
          { name: "q", in: "query", schema: { type: "string" } },
        ],
        responses: ok("A deterministic sample of vocabulary entries."),
      },
    },
    "/v1/vocabulary/{idOrWord}": {
      get: {
        tags: ["vocabulary"],
        summary: "Fetch one vocabulary entry by numeric id or exact word.",
        parameters: [
          {
            name: "idOrWord",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Numeric id (e.g. 1) or exact word (e.g. curriculum).",
          },
        ],
        responses: {
          ...ok("A single vocabulary entry."),
          ...notFound("No entry matches the id or word."),
        },
      },
    },
    "/v1/topics": {
      get: {
        tags: ["vocabulary"],
        summary: "List vocabulary topics with entry counts.",
        responses: ok("Topics and how many entries each has."),
      },
    },
    "/v1/speaking": {
      get: {
        tags: ["speaking"],
        summary: "List IELTS Speaking topics (Parts 1, 2 and 3).",
        parameters: [pageParam(), perPageParam()],
        responses: ok("A paginated list of speaking topics."),
      },
    },
    "/v1/speaking/random": {
      get: {
        tags: ["speaking"],
        summary: "Sample speaking topics deterministically; the seed defaults to today's date.",
        parameters: [
          {
            name: "count",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 10, default: 1 },
          },
          { name: "seed", in: "query", schema: { type: "string" } },
        ],
        responses: ok("A deterministic sample of speaking topics."),
      },
    },
    "/v1/speaking/{id}": {
      get: {
        tags: ["speaking"],
        summary: "Fetch one speaking topic by its slug id.",
        parameters: [pathParam("id", "Topic slug, e.g. work-and-career.")],
        responses: {
          ...ok("A single speaking topic."),
          ...notFound("No topic matches the id."),
        },
      },
    },
    "/v1/writing": {
      get: {
        tags: ["writing"],
        summary: "List academic and general training writing prompts.",
        parameters: [
          enumParam("module", "Filter by test module.", ["academic", "general"]),
          enumParam("task", "Filter by task number.", ["1", "2"]),
          enumParam("type", "Filter by question type."),
          { name: "q", in: "query", schema: { type: "string" } },
          pageParam(),
          perPageParam(),
        ],
        responses: ok("A paginated list of writing prompts."),
      },
    },
    "/v1/writing/random": {
      get: {
        tags: ["writing"],
        summary: "Sample writing prompts deterministically; the seed defaults to today's date.",
        parameters: [
          {
            name: "count",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 30, default: 1 },
          },
          { name: "seed", in: "query", schema: { type: "string" } },
          enumParam("module", "Filter by test module.", ["academic", "general"]),
          enumParam("task", "Filter by task number.", ["1", "2"]),
          enumParam("type", "Filter by question type."),
        ],
        responses: ok("A deterministic sample of writing prompts."),
      },
    },
    "/v1/writing/{id}": {
      get: {
        tags: ["writing"],
        summary: "Fetch one writing prompt by its id.",
        parameters: [pathParam("id", "Prompt id, e.g. w001.")],
        responses: {
          ...ok("A single writing prompt."),
          ...notFound("No prompt matches the id."),
        },
      },
    },
    "/v1/mistakes": {
      get: {
        tags: ["mistakes"],
        summary: "List common learner mistakes with corrections and explanations.",
        parameters: [
          enumParam("category", "Filter by mistake category."),
          { name: "q", in: "query", schema: { type: "string" } },
          enumParam("sort", "Sort field.", ["id", "category"], "id"),
          enumParam("order", "Sort direction.", ["asc", "desc"], "asc"),
          pageParam(),
          perPageParam(),
        ],
        responses: ok("A paginated list of common mistakes."),
      },
    },
    "/v1/band-descriptors": {
      get: {
        tags: ["band-scores"],
        summary: "Band descriptors (bands 5-9) for writing and speaking, plus the overall scale.",
        parameters: [
          enumParam("skill", "Filter by productive skill.", ["writing", "speaking"]),
          {
            name: "band",
            in: "query",
            schema: { type: "integer", minimum: 5, maximum: 9 },
            description: "Filter by band.",
          },
        ],
        responses: ok("Paraphrased band descriptors and the overall nine-band scale."),
      },
    },
    "/v1/band-score": {
      get: {
        tags: ["band-scores"],
        summary: "Explain how the overall band score is calculated.",
        responses: ok("The rounding rules with a worked example."),
      },
      post: {
        tags: ["band-scores"],
        summary: "Calculate an overall band score from the four skill scores.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BandScoreRequest" },
              example: { listening: 6.5, reading: 6, writing: 6, speaking: 6.5 },
            },
          },
        },
        responses: {
          ...ok("The four skill scores plus the rounded overall band."),
          ...badRequest("A score is missing, out of range or not a half band."),
          ...errorResponse(415, "Content-Type must be application/json."),
          ...errorResponse(413, "Body exceeds 1 MiB."),
        },
      },
    },
    "/v1/tips": {
      get: {
        tags: ["tips"],
        summary: "List study tips for listening, reading, writing, speaking and general strategy.",
        parameters: [enumParam("skill", "Filter by skill."), pageParam(), perPageParam()],
        responses: ok("A paginated list of study tips."),
      },
    },
  },
  components: {
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              status: { type: "integer" },
              code: { type: "string" },
              message: { type: "string" },
              details: { type: "array", items: { type: "object" } },
            },
            required: ["status", "code", "message"],
          },
        },
        required: ["error"],
      },
      PaginationMeta: {
        type: "object",
        properties: {
          page: { type: "integer" },
          perPage: { type: "integer" },
          total: { type: "integer" },
          totalPages: { type: "integer" },
          links: {
            type: "object",
            properties: {
              self: { type: "string" },
              first: { type: "string" },
              prev: { type: ["string", "null"] },
              next: { type: ["string", "null"] },
              last: { type: "string" },
            },
          },
        },
      },
      BandScoreRequest: {
        type: "object",
        required: ["listening", "reading", "writing", "speaking"],
        properties: {
          listening: { type: "number", minimum: 0, maximum: 9, multipleOf: 0.5 },
          reading: { type: "number", minimum: 0, maximum: 9, multipleOf: 0.5 },
          writing: { type: "number", minimum: 0, maximum: 9, multipleOf: 0.5 },
          speaking: { type: "number", minimum: 0, maximum: 9, multipleOf: 0.5 },
        },
      },
    },
  },
} as const;

type Responses = Record<string, unknown>;

function ok(description: string): Responses {
  return {
    "200": { description, content: { "application/json": { schema: { type: "object" } } } },
  };
}

function badRequest(description: string): Responses {
  return errorResponse(400, description);
}

function notFound(description: string): Responses {
  return errorResponse(404, description);
}

function errorResponse(status: number, description: string): Responses {
  return {
    [String(status)]: {
      description,
      content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
    },
  };
}

interface QueryParamOptions {
  description: string;
  values?: readonly string[];
  defaultValue?: string;
}

function enumParam(
  name: string,
  description: string,
  values?: readonly string[],
  defaultValue?: string,
) {
  const options: QueryParamOptions = { description, values, defaultValue };
  const schema: Record<string, unknown> = { type: "string" };
  if (options.values !== undefined) {
    schema["enum"] = [...options.values];
  }
  if (options.defaultValue !== undefined) {
    schema["default"] = options.defaultValue;
  }
  return { name, in: "query", schema, description: options.description };
}

function pageParam() {
  return {
    name: "page",
    in: "query",
    schema: { type: "integer", minimum: 1, default: 1 },
    description: "Page number (1-based).",
  };
}

function perPageParam() {
  return {
    name: "per_page",
    in: "query",
    schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
    description: "Items per page (1-100).",
  };
}

function pathParam(name: string, description: string) {
  return { name, in: "path", required: true, schema: { type: "string" }, description };
}
