/**
 * The Node.js adapter around the pure application function.
 *
 * This module is deliberately the only part of the project that performs I/O.
 * Everything above it is pure, which is why the API can also be embedded in a
 * serverless handler, a service worker or a test harness without modification.
 *
 * @packageDocumentation
 */

import {
  createServer as createNodeServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { ApiError } from "../core/errors.ts";
import { createApp, type App } from "./app.ts";
import { MAX_BODY_BYTES } from "./params.ts";
import { renderError, type ApiRequest } from "./respond.ts";

/** Options accepted by {@link startServer}. */
export interface ServerOptions {
  /** TCP port; `0` asks the operating system for a free port. */
  readonly port?: number;
  /** Interface to bind to. Defaults to `0.0.0.0`. */
  readonly host?: string;
  /** A pre-built application; a fresh one is created when omitted. */
  readonly app?: App;
}

/** A running server together with the address it bound to. */
export interface RunningServer {
  /** The underlying Node server. */
  readonly server: Server;
  /** The port that was actually bound. */
  readonly port: number;
  /** The host that was bound. */
  readonly host: string;
  /** Stops the server and resolves once all connections are closed. */
  readonly close: () => Promise<void>;
}

/**
 * Reads a request body with a hard size limit.
 *
 * @param request - The inbound Node request.
 * @param limit - Maximum accepted size in bytes.
 * @returns The body as a UTF-8 string, or `null` when empty.
 * @throws {ApiError} When the body exceeds `limit`.
 */
export async function readBody(
  request: IncomingMessage,
  limit: number = MAX_BODY_BYTES,
): Promise<string | null> {
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    total += buffer.byteLength;
    if (total > limit) {
      throw new ApiError(
        "payload_too_large",
        `Request bodies are limited to ${String(limit)} bytes.`,
        { limit },
      );
    }
    chunks.push(buffer);
  }

  return chunks.length === 0 ? null : Buffer.concat(chunks).toString("utf8");
}

/**
 * Normalises a Node request into an {@link ApiRequest}.
 *
 * @param request - The inbound Node request.
 * @param body - The already-read request body.
 */
export function toApiRequest(
  request: IncomingMessage,
  body: string | null,
): ApiRequest {
  const url = new URL(request.url ?? "/", "http://localhost");
  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(request.headers)) {
    if (typeof value === "string") {
      headers[name.toLowerCase()] = value;
    } else if (Array.isArray(value)) {
      headers[name.toLowerCase()] = value.join(", ");
    }
  }

  return {
    method: (request.method ?? "GET").toUpperCase(),
    path: url.pathname,
    query: url.searchParams,
    headers,
    body,
  };
}

/**
 * Builds a Node request listener for an application.
 *
 * @param app - The application to serve.
 */
export function createRequestListener(
  app: App,
): (request: IncomingMessage, response: ServerResponse) => void {
  return (request, response) => {
    void (async () => {
      try {
        const body = await readBody(request);
        const apiResponse = app.handle(toApiRequest(request, body));
        response.writeHead(apiResponse.status, apiResponse.headers);
        response.end(apiResponse.body);
      } catch (error) {
        const apiResponse = renderError(error, true);
        response.writeHead(apiResponse.status, apiResponse.headers);
        response.end(apiResponse.body);
      }
    })();
  };
}

/**
 * Creates a Node server without starting it.
 *
 * @param app - The application to serve; a fresh one is created when omitted.
 */
export function createServer(app: App = createApp()): Server {
  return createNodeServer(createRequestListener(app));
}

/**
 * Starts a server and resolves once it is accepting connections.
 *
 * @param options - Port, host and application overrides.
 */
export async function startServer(
  options: ServerOptions = {},
): Promise<RunningServer> {
  const host = options.host ?? "0.0.0.0";
  const port = options.port ?? 0;
  const server = createServer(options.app ?? createApp());

  await new Promise<void>((resolve) => {
    server.listen(port, host, resolve);
  });

  const address = server.address();
  /* c8 ignore start -- `address()` is always an AddressInfo for a listening TCP server. */
  const boundPort =
    typeof address === "object" && address !== null ? address.port : port;
  /* c8 ignore stop */

  return {
    server,
    port: boundPort,
    host,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error === undefined) {
            resolve();
            return;
          }
          reject(error);
        });
      }),
  };
}
