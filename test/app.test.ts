import { describe, expect, it } from "vitest";
import { App } from "../src/lib/server/app.js";
import { SERVICE_INFO } from "../src/config.js";

function build(): App {
  const app = new App(SERVICE_INFO);
  // Test-only routes used to exercise generic dispatch branches.
  app.router.get("/v1/__plain", () => ({ pong: true }));
  app.router.get("/v1/__throw", () => {
    throw new Error("kaboom");
  });
  return app;
}

function parse(response: { body: string }): unknown {
  return JSON.parse(response.body);
}

describe("App dispatch", () => {
  it("serves a registered GET route as JSON", () => {
    const app = build();
    const response = app.dispatch("GET", "/health");
    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe("*");
    expect((parse(response) as { data: { status: string } }).data.status).toBe("ok");
  });

  it("accepts a lower-cased method name", () => {
    const app = build();
    expect(app.dispatch("get", "/health").status).toBe(200);
  });

  it("strips the body for HEAD requests", () => {
    const app = build();
    const response = app.dispatch("HEAD", "/health");
    expect(response.status).toBe(200);
    expect(response.body).toBe("");
  });

  it("answers OPTIONS preflight for existing paths with 204", () => {
    const app = build();
    const response = app.dispatch("OPTIONS", "/health");
    expect(response.status).toBe(204);
    expect(response.headers.allow).toContain("GET");
    expect(response.headers.allow).toContain("OPTIONS");
  });

  it("returns 404 for OPTIONS on an unknown path", () => {
    const app = build();
    expect(app.dispatch("OPTIONS", "/nothing").status).toBe(404);
  });

  it("returns 405 for an unsupported HTTP method", () => {
    const app = build();
    const response = app.dispatch("DELETE", "/health");
    expect(response.status).toBe(405);
    expect(response.body).toContain("method_not_allowed");
  });

  it("returns 405 with an Allow header when only other methods exist", () => {
    const app = build();
    const response = app.dispatch("POST", "/health");
    expect(response.status).toBe(405);
    expect(response.headers.allow).toContain("GET");
  });

  it("returns 404 for an unknown path", () => {
    const app = build();
    const response = app.dispatch("GET", "/nothing");
    expect(response.status).toBe(404);
    expect(response.body).toContain("not_found");
  });

  it("wraps a plain (non-ServiceResponse) handler result", () => {
    const app = build();
    const response = app.dispatch("GET", "/v1/__plain");
    expect(response.status).toBe(200);
    expect((parse(response) as { data: { pong: boolean } }).data.pong).toBe(true);
  });

  it("turns an unexpected handler error into a 500", () => {
    const app = build();
    const response = app.dispatch("GET", "/v1/__throw");
    expect(response.status).toBe(500);
    expect(response.body).toContain("internal_error");
  });

  it("strips the body for HEAD requests that error", () => {
    const app = build();
    const response = app.dispatch("HEAD", "/v1/__throw");
    expect(response.status).toBe(500);
    expect(response.body).toBe("");
  });

  it("turns an ApiError thrown by a handler into its status", () => {
    const app = build();
    const response = app.dispatch("GET", "/v1/writing/prompts", {
      query: new URLSearchParams("category=zzz"),
    });
    expect(response.status).toBe(400);
    expect(response.body).toContain("bad_request");
  });

  it("exposes the service info snapshot", () => {
    const app = build();
    expect(app.infoSnapshot().name).toBe(SERVICE_INFO.name);
  });
});
