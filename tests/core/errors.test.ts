import { describe, expect, it } from "vitest";
import { ApiError, isApiError } from "../../src/core/errors.ts";

describe("ApiError", () => {
  it("maps codes onto status codes", () => {
    expect(new ApiError("bad_request", "x").status).toBe(400);
    expect(new ApiError("invalid_parameter", "x").status).toBe(400);
    expect(new ApiError("missing_parameter", "x").status).toBe(400);
    expect(new ApiError("not_found", "x").status).toBe(404);
    expect(new ApiError("method_not_allowed", "x").status).toBe(405);
    expect(new ApiError("payload_too_large", "x").status).toBe(413);
    expect(new ApiError("unsupported_media_type", "x").status).toBe(415);
  });

  it("defaults details to an empty object and serialises them", () => {
    const bare = new ApiError("not_found", "missing");
    expect(bare.details).toEqual({});
    expect(bare.name).toBe("ApiError");
    expect(bare.toJSON()).toEqual({
      error: { code: "not_found", message: "missing", details: {} },
    });

    const detailed = new ApiError("invalid_parameter", "bad", {
      parameter: "q",
    });
    expect(detailed.toJSON().error.details).toEqual({ parameter: "q" });
  });

  it("is identifiable with a type guard", () => {
    expect(isApiError(new ApiError("bad_request", "x"))).toBe(true);
    expect(isApiError(new Error("x"))).toBe(false);
    expect(isApiError(null)).toBe(false);
  });
});
