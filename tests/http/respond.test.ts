import { describe, expect, it } from "vitest";
import { ApiError } from "../../src/core/errors.ts";
import {
  BASE_HEADERS,
  collection,
  json,
  raw,
  render,
  renderError,
} from "../../src/http/respond.ts";

describe("handler result constructors", () => {
  it("builds JSON results with and without metadata", () => {
    expect(json({ a: 1 })).toEqual({ kind: "json", data: { a: 1 } });
    expect(json({ a: 1 }, { count: 1 })).toEqual({
      kind: "json",
      data: { a: 1 },
      meta: { count: 1 },
    });
  });

  it("builds collection results with a count", () => {
    expect(collection([1, 2], { total: 5 })).toEqual({
      kind: "json",
      data: [1, 2],
      meta: { count: 2, total: 5 },
    });
    expect(collection([])).toEqual({
      kind: "json",
      data: [],
      meta: { count: 0 },
    });
  });

  it("builds raw results", () => {
    expect(raw("text/plain", "hi")).toEqual({
      kind: "raw",
      contentType: "text/plain",
      body: "hi",
    });
  });
});

describe("render", () => {
  it("serialises JSON compactly or prettily", () => {
    const compact = render(json({ a: 1 }), false);
    const pretty = render(json({ a: 1 }), true);
    expect(compact.body).toBe('{"data":{"a":1}}');
    expect(pretty.body).toContain("\n");
    expect(compact.status).toBe(200);
    expect(compact.headers["content-type"]).toContain("application/json");
    expect(compact.headers["content-length"]).toBe(
      String(Buffer.byteLength(compact.body)),
    );
  });

  it("omits the meta key when there is no metadata", () => {
    expect(JSON.parse(render(json({ a: 1 }), false).body)).toEqual({
      data: { a: 1 },
    });
  });

  it("honours an explicit status", () => {
    expect(
      render({ kind: "json", status: 201, data: null }, false).status,
    ).toBe(201);
    expect(
      render(
        { kind: "raw", status: 202, contentType: "text/plain", body: "x" },
        false,
      ).status,
    ).toBe(202);
  });

  it("passes raw bodies through untouched", () => {
    const response = render(raw("text/html", "<p>hi</p>"), true);
    expect(response.body).toBe("<p>hi</p>");
    expect(response.headers["content-type"]).toBe("text/html");
  });

  it("always applies the base headers", () => {
    const response = render(json({}), false);
    for (const [name, value] of Object.entries(BASE_HEADERS)) {
      expect(response.headers[name]).toBe(value);
    }
    expect(response.headers["access-control-allow-origin"]).toBe("*");
  });
});

describe("renderError", () => {
  it("renders ApiError instances with their status and code", () => {
    const response = renderError(
      new ApiError("not_found", "gone", { path: "/x" }),
      false,
    );
    expect(response.status).toBe(404);
    expect(JSON.parse(response.body)).toEqual({
      error: { code: "not_found", message: "gone", details: { path: "/x" } },
    });
  });

  it("renders unknown failures as a generic 500", () => {
    const response = renderError(new Error("boom"), true);
    expect(response.status).toBe(500);
    const payload = JSON.parse(response.body) as {
      error: { code: string; message: string };
    };
    expect(payload.error.code).toBe("internal_error");
    expect(payload.error.message).not.toContain("boom");
  });

  it("renders non-error throwables safely", () => {
    expect(renderError("oops", false).status).toBe(500);
  });
});
