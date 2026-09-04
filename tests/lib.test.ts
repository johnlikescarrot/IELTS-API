import { describe, expect, it } from "vitest";
import { ApiError, errorPayload } from "../src/lib/errors.ts";
import { computeOverallBand, validateSkillScore } from "../src/lib/band.ts";
import { hashString, mulberry32, sampleSeeded, swapItems } from "../src/lib/random.ts";
import { matchesAllTokens, tokenize } from "../src/lib/search.ts";
import { paginate, sortItems } from "../src/lib/paginate.ts";
import { getParam, matchRoute, normalizePath, segmentsOf } from "../src/lib/router.ts";
import { computeEtag, etagMatches, headerToString } from "../src/lib/respond.ts";
import {
  activeFilters,
  getEnumParam,
  getIntParam,
  getOptionalEnumParam,
  getOptionalRangeParam,
  getRangeParam,
  getStringParam,
} from "../src/lib/validate.ts";

function query(params: Record<string, string>): URLSearchParams {
  return new URLSearchParams(params);
}

describe("validate", () => {
  it("getIntParam falls back when absent or empty and parses strict integers", () => {
    expect(getIntParam(query({}), "page", 7)).toBe(7);
    expect(getIntParam(query({ page: "" }), "page", 7)).toBe(7);
    expect(getIntParam(query({ page: "12" }), "page", 7)).toBe(12);
    expect(() => getIntParam(query({ page: "abc" }), "page", 7)).toThrowError(ApiError);
    expect(() => getIntParam(query({ page: "5x" }), "page", 7)).toThrowError(ApiError);
    expect(() => getIntParam(query({ page: "-3" }), "page", 7)).not.toThrow();
  });

  it("getRangeParam enforces inclusive bounds", () => {
    expect(getRangeParam(query({ n: "5" }), "n", 3, 1, 10)).toBe(5);
    expect(getRangeParam(query({ n: "1" }), "n", 3, 1, 10)).toBe(1);
    expect(getRangeParam(query({ n: "10" }), "n", 3, 1, 10)).toBe(10);
    expect(() => getRangeParam(query({ n: "11" }), "n", 3, 1, 10)).toThrowError(ApiError);
    expect(() => getRangeParam(query({ n: "0" }), "n", 3, 1, 10)).toThrowError(ApiError);
  });

  it("getOptionalRangeParam returns undefined when absent or empty", () => {
    expect(getOptionalRangeParam(query({}), "band", 5, 9)).toBeUndefined();
    expect(getOptionalRangeParam(query({ band: "" }), "band", 5, 9)).toBeUndefined();
    expect(getOptionalRangeParam(query({ band: "7" }), "band", 5, 9)).toBe(7);
    expect(() => getOptionalRangeParam(query({ band: "4" }), "band", 5, 9)).toThrowError(ApiError);
    expect(() => getOptionalRangeParam(query({ band: "x" }), "band", 5, 9)).toThrowError(ApiError);
  });

  it("getEnumParam and getOptionalEnumParam validate against allowed values", () => {
    const allowed = ["asc", "desc"] as const;
    expect(getEnumParam(query({}), "order", allowed, "asc")).toBe("asc");
    expect(getEnumParam(query({ order: "" }), "order", allowed, "asc")).toBe("asc");
    expect(getEnumParam(query({ order: "desc" }), "order", allowed, "asc")).toBe("desc");
    expect(getOptionalEnumParam(query({}), "order", allowed)).toBeUndefined();
    expect(getOptionalEnumParam(query({ order: "" }), "order", allowed)).toBeUndefined();
    expect(getOptionalEnumParam(query({ order: "desc" }), "order", allowed)).toBe("desc");
    expect(() => getEnumParam(query({ order: "up" }), "order", allowed, "asc")).toThrowError(
      ApiError,
    );
  });

  it("getStringParam trims and treats blank input as absent", () => {
    expect(getStringParam(query({}), "q")).toBeUndefined();
    expect(getStringParam(query({ q: "" }), "q")).toBeUndefined();
    expect(getStringParam(query({ q: "   " }), "q")).toBeUndefined();
    expect(getStringParam(query({ q: "  urban " }), "q")).toBe("urban");
  });

  it("activeFilters keeps only present, non-empty parameters", () => {
    expect(
      activeFilters(query({ topic: "crime", cefr: "", sort: "word" }), ["topic", "cefr", "sort"]),
    ).toEqual({
      topic: "crime",
      sort: "word",
    });
    expect(activeFilters(query({}), ["topic"])).toEqual({});
  });
});

