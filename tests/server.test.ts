import { connect } from "node:net";
import { describe, expect, it } from "vitest";
import { request, url } from "./helpers/http.ts";
import { VERSION } from "../src/version.ts";

describe("GET /", () => {
  it("returns the API index with every endpoint listed", async () => {
    const response = await request("/");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    const body = (await response.json()) as {
      data: {
        name: string;
        version: string;
        endpoints: { method: string; path: string }[];
        documentation: { openapi: string };
      };
    };
    expect(body.data.name).toBe("IELTS-API");
    expect(body.data.version).toBe(VERSION);
    expect(body.data.documentation.openapi).toBe("/openapi.json");
    const paths = body.data.endpoints.map((endpoint) => endpoint.path);
    expect(paths).toContain("/v1/vocabulary");
    expect(paths).toContain("/openapi.json");
    expect(paths.length).toBeGreaterThan(15);
  });
});

describe("GET /health", () => {
  it("reports status, version and uptime without caching", async () => {
    const response = await request("/health");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("etag")).toBeNull();
    const body = (await response.json()) as {
      data: { status: string; version: string; uptimeSeconds: number; timestamp: string };
    };
    expect(body.data.status).toBe("ok");
    expect(body.data.version).toBe(VERSION);
    expect(body.data.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(new Date(body.data.timestamp).toString()).not.toBe("Invalid Date");
  });
});

describe("standard headers", () => {
  it("sends CORS, version, request id and timing headers on success", async () => {
    const response = await request("/v1/topics");
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("x-api-version")).toBe(VERSION);
    expect(response.headers.get("x-request-id")).toMatch(/.+/u);
    expect(response.headers.get("x-response-time")).toMatch(/ms$/u);
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("sends CORS headers on errors too", async () => {
    const response = await request("/definitely-not-a-route");
    expect(response.status).toBe(404);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
  });
});

describe("error responses", () => {
  it("returns a JSON 404 envelope for unknown paths", async () => {
    const response = await request("/definitely-not-a-route");
    const body = (await response.json()) as { error: { status: number; code: string } };
    expect(response.status).toBe(404);
    expect(body.error.code).toBe("not_found");
    expect(body.error.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("returns 405 with an Allow header for known paths and wrong methods", async () => {
    const response = await request("/v1/topics", { method: "POST" });
    const body = (await response.json()) as { error: { code: string } };
    expect(response.status).toBe(405);
    expect(body.error.code).toBe("method_not_allowed");
    const allow = response.headers.get("allow");
    expect(allow).toContain("GET");
    expect(allow).toContain("HEAD");
    expect(allow).toContain("OPTIONS");
  });

  it("lists HEAD alongside GET where both are servable", async () => {
    const response = await request("/v1/band-score", { method: "DELETE" });
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("HEAD, GET, POST, OPTIONS");
  });

  it("rejects PUT on the root", async () => {
    const response = await request("/", { method: "PUT" });
    expect(response.status).toBe(405);
  });
});

describe("OPTIONS preflight", () => {
  it("answers 204 with Allow for known paths", async () => {
    const response = await request("/v1/band-score", { method: "OPTIONS" });
    expect(response.status).toBe(204);
    expect(response.headers.get("allow")).toContain("POST");
    expect(response.headers.get("access-control-max-age")).toBe("86400");
  });

  it("treats unknown paths as 404 even for OPTIONS", async () => {
    const response = await request("/ghost", { method: "OPTIONS" });
    expect(response.status).toBe(404);
  });
});

describe("HEAD requests", () => {
  it("returns headers without a body", async () => {
    const response = await request("/", { method: "HEAD" });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("etag")).not.toBeNull();
    const text = await response.text();
    expect(text).toBe("");
  });

  it("returns error headers without a body", async () => {
    const response = await request("/ghost", { method: "HEAD" });
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("");
  });
});

describe("conditional requests", () => {
  it("serves ETag and answers exact If-None-Match with 304", async () => {
    const first = await request("/v1/topics");
    const etag = first.headers.get("etag");
    expect(etag).not.toBeNull();
    expect(first.headers.get("cache-control")).toBe("public, max-age=300");
    const second = await request("/v1/topics", { headers: { "If-None-Match": etag ?? "" } });
    expect(second.status).toBe(304);
    expect(second.headers.get("etag")).toBe(etag);
  });

  it("matches the unweak form and the wildcard", async () => {
    const etag = (await request("/v1/topics")).headers.get("etag") ?? "";
    const unweak = etag.replace("W/", "");
    expect((await request("/v1/topics", { headers: { "If-None-Match": unweak } })).status).toBe(
      304,
    );
    expect((await request("/v1/topics", { headers: { "If-None-Match": "*" } })).status).toBe(304);
  });

  it("does not match stale or unrelated tags", async () => {
    const response = await request("/v1/topics", {
      headers: { "If-None-Match": 'W/"deadbeef"' },
    });
    expect(response.status).toBe(200);
  });

  it("never caches non-cacheable endpoints", async () => {
    const response = await request("/health", { headers: { "If-None-Match": "*" } });
    expect(response.status).toBe(200);
  });
});

describe("path handling", () => {
  it("ignores a trailing slash", async () => {
    const response = await request("/v1/topics/");
    expect(response.status).toBe(200);
  });

  it("ignores empty segments", async () => {
    const response = await request("/v1//topics");
    expect(response.status).toBe(200);
  });

  it("keeps malformed percent-encoding out of the router", async () => {
    const response = await request("/v1/vocabulary/%zz");
    expect(response.status).toBe(404);
    const body = (await response.json()) as { error: { message: string } };
    expect(body.error.message).toContain("%zz");
  });

  it("decodes encoded path parameters", async () => {
    const response = await request("/v1/vocabulary/%63urriculum");
    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: { word: string } };
    expect(body.data.word).toBe("curriculum");
  });
});

describe("robustness", () => {
  it("returns a JSON 500 for unparseable request URLs", async () => {
    const response = await new Promise<string>((resolve, reject) => {
      const socket = connect(new URL(url("/")).port, "127.0.0.1");
      socket.on("connect", () => {
        socket.write("GET http://exa[mple/ HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n");
      });
      socket.on("data", (data: Buffer) => resolve(data.toString("utf8")));
      socket.on("error", reject);
    });
    expect(response).toContain("500");
    expect(response).toContain("internal_error");
  });

  it("rejects a POST with no Content-Type header at all", async () => {
    const response = await new Promise<string>((resolve, reject) => {
      const socket = connect(new URL(url("/")).port, "127.0.0.1");
      socket.on("connect", () => {
        socket.write(
          "POST /v1/band-score HTTP/1.1\r\nHost: x\r\nContent-Length: 2\r\nConnection: close\r\n\r\n{}",
        );
      });
      socket.on("data", (data: Buffer) => resolve(data.toString("utf8")));
      socket.on("error", reject);
    });
    expect(response).toContain("415");
    expect(response).toContain("none");
  });
});
