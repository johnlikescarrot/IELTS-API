import { describe, expect, it } from "vitest";
import { ApiError } from "../../src/core/errors.ts";
import {
  MAX_BODY_BYTES,
  asObject,
  optionalBoolean,
  optionalEnum,
  optionalNumber,
  optionalString,
  pagination,
  parseEnum,
  parseJsonBody,
  parseNumber,
  requiredNumber,
  requiredNumberField,
  requiredString,
  requiredStringField,
} from "../../src/http/params.ts";
import { request } from "../helpers.ts";

function query(search: string): URLSearchParams {
  return new URLSearchParams(search);
}

describe("string parameters", () => {
  it("reads required values", () => {
    expect(requiredString(query("a=  hi  "), "a")).toBe("hi");
  });

  it("rejects missing or blank required values", () => {
    expect(() => requiredString(query(""), "a")).toThrow(ApiError);
    expect(() => requiredString(query("a=%20"), "a")).toThrow(/required/);
  });

  it("reads optional values", () => {
    expect(optionalString(query("a=x"), "a")).toBe("x");
    expect(optionalString(query(""), "a")).toBeUndefined();
    expect(optionalString(query("a="), "a")).toBeUndefined();
  });
});

describe("parseNumber", () => {
  it("parses valid numbers", () => {
    expect(parseNumber("n", "6.5")).toBe(6.5);
    expect(parseNumber("n", "-2")).toBe(-2);
  });

  it("rejects non-numeric and blank input", () => {
    expect(() => parseNumber("n", "abc")).toThrow(/must be a number/);
    expect(() => parseNumber("n", " ")).toThrow(/must be a number/);
    expect(() => parseNumber("n", "Infinity")).toThrow(/must be a number/);
  });

  it("enforces integrality and bounds", () => {
    expect(() => parseNumber("n", "1.5", { integer: true })).toThrow(/integer/);
    expect(() => parseNumber("n", "-1", { min: 0 })).toThrow(/at least 0/);
    expect(() => parseNumber("n", "11", { max: 10 })).toThrow(/at most 10/);
    expect(parseNumber("n", "5", { min: 0, max: 10, integer: true })).toBe(5);
  });
});

describe("numeric query parameters", () => {
  it("reads optional and required values", () => {
    expect(optionalNumber(query("n=3"), "n")).toBe(3);
    expect(optionalNumber(query(""), "n")).toBeUndefined();
    expect(requiredNumber(query("n=3"), "n")).toBe(3);
    expect(() => requiredNumber(query(""), "n")).toThrow(ApiError);
  });
});

describe("parseEnum", () => {
  const allowed = ["alpha", "beta"] as const;

  it("normalises case and whitespace", () => {
    expect(parseEnum("k", " ALPHA ", allowed)).toBe("alpha");
  });

  it("rejects values outside the set", () => {
    expect(() => parseEnum("k", "gamma", allowed)).toThrow(/must be one of/);
  });

  it("reads optional enumerated parameters", () => {
    expect(optionalEnum(query("k=beta"), "k", allowed)).toBe("beta");
    expect(optionalEnum(query(""), "k", allowed)).toBeUndefined();
  });
});

describe("optionalBoolean", () => {
  it.each(["1", "true", "yes", "TRUE"])("reads %s as true", (value) => {
    expect(optionalBoolean(query(`b=${value}`), "b")).toBe(true);
  });

  it.each(["0", "false", "no", "NO"])("reads %s as false", (value) => {
    expect(optionalBoolean(query(`b=${value}`), "b")).toBe(false);
  });

  it("returns undefined when absent and rejects other values", () => {
    expect(optionalBoolean(query(""), "b")).toBeUndefined();
    expect(() => optionalBoolean(query("b=maybe"), "b")).toThrow(
      /must be a boolean/,
    );
  });
});

describe("pagination", () => {
  it("applies defaults", () => {
    expect(pagination(query(""))).toEqual({ limit: 50, offset: 0 });
    expect(pagination(query(""), 10)).toEqual({ limit: 10, offset: 0 });
  });

  it("reads explicit values", () => {
    expect(pagination(query("limit=5&offset=10"))).toEqual({
      limit: 5,
      offset: 10,
    });
  });

  it("enforces bounds", () => {
    expect(() => pagination(query("limit=0"))).toThrow(ApiError);
    expect(() => pagination(query("limit=2000"))).toThrow(ApiError);
    expect(() => pagination(query("offset=-1"))).toThrow(ApiError);
  });
});

describe("parseJsonBody", () => {
  it("returns undefined for an absent or blank body", () => {
    expect(parseJsonBody(request("POST", "/x", null))).toBeUndefined();
    expect(parseJsonBody(request("POST", "/x", "   "))).toBeUndefined();
  });

  it("parses valid JSON", () => {
    expect(parseJsonBody(request("POST", "/x", '{"a":1}'))).toEqual({ a: 1 });
  });

  it("rejects malformed JSON", () => {
    expect(() => parseJsonBody(request("POST", "/x", "{"))).toThrow(
      /not valid JSON/,
    );
  });

  it("rejects oversized bodies", () => {
    const huge = `"${"x".repeat(MAX_BODY_BYTES + 10)}"`;
    expect(() => parseJsonBody(request("POST", "/x", huge))).toThrow(
      /limited to/,
    );
  });
});

describe("object field helpers", () => {
  it("narrows plain objects", () => {
    expect(asObject({ a: 1 }, "Body")).toEqual({ a: 1 });
    expect(() => asObject(null, "Body")).toThrow(/must be a JSON object/);
    expect(() => asObject([1], "Body")).toThrow(/must be a JSON object/);
    expect(() => asObject("x", "Body")).toThrow(/must be a JSON object/);
  });

  it("reads numeric fields", () => {
    expect(requiredNumberField({ n: 6.5 }, "n")).toBe(6.5);
    expect(requiredNumberField({ n: "6.5" }, "n")).toBe(6.5);
    expect(() => requiredNumberField({}, "n")).toThrow(/required/);
    expect(() => requiredNumberField({ n: null }, "n")).toThrow(/required/);
    expect(() => requiredNumberField({ n: true }, "n")).toThrow(
      /must be a number/,
    );
    expect(() => requiredNumberField({ n: 20 }, "n", { max: 9 })).toThrow(
      /at most 9/,
    );
  });

  it("reads string fields", () => {
    expect(requiredStringField({ s: "hi" }, "s")).toBe("hi");
    expect(() => requiredStringField({}, "s")).toThrow(/required/);
    expect(() => requiredStringField({ s: "  " }, "s")).toThrow(/required/);
    expect(() => requiredStringField({ s: 5 }, "s")).toThrow(/required/);
  });
});