describe("errors", () => {
  it("errorPayload omits details when there are none and includes them when present", () => {
    expect(errorPayload(new ApiError(404, "not_found", "Nope"))).toEqual({
      error: { status: 404, code: "not_found", message: "Nope" },
    });
    const withDetails = errorPayload(
      new ApiError(400, "invalid_parameter", "Bad", [{ param: "page", message: "Nope" }]),
    );
    expect(withDetails.error.details).toEqual([{ param: "page", message: "Nope" }]);
  });
});

describe("band", () => {
  it("validateSkillScore accepts whole and half bands from 0 to 9", () => {
    expect(validateSkillScore("writing", 0)).toBe(0);
    expect(validateSkillScore("writing", 9)).toBe(9);
    expect(validateSkillScore("writing", 6.5)).toBe(6.5);
  });

  it("validateSkillScore rejects non-numbers, ranges and non-half steps", () => {
    for (const bad of ["6", null, undefined, Number.NaN]) {
      expect(() => validateSkillScore("writing", bad)).toThrowError(ApiError);
    }
    expect(() => validateSkillScore("writing", 10)).toThrowError(ApiError);
    expect(() => validateSkillScore("writing", -0.5)).toThrowError(ApiError);
    expect(() => validateSkillScore("writing", 6.25)).toThrowError(ApiError);
    expect(() => validateSkillScore("writing", 6.1)).toThrowError(ApiError);
  });

  it("computeOverallBand implements the official rounding rules", () => {
    const scores = { listening: 6, reading: 6, writing: 6, speaking: 6 } as const;
    expect(computeOverallBand(scores)).toBe(6);
    // Average 6.125 rounds down to 6.0.
    expect(computeOverallBand({ listening: 6.5, reading: 6, writing: 6, speaking: 6 })).toBe(6);
    // Average 6.25 rounds up to 6.5.
    expect(computeOverallBand({ listening: 6.5, reading: 6.5, writing: 6, speaking: 6 })).toBe(6.5);
    // Average 6.75 rounds up to 7.0.
    expect(computeOverallBand({ listening: 7, reading: 7, writing: 7, speaking: 6 })).toBe(7);
    // Average 8.875 rounds to 9.0.
    expect(computeOverallBand({ listening: 9, reading: 9, writing: 9, speaking: 8.5 })).toBe(9);
  });
});

