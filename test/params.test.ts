import { describe, expect, it } from "vitest";
import { DEFAULT_LIMIT, MAX_LIMIT, parseEnum, parseInteger, parsePage } from "../src/lib/params.js";
import { ApiError } from "../src/lib/errors.js";

describe("parseInteger", () => {
  it("returns undefined when absent/empty and not required", () => {
    expect(parseInteger(undefined, "n")).toBeUndefined();
    expect(parseInteger(null, "n")).toBeUndefined();
    expect(parseInteger("", "n")).toBeUndefined();
    expect(parseInteger("  ", "n")).toBeUndefined();
  });
  it("throws when required and absent", () => {
    expect(() => parseInteger(undefined, "n", { required: true })).toThrowError(ApiError);
    expect(() => parseInteger("", "n", { required: true })).toThrow(/required/);
  });
  it("throws on non-integer input", () => {
    expect(() => parseInteger("abc", "n")).toThrowError(ApiError);
    expect(() => parseInteger("1.5", "n")).toThrow(/must be an integer/);
  });
  it("throws outside min/max bounds", () => {
    expect(() => parseInteger("2", "n", { min: 3 })).toThrow(/at least 3/);
    expect(() => parseInteger("9", "n", { max: 8 })).toThrow(/at most 8/);
  });
  it("parses valid integers", () => {
    expect(parseInteger("7", "n", { min: 0, max: 10 })).toBe(7);
    expect(parseInteger("-2", "n")).toBe(-2);
  });
});

describe("parseEnum", () => {
  it("returns undefined when absent/empty without a fallback", () => {
    expect(parseEnum(undefined, "m", ["a", "b"])).toBeUndefined();
    expect(parseEnum(null, "m", ["a", "b"])).toBeUndefined();
    expect(parseEnum("", "m", ["a", "b"])).toBeUndefined();
  });
  it("applies a fallback when absent", () => {
    expect(parseEnum(undefined, "m", ["a", "b"], { fallback: "a" })).toBe("a");
  });
  it("throws when required and absent", () => {
    expect(() => parseEnum(undefined, "m", ["a", "b"], { required: true })).toThrowError(ApiError);
  });
  it("throws on an unrecognised value", () => {
    expect(() => parseEnum("c", "m", ["a", "b"])).toThrow(/must be one of/);
  });
  it("parses a recognised value", () => {
    expect(parseEnum("b", "m", ["a", "b"])).toBe("b");
  });
});

describe("parsePage", () => {
  it("returns defaults when nothing is supplied", () => {
    const page = parsePage(new URLSearchParams());
    expect(page).toEqual({ offset: 0, limit: DEFAULT_LIMIT });
  });
  it("honours provided limit and offset", () => {
    const page = parsePage(new URLSearchParams("limit=5&offset=10"));
    expect(page).toEqual({ offset: 10, limit: 5 });
  });
  it("rejects out-of-range limits and offsets", () => {
    expect(() => parsePage(new URLSearchParams(`limit=${MAX_LIMIT + 1}`))).toThrowError(ApiError);
    expect(() => parsePage(new URLSearchParams("offset=-1"))).toThrowError(ApiError);
  });
});
