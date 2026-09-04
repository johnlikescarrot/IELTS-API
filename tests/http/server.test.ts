import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { IncomingMessage } from "node:http";
import { Readable } from "node:stream";
import {
  createRequestListener,
  createServer,
  readBody,
  startServer,
  toApiRequest,
  type RunningServer,
} from "../../src/http/server.ts";
import { createApp } from "../../src/http/app.ts";

let running: RunningServer;
let base: string;

beforeAll(async () => {
  running = await startServer({ port: 0, host: "127.0.0.1" });
  base = `http://127.0.0.1:${String(running.port)}`;
});

afterAll(async () => {
  await running.close();
});

function fakeRequest(
  chunks: (string | Buffer)[],
  overrides: Partial<IncomingMessage> = {},
): IncomingMessage {
  const stream = Readable.from(chunks) as unknown as IncomingMessage;
  return Object.assign(stream, overrides);
}

describe("readBody", () => {
  it("returns null for an empty body", async () => {
    await expect(readBody(fakeRequest([]))).resolves.toBeNull();
  });

  it("concatenates buffers and strings", async () => {
    await expect(readBody(fakeRequest(["a", Buffer.from("b")]))).resolves.toBe(
      "ab",
    );
  });

  it("enforces the size limit", async () => {
    await expect(readBody(fakeRequest(["abcdef"]), 3)).rejects.toThrow(
      /limited to 3 bytes/,
    );
  });
});

describe("toApiRequest", () => {
  it("normalises method, path, query and headers", () => {
    const normalised = toApiRequest(
      fakeRequest([], {
        method: "post",
        url: "/v1/bands?limit=2",
        headers: {
          "Content-Type": "application/json",
          "x-multi": ["a", "b"],
          "x-absent": undefined,
        },
      }),
      "{}",
    );
    expect(normalised.method).toBe("POST");
    expect(normalised.path).toBe("/v1/bands");
    expect(normalised.query.get("limit")).toBe("2");
    expect(normalised.headers["content-type"]).toBe("application/json");
    expect(normalised.headers["x-multi"]).toBe("a, b");
    expect(normalised.headers["x-absent"]).toBeUndefined();
    expect(normalised.body).toBe("{}");
  });

  it("defaults an absent method and url", () => {
    const normalised = toApiRequest(fakeRequest([], { headers: {} }), null);
    expect(normalised.method).toBe("GET");
    expect(normalised.path).toBe("/");
  });
});

describe("HTTP server", () => {
  it("serves GET requests", async () => {
    const response = await fetch(`${base}/health`);
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    const payload = (await response.json()) as { data: { status: string } };
    expect(payload.data.status).toBe("ok");
  });

  it("requires no authentication headers of any kind", async () => {
    const response = await fetch(`${base}/v1/bands/7`);
    expect(response.status).toBe(200);
    expect(response.headers.get("www-authenticate")).toBeNull();
  });

  it("serves POST requests with a JSON body", async () => {
    const response = await fetch(`${base}/v1/score/overall`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        listening: 7,
        reading: 7,
        writing: 6,
        speaking: 6,
      }),
    });
    const payload = (await response.json()) as { data: { overall: number } };
    expect(payload.data.overall).toBe(6.5);
  });

  it("answers preflight requests", async () => {
    const response = await fetch(`${base}/v1/bands`, { method: "OPTIONS" });
    expect(response.status).toBe(204);
  });

  it("returns 404 for unknown paths", async () => {
    expect((await fetch(`${base}/missing`)).status).toBe(404);
  });

  it("rejects oversized bodies at the transport layer", async () => {
    const response = await fetch(`${base}/v1/writing/check`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "x".repeat(250_000) }),
    });
    expect(response.status).toBe(413);
  });

  it("can be constructed without starting", () => {
    const server = createServer();
    expect(server.listening).toBe(false);
    server.close();
  });

  it("accepts an injected application and a default host", async () => {
    const injected = await startServer({ app: createApp() });
    expect(injected.host).toBe("0.0.0.0");
    expect(injected.port).toBeGreaterThan(0);
    await injected.close();
  });

  it("rejects when closing an already closed server", async () => {
    const instance = await startServer({ port: 0, host: "127.0.0.1" });
    await instance.close();
    await expect(instance.close()).rejects.toThrow();
  });

  it("builds a listener that reports handler failures", async () => {
    const listener = createRequestListener({
      routes: [],
      handle: () => {
        throw new Error("boom");
      },
    });
    const chunks: string[] = [];
    let status = 0;
    const response = {
      writeHead(code: number) {
        status = code;
        return this;
      },
      end(body: string) {
        chunks.push(body);
      },
    };
    listener(
      fakeRequest([], { method: "GET", url: "/", headers: {} }),
      response as never,
    );
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(status).toBe(500);
    expect(chunks[0]).toContain("internal_error");
  });
});
