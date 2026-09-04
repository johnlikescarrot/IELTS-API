import { describe, expect, it } from "vitest";
import {
  CORS_HEADERS,
  errorResponse,
  fromError,
  isServiceResponse,
  json,
  ok,
} from "../src/lib/server/response.js";
import { ApiError, badRequest } from "../src/lib/errors.js";

describe("json", () => {
  it("serialises a payload as JSON with content type and CORS", () => {
    const response = json(200, { hello: "world" });
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/json/);
    expect(response.headers["access-control-allow-origin"]).toBe(
      CORS_HEADERS["access-control-allow-origin"],
    );
    expect(response.body).toBe(JSON.stringify({ hello: "world" }));
  });
});

describe("ok", () => {
  it("wraps a value in a data envelope", () => {
    const response = ok({ id: 1 });
    expect(JSON.parse(response.body)).toEqual({ data: { id: 1 } });
  });
  it("adds meta when provided", () => {
    const response = ok([1], { total: 1 });
    expect(JSON.parse(response.body)).toEqual({ data: [1], meta: { total: 1 } });
  });
});

describe("isServiceResponse", () => {
  it("accepts a well-formed ServiceResponse", () => {
    expect(isServiceResponse(json(200, {}))).toBe(true);
  });
  it("rejects values without the required shape", () => {
    expect(isServiceResponse(null)).toBe(false);
    expect(isServiceResponse("text")).toBe(false);
    expect(isServiceResponse(42)).toBe(false);
    expect(isServiceResponse({ status: 200 })).toBe(false);
  });
});

describe("errorResponse", () => {
  it("serialises an ApiError with details", () => {
    const error = new ApiError(400, "bad_request", "Nope", { x: 1 });
    const response = errorResponse(error);
    const body = JSON.parse(response.body) as {
      error: { code: string; details: unknown };
    };
    expect(response.status).toBe(400);
    expect(body.error.code).toBe("bad_request");
    expect(body.error.details).toEqual({ x: 1 });
  });
  it("omits details when absent", () => {
    const body = JSON.parse(errorResponse(badRequest("msg")).body) as {
      error: Record<string, unknown>;
    };
    expect(body.error.details).toBeUndefined();
  });
});

describe("fromError", () => {
  it("maps ApiError to its status and code", () => {
    const response = fromError(badRequest("boom"));
    expect(response.status).toBe(400);
  });
  it("maps unknown errors to a 500 internal_error", () => {
    const response = fromError(new Error("kaboom"));
    expect(response.status).toBe(500);
    expect(response.body).toContain("internal_error");
  });
});
