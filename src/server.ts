/**
 * HTTP server assembly: CORS, dispatch, error mapping, and lifecycle.
 *
 * `createApp` accepts extra routes so tests (or embedders) can extend or
 * probe the pipeline; production always serves `apiRoutes`.
 */

import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { apiRoutes } from "./routes.js";
import { resolve, type Route } from "./router.js";
import {
  ApiError,
  methodNotAllowed,
  notFound,
  readJsonBody,
  sendError,
} from "./http.js";

const CORS_HEADERS: Readonly<Record<string, string>> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

/** Apply permissive CORS headers (the API is free and needs no credentials). */
export function applyCors(res: ServerResponse): void {
  for (const [name, value] of Object.entries(CORS_HEADERS)) {
    res.setHeader(name, value);
  }
}

const BASE_URL = "http://ielts-api.local";

/** Build the production server, optionally extended with extra routes. */
export function createApp(extraRoutes: readonly Route[] = []): Server {
  const routes: readonly Route[] = [...apiRoutes, ...extraRoutes];
  return createServer((req, res) => {
    void handleRequest(req, res, routes);
  });
}

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  routes: readonly Route[],
): Promise<void> {
  applyCors(res);
  try {
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    const url = new URL(req.url as string, BASE_URL);
    let pathname = url.pathname;
    if (pathname.length > 1 && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }
    const result = resolve(routes, req.method as string, pathname);
    if (result.kind === "not_found") {
      throw notFound(`No route matches ${req.method as string} ${pathname}`);
    }
    if (result.kind === "method_not_allowed") {
      throw methodNotAllowed(result.allowed);
    }
    let body: unknown;
    if (result.route.method === "POST") {
      body = await readJsonBody(req);
    }
    await result.route.handler({
      req,
      res,
      params: result.params,
      query: url.searchParams,
      body,
    });
    if (!res.writableEnded) {
      throw new ApiError(
        500,
        "handler_incomplete",
        "Handler finished without sending a response",
      );
    }
  } catch (error) {
    sendError(res, error);
  }
}

/** Resolve the listen port from an environment-like object (default 3000). */
export function resolvePort(env: { readonly PORT?: string }): number {
  const raw = env.PORT ?? "";
  if (!/^\d+$/.test(raw)) {
    return 3000;
  }
  const parsed = Number.parseInt(raw, 10);
  if (parsed > 65535) {
    return 3000;
  }
  return parsed;
}

/** Create and start the production server. Port 0 picks an ephemeral port. */
export function startServer(port: number, onListening?: () => void): Server {
  const server = createApp();
  server.listen(port, onListening);
  return server;
}
