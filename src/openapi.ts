export const openapiDocument = {
  openapi: "3.1.0",
  info: {
    title: "IELTS API",
    version: "1.0.0",
    description:
      "A free, no-authentication API for IELTS reference data, transparent score calculations, and original CC0 practice prompts. It is not an official IELTS service.",
  },
  servers: [{ url: "/" }],
  tags: [
    { name: "Meta", description: "Service metadata and health." },
    { name: "Reference", description: "Cited exam-format reference data." },
    { name: "Scoring", description: "Transparent score utilities." },
    { name: "Practice", description: "Original CC0-licensed prompts." },
  ],
  paths: {
    "/v1/health": {
      get: {
        tags: ["Meta"],
        summary: "Check service availability",
        responses: { "200": { description: "Service is available." } },
      },
    },
    "/v1/reference": {
      get: {
        tags: ["Reference"],
        summary: "Retrieve the complete compact reference catalog",
        responses: {
          "200": { description: "Reference catalog with sources." },
        },
      },
    },
    "/v1/sections": {
      get: {
        tags: ["Reference"],
        summary: "List the four assessed skills",
        responses: { "200": { description: "Section summaries." } },
      },
    },
    "/v1/sections/{skill}": {
      get: {
        tags: ["Reference"],
        summary: "Retrieve one assessed skill",
        parameters: [
          {
            in: "path",
            name: "skill",
            required: true,
            schema: {
              enum: ["listening", "reading", "writing", "speaking"],
              type: "string",
            },
          },
        ],
        responses: {
          "200": { description: "Section summary." },
          "400": { description: "Invalid skill." },
        },
      },
    },
    "/v1/scoring": {
      get: {
        tags: ["Scoring"],
        summary: "Retrieve scoring method and indicative raw-score thresholds",
        responses: { "200": { description: "Scoring reference." } },
      },
    },
    "/v1/scoring/overall": {
      get: {
        tags: ["Scoring"],
        summary: "Calculate the overall band from four component scores",
        parameters: ["listening", "reading", "writing", "speaking"].map(
          (name) => ({
            in: "query",
            name,
            required: true,
            schema: {
              example: "6.5",
              pattern: "0-9 in 0.5 steps",
              type: "string",
            },
          }),
        ),
        responses: {
          "200": { description: "Average and reported overall band." },
          "400": { description: "Invalid or missing component score." },
        },
      },
    },
    "/v1/scoring/raw": {
      get: {
        tags: ["Scoring"],
        summary: "Retrieve an official indicative raw-mark threshold",
        parameters: [
          {
            in: "query",
            name: "test",
            required: true,
            schema: {
              enum: [
                "listening",
                "reading_academic",
                "reading_general_training",
              ],
              type: "string",
            },
          },
          {
            in: "query",
            name: "target",
            required: true,
            schema: { enum: [4, 5, 6, 7, 8], type: "integer" },
          },
        ],
        responses: {
          "200": { description: "Indicative threshold." },
          "400": { description: "Invalid query." },
          "422": { description: "The source does not publish this threshold." },
        },
      },
    },
    "/v1/practice": {
      get: {
        tags: ["Practice"],
        summary: "List original practice prompts",
        parameters: [
          {
            in: "query",
            name: "skill",
            required: false,
            schema: { enum: ["writing", "speaking"], type: "string" },
          },
          {
            in: "query",
            name: "module",
            required: false,
            schema: { enum: ["academic", "general_training"], type: "string" },
          },
          {
            in: "query",
            name: "limit",
            required: false,
            schema: { default: 10, maximum: 20, minimum: 1, type: "integer" },
          },
        ],
        responses: {
          "200": { description: "Filtered CC0 prompt collection." },
        },
      },
    },
    "/v1/practice/{id}": {
      get: {
        tags: ["Practice"],
        summary: "Retrieve one original practice prompt",
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": { description: "A CC0 practice prompt." },
          "400": { description: "Invalid prompt id." },
          "404": { description: "Prompt does not exist." },
        },
      },
    },
    "/v1/sources": {
      get: {
        tags: ["Reference"],
        summary: "List source citations and their supported claims",
        responses: { "200": { description: "Citable sources." } },
      },
    },
    "/v1/citation": {
      get: {
        tags: ["Meta"],
        summary: "Retrieve citation metadata",
        responses: { "200": { description: "Software citation metadata." } },
      },
    },
  },
} as const;
