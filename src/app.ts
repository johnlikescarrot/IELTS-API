import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { errorPayload, ApiError } from "./lib/errors.ts";
import { applyCorsHeaders, computeEtag, etagMatches, headerToString } from "./lib/respond.ts";
import { matchRoute, type HandlerResult, type RequestContext } from "./lib/router.ts";
import { routes } from "./routes/index.ts";
import { VERSION } from "./version.ts";

const BASE_URL = "http://localhost";

/** Create a fully wired HTTP server without listening. */
export function createApp(): Server {
  return createServer((req, res) => {
    void handleRequest(req, res);
  });
}

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const startedAt = process.hrtime.bigint();
  const requestId = randomUUID();
  applyCorsHeaders(res);

  try {
    // Node guarantees both fields for real requests; the casts just satisfy
    // the types for the raw-socket and absolute-form cases.
    const method = req.method as string;
    const url = new URL(req.url as string, BASE_URL);
    const match = matchRoute(routes, method, url.pathname);

    if (match.kind === "not_found") {
      throw new ApiError(
        404,
        "not_found",
        `No endpoint matches '${url.pathname}'. GET / lists every endpoint.`,
      );
    }

    const allowed = match.allowed.join(", ");

    if (method === "OPTIONS") {
      res.writeHead(204, {
        Allow: allowed,
        "Cache-Control": "no-store",
        "X-Api-Version": VERSION,
        "X-Request-Id": requestId,
        "X-Response-Time": elapsedMilliseconds(startedAt),
      });
      res.end();
      return;
    }

    if (match.kind === "method_not_allowed") {
      res.setHeader("Allow", allowed);
      throw new ApiError(
        405,
        "method_not_allowed",
        `Method ${method} is not allowed here. Allowed: ${allowed}.`,
        [{ param: "method", message: `Use one of: ${allowed}.` }],
      );
    }

    const ctx: RequestContext = {
      req,
      res,
      url,
      query: url.searchParams,
      params: match.params,
    };
    const result = await match.route.handler(ctx);
    sendResult(req, res, method, result, requestId, startedAt);
  } catch (error) {
    sendError(req, res, error, requestId, startedAt);
  }
}

function elapsedMilliseconds(startedAt: bigint): string {
  const elapsed = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
  return `${elapsed.toFixed(2)}ms`;
}

function sendResult(
  req: IncomingMessage,
  res: ServerResponse,
  method: string,
  result: HandlerResult,
  requestId: string,
  startedAt: bigint,
): void {
  const bodyText = result.raw !== undefined ? result.raw.body : JSON.stringify(result.body);
  const contentType =
    result.raw !== undefined ? result.raw.contentType : "application/json; charset=utf-8";
  const isGetLike = method === "GET" || method === "HEAD";
  const cacheable = isGetLike && result.cacheable === true;

  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "Content-Length": String(Buffer.byteLength(bodyText)),
    "Cache-Control": "no-store",
    "X-Api-Version": VERSION,
    "X-Request-Id": requestId,
    "X-Response-Time": elapsedMilliseconds(startedAt),
  };

  let etag: string | undefined;
  if (cacheable) {
    etag = computeEtag(bodyText);
    headers["ETag"] = etag;
    headers["Cache-Control"] = "public, max-age=300";
  }

  const ifNoneMatch = headerToString(req.headers["if-none-match"]);
  if (etag !== undefined && ifNoneMatch !== undefined && etagMatches(ifNoneMatch, etag)) {
    res.writeHead(304, headers);
    res.end();
    return;
  }

  res.writeHead(result.status, headers);
  if (method === "HEAD") {
    res.end();
    return;
  }
  res.end(bodyText);
}

function sendError(
  req: IncomingMessage,
  res: ServerResponse,
  error: unknown,
  requestId: string,
  startedAt: bigint,
): void {
  if (!(error instanceof ApiError)) {
    console.error("[ielts-api] Unhandled error:", error);
  }
  const payload =
    error instanceof ApiError
      ? errorPayload(error)
      : {
          error: {
            status: 500,
            code: "internal_error",
            message:
              "An unexpected error occurred. Please report it at https://github.com/johnlikescarrot/IELTS-API/issues.",
          },
        };
  const bodyText = JSON.stringify(payload);
  const status = error instanceof ApiError ? error.status : 500;
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": String(Buffer.byteLength(bodyText)),
    "Cache-Control": "no-store",
    "X-Api-Version": VERSION,
    "X-Request-Id": requestId,
    "X-Response-Time": elapsedMilliseconds(startedAt),
  });
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  res.end(bodyText);
}

/** Resolve the listen port: explicit option first, then PORT, then 3000. */
export function resolvePort(explicit: number | undefined, envValue: string | undefined): number {
  if (explicit !== undefined) {
    return explicit;
  }
  if (envValue === undefined || envValue === "") {
    return 3000;
  }
  if (!/^\d+$/u.test(envValue)) {
    return 3000;
  }
  return Number.parseInt(envValue, 10);
}

/** Resolve the listen host: explicit option first, then HOST, then 0.0.0.0. */
export function resolveHost(explicit: string | undefined, envValue: string | undefined): string {
  return explicit ?? envValue ?? "0.0.0.0";
}

export interface StartOptions {
  port?: number;
  host?: string;
  /** Register SIGTERM/SIGINT handlers for graceful shutdown (default true). */
  registerSignals?: boolean;
}

/**
 * Create an app server and start listening. Resolves the port from
 * `options.port` or PORT, and the host from `options.host` or HOST
 * (default 0.0.0.0 so the server works inside containers).
 */
export function startServer(options: StartOptions = {}): Server {
  const port = resolvePort(options.port, process.env["PORT"]);
  const host = resolveHost(options.host, process.env["HOST"]);
  const server = createApp();

  if (options.registerSignals !== false) {
    const shutdown = createShutdownHandler(server);
    process.once("SIGTERM", shutdown);
    process.once("SIGINT", shutdown);
  }

  server.listen(port, host);
  server.on("listening", () => {
    const address = server.address() as AddressInfo;
    console.log(`IELTS-API v${VERSION} listening on http://${host}:${address.port}`);
  });
  return server;
}

/** Build a graceful-shutdown callback for the given server. */
export function createShutdownHandler(server: Server): (signal: string) => void {
  return (signal: string) => {
    console.log(`IELTS-API received ${signal}; closing connections.`);
    server.close(() => {
      process.exit(0);
    });
  };
}

/**
 * Start the server only when this module is the process entry point.
 * Lets tests import the app without side effects.
 */
export function maybeStart(entryUrl: string): Server | undefined {
  const mainPath = process.argv[1];
  if (mainPath !== undefined && pathToFileURL(mainPath).href === entryUrl) {
    return startServer();
  }
  return undefined;
}
