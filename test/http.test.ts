import { EventEmitter } from "node:events";
import { describe, expect, it } from "vitest";
import { App } from "../src/lib/server/app.js";
import { MAX_BODY_BYTES, createRequestHandler } from "../src/lib/http.js";
import { SERVICE_INFO } from "../src/config.js";
import type { IncomingMessage, ServerResponse } from "node:http";

function app(): App {
  return new App(SERVICE_INFO);
}

/** A minimal fake ServerResponse that records what would be written. */
function fakeResponse(): {
  res: ServerResponse;
  status: () => number;
  body: () => string;
} {
  const state: { status?: number; body: string } = { body: "" };
  const res = {
    writeHead: (status: number) => {
      state.status = status;
      return res;
    },
    end: (body?: string) => {
      state.body = body ?? "";
      return res;
    },
  } as unknown as ServerResponse;
  return { res, status: () => state.status ?? 0, body: () => state.body };
}

function fakeReq(overrides: Partial<IncomingMessage>): IncomingMessage {
  const req = new EventEmitter() as unknown as IncomingMessage;
  Object.assign(req, {
    method: "GET",
    url: "/health",
    headers: { "x-single": "one" },
    ...overrides,
  });
  return req;
}

describe("createRequestHandler", () => {
  it("serves a request with ordinary single-value headers", async () => {
    const handler = createRequestHandler(app());
    const { res, status } = fakeResponse();
    await handler(fakeReq({}), res);
    expect(status()).toBe(200);
  });

  it("flattens multi-valued headers", async () => {
    const handler = createRequestHandler(app());
    const { res, status, body } = fakeResponse();
    const req = fakeReq({ headers: { "x-dup": ["a", "b"] } });
    await handler(req, res);
    expect(status()).toBe(200);
    expect(body()).toContain('"status":"ok"');
  });

  it("skips header entries whose value is undefined", async () => {
    const handler = createRequestHandler(app());
    const { res, status } = fakeResponse();
    const req = fakeReq({
      headers: { "x-one": "a", "x-undef": undefined },
    });
    await handler(req, res);
    expect(status()).toBe(200);
  });

  it("falls back to the root path and GET when url/method are missing", async () => {
    const handler = createRequestHandler(app());
    const { res, status } = fakeResponse();
    const req = fakeReq({ url: undefined, method: undefined });
    await handler(req, res);
    expect(status()).toBe(200);
  });

  it("returns 500 when the request body exceeds the size cap", async () => {
    const handler = createRequestHandler(app());
    const { res, status } = fakeResponse();
    const req = fakeReq({
      method: "POST",
      url: "/v1/bands/overall",
      headers: { "content-type": "application/json" },
    });
    const pending = handler(req, res);
    req.emit("data", Buffer.alloc(MAX_BODY_BYTES + 1));
    req.emit("end");
    await pending;
    expect(status()).toBe(500);
  });

  it("returns 500 when the request stream errors", async () => {
    const handler = createRequestHandler(app());
    const { res, status } = fakeResponse();
    const req = fakeReq({
      method: "POST",
      url: "/v1/bands/overall",
    });
    const pending = handler(req, res);
    req.emit("error", new Error("stream failed"));
    await pending;
    expect(status()).toBe(500);
  });

  it("parses a valid JSON request body", async () => {
    const handler = createRequestHandler(app());
    const { res, status, body } = fakeResponse();
    const req = fakeReq({
      method: "POST",
      url: "/v1/bands/overall",
      headers: { "content-type": "application/json" },
    });
    const pending = handler(req, res);
    req.emit(
      "data",
      Buffer.from(
        JSON.stringify({
          listening: 6.5,
          reading: 7,
          writing: 6.5,
          speaking: 7,
        }),
      ),
    );
    req.emit("end");
    await pending;
    expect(status()).toBe(200);
    expect(body()).toContain("overall");
  });

  it("passes an unparseable body through as text", async () => {
    const handler = createRequestHandler(app());
    const { res, status } = fakeResponse();
    const req = fakeReq({ method: "POST", url: "/v1/bands/overall" });
    const pending = handler(req, res);
    req.emit("data", Buffer.from("this is not json"));
    req.emit("end");
    await pending;
    expect(status()).toBe(400);
  });

  it("resolves an empty body to undefined", async () => {
    const handler = createRequestHandler(app());
    const { res, status } = fakeResponse();
    const req = fakeReq({ method: "POST", url: "/v1/bands/overall" });
    const pending = handler(req, res);
    req.emit("end");
    await pending;
    expect(status()).toBe(400);
  });
});
