/**
 * Unit tests for pure helpers: port resolution, pagination parsing,
 * the request-body reader (driven by a mock stream), and the router.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { resolvePort } from "../src/server.js";
import { ApiError, readJsonBody, type BodyReader } from "../src/http.js";
import {
  paginate,
  parseOptionalInt,
  parseOrder,
  parsePositiveInt,
} from "../src/lib/pagination.js";
import { resolve } from "../src/router.js";
import { sendJson } from "../src/http.js";

test("resolvePort accepts valid ports and falls back to 3000", () => {
  assert.equal(resolvePort({}), 3000);
  assert.equal(resolvePort({ PORT: "" }), 3000);
  assert.equal(resolvePort({ PORT: "abc" }), 3000);
  assert.equal(resolvePort({ PORT: "-1" }), 3000);
  assert.equal(resolvePort({ PORT: "65536" }), 3000);
  assert.equal(resolvePort({ PORT: "0" }), 0);
  assert.equal(resolvePort({ PORT: "3000" }), 3000);
  assert.equal(resolvePort({ PORT: "8080" }), 8080);
});

test("parsePositiveInt handles absent, valid, and invalid values", () => {
  assert.equal(parsePositiveInt(null, "page", 1, 1, 100), 1);
  assert.equal(parsePositiveInt("7", "page", 1, 1, 100), 7);
  assert.throws(() => parsePositiveInt("x", "page", 1, 1, 100), ApiError);
  assert.throws(() => parsePositiveInt("1.5", "page", 1, 1, 100), ApiError);
  assert.throws(() => parsePositiveInt("0", "page", 1, 1, 100), ApiError);
  assert.throws(() => parsePositiveInt("101", "page", 1, 1, 100), ApiError);
});

test("parseOptionalInt returns null when absent", () => {
  assert.equal(parseOptionalInt(null, "band", 5, 9), null);
  assert.equal(parseOptionalInt("8", "band", 5, 9), 8);
  assert.throws(() => parseOptionalInt("8.5", "band", 5, 9), ApiError);
  assert.throws(() => parseOptionalInt("4", "band", 5, 9), ApiError);
});

test("parseOrder defaults to asc and validates", () => {
  assert.equal(parseOrder(null), "asc");
  assert.equal(parseOrder("asc"), "asc");
  assert.equal(parseOrder("desc"), "desc");
  assert.throws(() => parseOrder("random"), ApiError);
});

test("paginate slices pages and reports stable page counts", () => {
  const items = Array.from({ length: 45 }, (_, i) => i);
  const page1 = paginate(items, 1, 20);
  assert.deepEqual(page1.data, items.slice(0, 20));
  assert.deepEqual(page1.meta, { total: 45, page: 1, limit: 20, pages: 3 });

  const beyond = paginate(items, 9, 20);
  assert.deepEqual(beyond.data, []);
  assert.equal(beyond.meta.pages, 3);

  const empty = paginate([], 1, 20);
  assert.deepEqual(empty.meta, { total: 0, page: 1, limit: 20, pages: 1 });
});

/** Minimal stream double used to drive readJsonBody deterministically. */
class MockBody implements BodyReader {
  private readonly handlers = new Map<
    string,
    Array<(value?: unknown) => void>
  >();
  public destroyed = false;

  on(
    event: "data" | "end" | "error",
    listener: (value?: unknown) => void,
  ): MockBody {
    const existing = this.handlers.get(event) ?? [];
    existing.push(listener);
    this.handlers.set(event, existing);
    return this;
  }

  emit(event: "data" | "end" | "error", value?: unknown): void {
    for (const handler of this.handlers.get(event) ?? []) {
      handler(value);
    }
  }

  destroy(): void {
    this.destroyed = true;
  }
}

test("readJsonBody resolves valid JSON across chunks", async () => {
  const body = new MockBody();
  const promise = readJsonBody(body);
  body.emit("data", Buffer.from('{"skill":"lis'));
  body.emit("data", Buffer.from('tening"}'));
  body.emit("end");
  assert.deepEqual(await promise, { skill: "listening" });
});

test("readJsonBody rejects oversized payloads and destroys the stream", async () => {
  const body = new MockBody();
  const promise = readJsonBody(body, 4);
  body.emit("data", Buffer.from("aaaa"));
  body.emit("data", Buffer.from("bbbb"));
  body.emit("end");
  await assert.rejects(promise, (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 413);
    return true;
  });
  assert.equal(body.destroyed, true);
});

test("readJsonBody rejects malformed JSON", async () => {
  const body = new MockBody();
  const promise = readJsonBody(body);
  body.emit("data", Buffer.from("not json at all"));
  body.emit("end");
  await assert.rejects(promise, (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 400);
    return true;
  });
});

test("readJsonBody surfaces stream errors", async () => {
  const body = new MockBody();
  const promise = readJsonBody(body);
  body.emit("error", new Error("aborted"));
  await assert.rejects(promise, (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 400);
    return true;
  });
});

test("router resolves matches, method mismatches, and misses", () => {
  const routes = [
    {
      method: "GET" as const,
      path: "/v1/words/:id",
      summary: "word",
      handler: (): void => undefined,
    },
    {
      method: "POST" as const,
      path: "/v1/echo",
      summary: "echo",
      handler: (): void => undefined,
    },
  ];
  const matched = resolve(routes, "GET", "/v1/words/w001");
  assert.equal(matched.kind, "matched");
  if (matched.kind === "matched") {
    assert.deepEqual(matched.params, { id: "w001" });
  }

  const wrongMethod = resolve(routes, "DELETE", "/v1/echo");
  assert.equal(wrongMethod.kind, "method_not_allowed");
  if (wrongMethod.kind === "method_not_allowed") {
    assert.deepEqual(wrongMethod.allowed, ["POST"]);
  }

  assert.equal(resolve(routes, "GET", "/v1/nope").kind, "not_found");
  assert.equal(resolve(routes, "GET", "/v1/words/%ZZ").kind, "not_found");
  assert.equal(
    resolve(routes, "GET", "/v1/words/w001/extra").kind,
    "not_found",
  );
});

test("sendJson writes headers and a JSON payload", () => {
  const chunks: {
    head?: number;
    headers?: Record<string, string>;
    body?: string;
  } = {};
  const fakeResponse = {
    writeHead(status: number, headers: Record<string, string>): void {
      chunks.head = status;
      chunks.headers = headers;
    },
    end(payload: string): void {
      chunks.body = payload;
    },
    writableEnded: false,
  };
  sendJson(fakeResponse as never, 201, { ok: true }, { "x-extra": "1" });
  assert.equal(chunks.head, 201);
  assert.equal(
    chunks.headers!["content-type"],
    "application/json; charset=utf-8",
  );
  assert.equal(chunks.headers!["x-extra"], "1");
  assert.equal(chunks.headers!["content-length"], "11");
  assert.deepEqual(JSON.parse(chunks.body!), { ok: true });
});
