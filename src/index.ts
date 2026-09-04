/**
 * Public entry point of the `ielts-api` package.
 *
 * The package is usable in three ways, all from the same code: as a TypeScript
 * library, as an embeddable pure request handler, and as a standalone HTTP
 * server.
 *
 * @example Library use
 * ```ts
 * import { overallBandScore, rawScoreToBand } from "ielts-api";
 *
 * rawScoreToBand("reading-academic", 30).band; // 7
 * overallBandScore({ listening: 6.5, reading: 6.5, writing: 6, speaking: 6 }).overall; // 6.5
 * ```
 *
 * @example Embedded handler
 * ```ts
 * import { createApp } from "ielts-api";
 *
 * const app = createApp();
 * const response = app.handle({
 *   method: "GET",
 *   path: "/v1/bands/7",
 *   query: new URLSearchParams(),
 *   headers: {},
 *   body: null,
 * });
 * ```
 *
 * @packageDocumentation
 */

export * from "./core/errors.ts";
export * from "./core/random.ts";
export * from "./core/types.ts";

export * from "./domain/band.ts";
export * from "./domain/cefr.ts";
export * from "./domain/conversion.ts";
export * from "./domain/descriptors.ts";
export * from "./domain/planning.ts";

export * from "./text/lexicon.ts";
export * from "./text/readability.ts";
export * from "./text/syllables.ts";
export * from "./text/tokenize.ts";

export * from "./analysis/issues.ts";
export * from "./analysis/writing.ts";

export * from "./data/awl.ts";
export * from "./data/cohesion.ts";
export * from "./data/mistakes.ts";
export * from "./data/speaking.ts";
export * from "./data/writing-tasks.ts";

export * from "./http/app.ts";
export * from "./http/openapi.ts";
export * from "./http/respond.ts";
export * from "./http/route.ts";
export * from "./http/router.ts";
export * from "./http/server.ts";

export * from "./meta.ts";
