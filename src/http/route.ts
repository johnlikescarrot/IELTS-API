/**
 * The route definition record.
 *
 * A route couples its handler to the metadata needed to describe it in the
 * OpenAPI document. Because both the running server and the published
 * specification are generated from the same records, the two cannot drift apart.
 *
 * @packageDocumentation
 */

import type { HttpMethod, RouteParams } from "./router.ts";
import type { ApiRequest, HandlerResult } from "./respond.ts";

/** Everything a handler needs to serve a request. */
export interface RequestContext {
  /** The normalised request. */
  readonly request: ApiRequest;
  /** Path parameters captured by the router. */
  readonly params: RouteParams;
}

/** A route handler. */
export type Handler = (context: RequestContext) => HandlerResult;

/** A JSON Schema fragment, kept intentionally loose. */
export type SchemaObject = Record<string, unknown>;

/** An OpenAPI parameter description. */
export interface ParameterDescription {
  /** Parameter name. */
  readonly name: string;
  /** Where the parameter appears. */
  readonly in: "query" | "path";
  /** Whether the parameter must be supplied. */
  readonly required?: boolean;
  /** Human-readable description. */
  readonly description: string;
  /** JSON Schema for the parameter value. */
  readonly schema: SchemaObject;
}

/** A route together with its documentation. */
export interface RouteDefinition {
  /** HTTP method. */
  readonly method: HttpMethod;
  /** Path pattern using `:name` parameters. */
  readonly path: string;
  /** OpenAPI operation identifier. */
  readonly operationId: string;
  /** One-line summary. */
  readonly summary: string;
  /** Longer description, rendered in the documentation page. */
  readonly description: string;
  /** OpenAPI tags. */
  readonly tags: readonly string[];
  /** Parameters accepted by the route. */
  readonly parameters?: readonly ParameterDescription[];
  /** Schema of the JSON request body, when the route accepts one. */
  readonly requestBody?: SchemaObject;
  /** Schema of the `data` property of a successful response. */
  readonly responseSchema?: SchemaObject;
  /** The handler. */
  readonly handler: Handler;
}
