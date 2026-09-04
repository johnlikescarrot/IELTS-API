import { createHash } from "node:crypto";
import type { ServerResponse } from "node:http";

/** Compute a weak ETag for a response body. */
export function computeEtag(body: string): string {
  return `W/"${createHash("sha256").update(body).digest("hex").slice(0, 24)}"`;
}

/**
 * Check an `If-None-Match` header against an ETag. Supports the exact tag,
 * the tag without its weak validator prefix and `*`.
 */
export function etagMatches(headerValue: string, etag: string): boolean {
  const tags = headerValue.split(",").map((tag) => tag.trim());
  return tags.includes(etag) || tags.includes("*") || tags.includes(etag.replace(/^W\//u, ""));
}

/** Normalise a request header that Node may expose as string or string[]. */
export function headerToString(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value.join(",") : value;
}

/** Apply shared permissive CORS and hardening headers to every response. */
export function applyCorsHeaders(res: ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Expose-Headers", "ETag, X-Request-Id, X-Response-Time");
  res.setHeader("Access-Control-Max-Age", "86400");
  res.setHeader("X-Content-Type-Options", "nosniff");
}
