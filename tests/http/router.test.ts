import { describe, expect, it } from "vitest";
import { Router, safeDecode } from "../../src/http/router.ts";

describe("safeDecode", () => {
  it("decodes percent-encoded segments", () => {
    expect(safeDecode("hello%20world")).toBe("hello world");
  });

  it("returns malformed input unchanged", () => {
    expect(safeDecode("%E0%A4%A")).toBe("%E0%A4%A");
  });
});

describe("Router", () => {
  function build(): Router<string> {
    return new Router<string>()
      .add("GET", "/", "index")
      .add("GET", "/v1/items", "list")
      .add("POST", "/v1/items", "create")
      .add("GET", "/v1/items/:id", "read")
      .add("GET", "/v1/items/:id/parts/:part", "part");
  }

  it("matches static routes", () => {
    const result = build().resolve("GET", "/v1/items");
    expect(result.kind).toBe("matched");
    if (result.kind === "matched") {
      expect(result.match.route.handler).toBe("list");
      expect(result.match.params).toEqual({});
    }
  });

  it("matches the root path", () => {
    expect(build().resolve("GET", "/").kind).toBe("matched");
  });

  it("captures parameters and decodes them", () => {
    const result = build().resolve("GET", "/v1/items/a%20b/parts/7");
    expect(result.kind).toBe("matched");
    if (result.kind === "matched") {
      expect(result.match.params).toEqual({ id: "a b", part: "7" });
      expect(result.match.route.handler).toBe("part");
    }
  });

  it("distinguishes methods on the same path", () => {
    const router = build();
    const get = router.resolve("GET", "/v1/items");
    const post = router.resolve("POST", "/v1/items");
    expect(get.kind === "matched" && get.match.route.handler).toBe("list");
    expect(post.kind === "matched" && post.match.route.handler).toBe("create");
  });

  it("reports the allowed methods when only the method differs", () => {
    const result = build().resolve("DELETE", "/v1/items");
    expect(result).toEqual({
      kind: "method-not-allowed",
      allowed: ["GET", "POST"],
    });
  });

  it("reports not-found for unknown paths and mismatched lengths", () => {
    expect(build().resolve("GET", "/nope").kind).toBe("not-found");
    expect(build().resolve("GET", "/v1/items/1/parts/2/extra").kind).toBe(
      "not-found",
    );
  });

  it("ignores repeated and trailing slashes", () => {
    expect(build().resolve("GET", "//v1//items//").kind).toBe("matched");
  });

  it("exposes the registered routes in order", () => {
    const routes = build().routes;
    expect(routes).toHaveLength(5);
    expect(routes[0]!.pattern).toBe("/");
  });

  it("prefers the first registered match", () => {
    const router = new Router<string>()
      .add("GET", "/v1/items/special", "special")
      .add("GET", "/v1/items/:id", "generic");
    const result = router.resolve("GET", "/v1/items/special");
    expect(result.kind === "matched" && result.match.route.handler).toBe(
      "special",
    );
  });
});
