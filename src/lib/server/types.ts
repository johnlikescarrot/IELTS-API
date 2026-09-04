/** HTTP methods the API routes support. */
export type HttpMethod = "GET" | "POST" | "HEAD" | "OPTIONS";

/** The parsed context handed to every route handler. */
export interface HandlerContext {
  /** Normalised, URL-decoded pathname without query string. */
  path: string;
  method: HttpMethod;
  /** Named parameters captured from the path template, e.g. `:id`. */
  params: Record<string, string>;
  /** Parsed query string. */
  query: URLSearchParams;
  /** Request headers (lower-cased keys). */
  headers: Readonly<Record<string, string>>;
  /** Parsed JSON body for POST requests. */
  body: unknown;
}

/** A handler returns any JSON-serialisable value. */
export type Handler = (context: HandlerContext) => unknown;

/** A response produced by {@link App.dispatch}. */
export interface ServiceResponse {
  status: number;
  headers: Record<string, string>;
  /** The serialised response body (or an empty string). */
  body: string;
}
