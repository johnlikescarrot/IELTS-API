import { Router } from "./router.js";
import type { HandlerContext, HttpMethod, ServiceResponse } from "./types.js";
import { ok, json, fromError, isServiceResponse } from "./response.js";
import { registerRoutes, type ServiceInfo } from "../api/routes.js";

export interface DispatchOptions {
  query?: URLSearchParams;
  body?: unknown;
  headers?: Readonly<Record<string, string>>;
}

const KNOWN_METHODS: readonly HttpMethod[] = ["GET", "POST"];

/** Shared CORS headers applied to every response. */
const CORS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "Content-Type, Accept",
  "access-control-max-age": "86400",
};

/**
 * The application container. It owns a {@link Router}, registers every
 * endpoint, and turns requests into plain {@link ServiceResponse} objects so
 * the transport layer (HTTP, tests, CLI) stays trivial and easy to cover.
 */
export class App {
  readonly router: Router;
  private readonly info: ServiceInfo;

  constructor(info: ServiceInfo) {
    this.info = info;
    this.router = new Router();
    registerRoutes(this.router, info);
  }

  /** Return a copy of the {@link ServiceInfo} used to build the app. */
  infoSnapshot(): ServiceInfo {
    return { ...this.info };
  }

  /**
   * Dispatch a request identified by an HTTP method and pathname, returning a
   * fully serialised {@link ServiceResponse}. Handles HEAD, OPTIONS, CORS,
   * 404 and 405 on top of the registered routes.
   */
  dispatch(method: string, pathname: string, options: DispatchOptions = {}): ServiceResponse {
    const verb = method.toUpperCase();
    if (verb === "OPTIONS") {
      return this.handleOptions(pathname);
    }
    const real: HttpMethod = verb === "HEAD" ? "GET" : (verb as HttpMethod);
    if (!KNOWN_METHODS.includes(real)) {
      return json(
        405,
        {
          error: {
            code: "method_not_allowed",
            message: `HTTP method "${verb}" is not supported by this API.`,
          },
        },
        CORS,
      );
    }
    const context: Omit<HandlerContext, "params" | "method" | "path"> = {
      query: options.query ?? new URLSearchParams(),
      body: options.body,
      headers: options.headers ?? {},
    };
    try {
      const result = this.router.execute(real, pathname, context);
      const response: ServiceResponse =
        result === undefined
          ? this.noMatch(pathname)
          : isServiceResponse(result)
            ? result
            : ok(result);
      return verb === "HEAD" ? { ...response, body: "" } : response;
    } catch (error) {
      const response = fromError(error);
      return verb === "HEAD" ? { ...response, body: "" } : response;
    }
  }

  /** Answer an OPTIONS preflight for an existing path. */
  private handleOptions(pathname: string): ServiceResponse {
    const allowed = this.router.allowedMethods(pathname);
    if (allowed.length === 0) {
      return this.notFound(pathname);
    }
    return {
      status: 204,
      headers: {
        ...CORS,
        allow: [...allowed, "OPTIONS"].join(", "),
      },
      body: "",
    };
  }

  /** 404 for an unknown path, or 405 when the path only allows other methods. */
  private noMatch(pathname: string): ServiceResponse {
    const allowed = this.router.allowedMethods(pathname);
    if (allowed.length === 0) {
      return this.notFound(pathname);
    }
    return json(
      405,
      {
        error: {
          code: "method_not_allowed",
          message: `The HTTP method used is not allowed for ${pathname}.`,
        },
      },
      { ...CORS, allow: allowed.join(", ") },
    );
  }

  private notFound(pathname: string): ServiceResponse {
    return json(
      404,
      {
        error: {
          code: "not_found",
          message: `No route matches ${pathname}.`,
        },
      },
      CORS,
    );
  }
}
