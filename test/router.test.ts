import { describe, expect, it } from "vitest";
import { Router, splitPath } from "../src/lib/server/router.js";

describe("splitPath", () => {
  it("normalises paths into decoded segments", () => {
    expect(splitPath("/v1/items/123")).toEqual(["v1", "items", "123"]);
    expect(splitPath("/a//b/")).toEqual(["a", "b"]);
    expect(splitPath("/")).toEqual([]);
    expect(splitPath("/things/a%20b")).toEqual(["things", "a b"]);
  });
});

describe("Router", () => {
  it("registers and matches GET routes with dynamic params", () => {
    const router = new Router().get("/v1/papers/:id", (ctx) => ctx.params.id);
    const match = router.match("GET", "/v1/papers/listening");
    expect(match?.params).toEqual({ id: "listening" });
    expect(
      router.execute("GET", "/v1/papers/listening", {
        query: new URLSearchParams(),
        headers: {},
      }),
    ).toBe("listening");
  });

  it("supports the fluent post() method", () => {
    const router = new Router().post("/v1/x", () => "posted");
    expect(router.match("POST", "/v1/x")).toBeDefined();
    expect(router.match("GET", "/v1/x")).toBeUndefined();
  });

  it("returns undefined when nothing matches", () => {
    const router = new Router().get("/a", () => 1);
    expect(router.match("GET", "/b")).toBeUndefined();
    expect(router.execute("GET", "/b", { query: new URLSearchParams() })).toBeUndefined();
  });

  it("distinguishes literal from dynamic segments of equal length", () => {
    const router = new Router().get("/v1/things/new", () => "literal");
    router.get("/v1/things/:id", () => "dynamic");
    expect(router.execute("GET", "/v1/things/new", { query: new URLSearchParams() })).toBe(
      "literal",
    );
    expect(router.execute("GET", "/v1/things/other", { query: new URLSearchParams() })).toBe(
      "dynamic",
    );
  });

  it("reports allowed methods for a pathname", () => {
    const router = new Router().get("/v1/health", () => 1);
    expect(router.allowedMethods("/v1/health")).toEqual(["GET"]);
    expect(router.allowedMethods("/nope")).toEqual([]);
  });

  it("lists a snapshot of registered routes and their param names", () => {
    const router = new Router().get("/v1/ping", () => 1);
    const list = router.list();
    expect(list[0]).toMatchObject({ method: "GET", template: "/v1/ping" });
    expect(list[0].handler).toBeTypeOf("function");
    expect(router.paramNamesOf(list[0])).toEqual([]);
  });

  it("reports dynamic parameter names from a template", () => {
    const router = new Router().get("/v1/papers/:id", () => 1);
    const [entry] = router.list();
    expect(router.paramNamesOf(entry)).toEqual(["id"]);
  });
});
