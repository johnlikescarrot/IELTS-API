/**
 * Builds the OpenAPI 3.0 document for the IELTS API. Exposing a versioned,
 * machine-readable contract is what makes the API easy to cite, integrate and
 * document in research and teaching contexts.
 */
export interface OpenApiDocument {
  openapi: string;
  info: {
    title: string;
    description: string;
    version: string;
    license: { name: string };
  };
  servers: Array<{ url: string; description: string }>;
  paths: Record<string, Record<string, unknown>>;
  components?: Record<string, unknown>;
}

const paginatedResponse = (description: string) => ({
  description,
  content: { "application/json": { schema: { $ref: "#/components/schemas/Paginated" } } },
});

const itemResponse = (description: string) => ({
  description,
  content: { "application/json": { schema: { type: "object" } } },
});

const notFoundResponse = {
  description: "Resource not found",
  content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
};

export function buildOpenApi(): OpenApiDocument {
  const paths: Record<string, Record<string, unknown>> = {
    "/api/v1/health": {
      get: {
        summary: "Health check",
        responses: {
          200: {
            description: "Service is running",
            content: { "application/json": { schema: { type: "object" } } },
          },
        },
      },
    },
    "/api/v1/topics": {
      get: {
        summary: "List IELTS topics",
        responses: { 200: paginatedResponse("Paged list of topics") },
      },
    },
    "/api/v1/topics/{id}": {
      get: {
        summary: "Get a topic by id",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: itemResponse("A topic"), 404: notFoundResponse },
      },
    },
    "/api/v1/topics/{id}/vocabulary": {
      get: {
        summary: "Vocabulary for a topic",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: itemResponse("Vocabulary entries"), 404: notFoundResponse },
      },
    },
    "/api/v1/vocabulary": {
      get: {
        summary: "List or search vocabulary",
        parameters: [
          { name: "q", in: "query", schema: { type: "string" } },
          { name: "topic", in: "query", schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
          { name: "offset", in: "query", schema: { type: "integer" } },
        ],
        responses: { 200: paginatedResponse("Paged list of vocabulary") },
      },
    },
    "/api/v1/vocabulary/{id}": {
      get: {
        summary: "Get vocabulary by id",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: itemResponse("A vocabulary entry"), 404: notFoundResponse },
      },
    },
    "/api/v1/synonyms": {
      get: {
        summary: "List or search synonym groups",
        parameters: [{ name: "q", in: "query", schema: { type: "string" } }],
        responses: { 200: paginatedResponse("Paged list of synonym groups") },
      },
    },
    "/api/v1/band-descriptors": {
      get: {
        summary: "List band descriptors, optionally filtered by skill or band",
        parameters: [
          {
            name: "skill",
            in: "query",
            schema: { type: "string", enum: ["listening", "reading", "writing", "speaking"] },
          },
          { name: "band", in: "query", schema: { type: "integer" } },
        ],
        responses: { 200: paginatedResponse("Paged list of band descriptors") },
      },
    },
    "/api/v1/writing": {
      get: {
        summary: "List or filter writing tasks",
        parameters: [
          { name: "task", in: "query", schema: { type: "integer", enum: [1, 2] } },
          { name: "topic", in: "query", schema: { type: "string" } },
        ],
        responses: { 200: paginatedResponse("Paged list of writing tasks") },
      },
    },
    "/api/v1/speaking": {
      get: {
        summary: "Search speaking parts and cue cards",
        parameters: [{ name: "q", in: "query", schema: { type: "string" } }],
        responses: { 200: itemResponse("Speaking parts and cue cards") },
      },
    },
    "/api/v1/speaking/parts": {
      get: {
        summary: "List speaking part questions",
        parameters: [{ name: "topic", in: "query", schema: { type: "string" } }],
        responses: { 200: paginatedResponse("Paged list of speaking parts") },
      },
    },
    "/api/v1/speaking/cue-cards": {
      get: {
        summary: "List speaking cue cards",
        parameters: [{ name: "topic", in: "query", schema: { type: "string" } }],
        responses: { 200: paginatedResponse("Paged list of cue cards") },
      },
    },
    "/api/v1/reading": {
      get: {
        summary: "List or search reading question types",
        parameters: [{ name: "q", in: "query", schema: { type: "string" } }],
        responses: { 200: paginatedResponse("Paged list of reading question types") },
      },
    },
    "/api/v1/idioms": {
      get: {
        summary: "List or search idioms",
        parameters: [
          { name: "q", in: "query", schema: { type: "string" } },
          { name: "topic", in: "query", schema: { type: "string" } },
        ],
        responses: { 200: paginatedResponse("Paged list of idioms") },
      },
    },
    "/api/v1/mistakes": {
      get: {
        summary: "List or search common mistakes",
        parameters: [{ name: "q", in: "query", schema: { type: "string" } }],
        responses: { 200: paginatedResponse("Paged list of common mistakes") },
      },
    },
    "/api/v1/tips": {
      get: {
        summary: "List or search exam tips",
        parameters: [
          { name: "q", in: "query", schema: { type: "string" } },
          { name: "skill", in: "query", schema: { type: "string" } },
        ],
        responses: { 200: paginatedResponse("Paged list of exam tips") },
      },
    },
    "/openapi.json": {
      get: {
        summary: "This OpenAPI document",
        responses: { 200: { description: "The OpenAPI 3.0 document" } },
      },
    },
  };

  return {
    openapi: "3.0.3",
    info: {
      title: "IELTS API",
      description:
        "A free, open-source, no-authentication API for IELTS study content: vocabulary, synonyms, band descriptors, writing tasks, speaking practice, reading question types, idioms, common mistakes and exam tips.",
      version: "1.0.0",
      license: { name: "MIT" },
    },
    servers: [
      {
        url: "https://ielts-api.example.com",
        description: "Deployed API (replace with your host)",
      },
      { url: "http://localhost:3000", description: "Local development" },
    ],
    paths,
    components: {
      schemas: {
        Paginated: {
          type: "object",
          properties: {
            total: { type: "integer" },
            limit: { type: "integer" },
            offset: { type: "integer" },
            items: { type: "array", items: { type: "object" } },
          },
          required: ["total", "limit", "offset", "items"],
        },
        Error: {
          type: "object",
          properties: { error: { type: "string" } },
          required: ["error"],
        },
      },
    },
  };
}
