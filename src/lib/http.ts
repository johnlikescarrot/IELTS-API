import type { IncomingMessage, ServerResponse } from "node:http";
import type { App } from "./server/app.js";

/** Largest request body the API will attempt to read (1 MiB). */
export const MAX_BODY_BYTES = 1024 * 1024;

/** Read and JSON-parse a request body, capped at {@link MAX_BODY_BYTES}. */
function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let oversized = false;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        oversized = true;
        reject(new Error("Request body exceeds the maximum allowed size."));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (oversized) {
        return;
      }
      const text = Buffer.concat(chunks).toString("utf8");
      if (text === "") {
        resolve(undefined);
        return;
      }
      try {
        resolve(JSON.parse(text));
      } catch {
        resolve(text);
      }
    });
    req.on("error", reject);
  });
}

/** Normalise Node's multi-valued headers into a flat string map. */
function flatHeaders(headers: IncomingMessage["headers"]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of Object.keys(headers)) {
    const value = headers[key];
    if (value === undefined) continue;
    result[key] = Array.isArray(value) ? value.join(", ") : value;
  }
  return result;
}

/**
 * Create a Node HTTP request handler that feeds every request into the
 * {@link App} and writes the resulting {@link ServiceResponse}.
 */
export function createRequestHandler(app: App) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      const method = req.method ?? "GET";
      const verb = method.toUpperCase();
      const body =
        verb === "POST" || verb === "PUT" || verb === "PATCH" ? await readBody(req) : undefined;
      const response = app.dispatch(method, url.pathname, {
        query: url.searchParams,
        body,
        headers: flatHeaders(req.headers),
      });
      res.writeHead(response.status, response.headers);
      res.end(response.body);
    } catch {
      res.writeHead(500, { "content-type": "application/json; charset=utf-8" });
      res.end(
        JSON.stringify({
          error: {
            code: "internal_error",
            message: "An unexpected internal error occurred.",
          },
        }),
      );
    }
  };
}