describe("random", () => {
  it("hashString is deterministic and varies with input", () => {
    expect(hashString("ielts")).toBe(hashString("ielts"));
    expect(hashString("ielts")).not.toBe(hashString("toefl"));
    expect(hashString("")).toBe(0x811c9dc5);
  });

  it("mulberry32 returns deterministic floats in [0, 1)", () => {
    const first = mulberry32(42);
    const second = mulberry32(42);
    const values = [first(), first(), first()];
    expect(values).toEqual([second(), second(), second()]);
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("sampleSeeded is deterministic and clamps oversized counts", () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(sampleSeeded(items, 3, "seed")).toEqual(sampleSeeded(items, 3, "seed"));
    expect(sampleSeeded(items, 3, "seed")).not.toEqual(sampleSeeded(items, 3, "other"));
    expect(sampleSeeded(items, 99, "seed")).toHaveLength(10);
    expect(sampleSeeded([], 5, "seed")).toEqual([]);
    expect(items).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("swapItems swaps valid indices and ignores invalid ones", () => {
    const values = ["a", "b", "c"];
    swapItems(values, 0, 2);
    expect(values).toEqual(["c", "b", "a"]);
    swapItems(values, 5, 0);
    swapItems(values, 0, -1);
    expect(values).toEqual(["c", "b", "a"]);
  });
});

describe("search", () => {
  it("tokenize lowercases and drops empty tokens", () => {
    expect(tokenize("  Urban   ENVIRONMENT ")).toEqual(["urban", "environment"]);
    expect(tokenize("")).toEqual([]);
  });

  it("matchesAllTokens requires every token to appear", () => {
    expect(matchesAllTokens(["Urban planning", "city"], "urban")).toBe(true);
    expect(matchesAllTokens(["Urban planning"], "urban city")).toBe(false);
    expect(matchesAllTokens(["the city", "urban area"], "urban city")).toBe(true);
    expect(matchesAllTokens(["anything"], "")).toBe(true);
  });
});

describe("paginate and sortItems", () => {
  const items = [1, 2, 3, 4, 5];

  it("paginate builds links and nulls prev/next at the edges", () => {
    const firstPage = paginate(items, 1, 2, "/items", { cefr: "B2" });
    expect(firstPage.data).toEqual([1, 2]);
    expect(firstPage.meta).toMatchObject({ page: 1, perPage: 2, total: 5, totalPages: 3 });
    expect(firstPage.meta.links.prev).toBeNull();
    expect(firstPage.meta.links.next).toBe("/items?cefr=B2&per_page=2&page=2");

    const lastPage = paginate(items, 3, 2, "/items");
    expect(lastPage.data).toEqual([5]);
    expect(lastPage.meta.links.next).toBeNull();
    expect(lastPage.meta.links.prev).toBe("/items?per_page=2&page=2");
    expect(lastPage.meta.links.self).toBe("/items?per_page=2&page=3");
    expect(lastPage.meta.links.first).toBe("/items?per_page=2&page=1");
    expect(lastPage.meta.links.last).toBe("/items?per_page=2&page=3");
  });

  it("paginate returns empty pages beyond the end", () => {
    const beyond = paginate(items, 9, 2, "/items");
    expect(beyond.data).toEqual([]);
    expect(beyond.meta.links.next).toBeNull();
    expect(beyond.meta.totalPages).toBe(3);
  });

  it("paginate keeps one page for empty result sets", () => {
    const empty = paginate([], 1, 20, "/items");
    expect(empty.data).toEqual([]);
    expect(empty.meta.totalPages).toBe(1);
    expect(empty.meta.links.next).toBeNull();
  });

  it("sortItems sorts by the chosen comparator in either direction", () => {
    const comparators = { id: (a: number, b: number) => a - b } as const;
    expect(sortItems([3, 1, 2], "id", "asc", comparators)).toEqual([1, 2, 3]);
    expect(sortItems([3, 1, 2], "id", "desc", comparators)).toEqual([3, 2, 1]);
  });
});

describe("router", () => {
  it("getParam returns bound path parameters and throws when missing", () => {
    const ctx = { params: { id: "w001" } } as Parameters<typeof getParam>[0];
    expect(getParam(ctx, "id")).toBe("w001");
    expect(() => getParam(ctx, "other")).toThrowError(ApiError);
  });

  it("normalises paths and segments", () => {
    expect(normalizePath("/v1/topics/")).toBe("/v1/topics");
    expect(normalizePath("/v1/topics")).toBe("/v1/topics");
    expect(normalizePath("/")).toBe("/");
    expect(segmentsOf("/v1//topics/")).toEqual(["v1", "topics"]);
    expect(segmentsOf("/")).toEqual([]);
  });

  it("matches routes, methods and unknown paths", () => {
    const route = {
      method: "GET",
      path: "/v1/writing/:id",
      summary: "test",
      handler: () => ({ status: 200 }),
    } as const;
    const routes = [route];
    const matched = matchRoute(routes, "GET", "/v1/writing/w001");
    expect(matched.kind).toBe("matched");
    if (matched.kind === "matched") {
      expect(matched.params).toEqual({ id: "w001" });
      expect(matched.allowed).toContain("HEAD");
    }
    expect(matchRoute(routes, "HEAD", "/v1/writing/w001").kind).toBe("matched");
    expect(matchRoute(routes, "POST", "/v1/writing/w001").kind).toBe("method_not_allowed");
    expect(matchRoute(routes, "GET", "/v1/writing").kind).toBe("not_found");
    expect(matchRoute(routes, "GET", "/v1/writing/w001/extra").kind).toBe("not_found");
    expect(matchRoute(routes, "GET", "/v1/writing/other/literal").kind).toBe("not_found");
  });
});

describe("respond helpers", () => {
  it("computeEtag is stable, input-sensitive and weak", () => {
    const etag = computeEtag("payload");
    expect(etag).toBe(computeEtag("payload"));
    expect(etag).not.toBe(computeEtag("payload2"));
    expect(etag.startsWith('W/"')).toBe(true);
  });

  it("etagMatches accepts exact, star and unweak forms", () => {
    const etag = 'W/"abc123"';
    expect(etagMatches(etag, etag)).toBe(true);
    expect(etagMatches("*", etag)).toBe(true);
    expect(etagMatches('"abc123"', etag)).toBe(true);
    expect(etagMatches(`"${etag}"`, etag)).toBe(false);
    expect(etagMatches('W/"other"', etag)).toBe(false);
  });

  it("headerToString normalises arrays and keeps strings", () => {
    expect(headerToString("a")).toBe("a");
    expect(headerToString(["a", "b"])).toBe("a,b");
    expect(headerToString(undefined)).toBeUndefined();
  });
});
