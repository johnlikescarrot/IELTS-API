import { describe, expect, it } from "vitest";
import {
  ApiError,
  badRequest,
  internalError,
  isApiError,
  methodNotAllowed,
  notFound,
} from "../src/lib/errors.js";

describe("ApiError", () => {
  it("carries status, code, message and optional details", () => {
    const error = new ApiError(422, "custom", "Nope", { field: "x" });
    expect(error.status).toBe(422);
    expect(error.code).toBe("custom");
    expect(error.message).toBe("Nope");
    expect(error.details).toEqual({ field: "x" });
    expect(error.name).toBe("ApiError");
  });
});

describe("error factories", () => {
  it("builds a 400 bad_request", () => {
    const error = badRequest("boom");
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.code).toBe("bad_request");
    expect(isApiError(error)).toBe(true);
  });
  it("builds a 404 not_found with a default message", () => {
    const error = notFound();
    expect(error.status).toBe(404);
    expect(error.code).toBe("not_found");
    expect(error.message).toMatch(/not found/i);
  });
  it("builds a 405 method_not_allowed", () => {
    const error = methodNotAllowed();
    expect(error.status).toBe(405);
    expect(error.code).toBe("method_not_allowed");
  });
  it("builds a 500 internal_error", () => {
    const error = internalError();
    expect(error.status).toBe(500);
    expect(error.code).toBe("internal_error");
  });
  it("isApiError distinguishes ApiError from other values", () => {
    expect(isApiError(new ApiError(400, "x", "m"))).toBe(true);
    expect(isApiError(new Error("plain"))).toBe(false);
    expect(isApiError("string")).toBe(false);
    expect(isApiError(undefined)).toBe(false);
  });
});
