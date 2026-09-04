import type { IncomingMessage } from "node:http";
import { ApiError } from "./errors.ts";

/** Maximum accepted JSON request body: 1 MiB. */
export const MAX_BODY_BYTES = 1_048_576;

/**
 * Read and parse a JSON request body.
 *
 * @throws ApiError 415 when Content-Type is not `application/json`
 * @throws ApiError 400 when the body is empty or is not valid JSON
 * @throws ApiError 413 when the body exceeds {@link MAX_BODY_BYTES}
 */
export async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const contentType = req.headers["content-type"] ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new ApiError(
      415,
      "unsupported_media_type",
      `Content-Type must be application/json. Received '${contentType || "none"}'.`,
      [{ param: "headers.content-type", message: "Send 'Content-Type: application/json'." }],
    );
  }

  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = chunk as Buffer;
    size += buffer.length;
    if (size > MAX_BODY_BYTES) {
      throw new ApiError(
        413,
        "payload_too_large",
        `Request body exceeds ${MAX_BODY_BYTES} bytes.`,
        [{ param: "body", message: `Keep request bodies under ${MAX_BODY_BYTES} bytes.` }],
      );
    }
    chunks.push(buffer);
  }

  if (size === 0) {
    throw new ApiError(
      400,
      "invalid_body",
      "Request body is empty but a JSON object was expected.",
      [{ param: "body", message: 'Send a JSON object, e.g. {"listening": 7, ...}.' }],
    );
  }

  const text = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError(400, "invalid_json", "Request body is not valid JSON.", [
      { param: "body", message: "Check the JSON syntax and try again." },
    ]);
  }
}
