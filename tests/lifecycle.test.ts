import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import type { Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import "../src/server.ts";
import {
  createShutdownHandler,
  maybeStart,
  resolveHost,
  resolvePort,
  startServer,
} from "../src/app.ts";
import { VERSION } from "../src/version.ts";

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error === undefined ? resolve() : reject(error)));
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("resolvePort", () => {
  it("prefers an explicit port", () => {
    expect(resolvePort(3210, "9999")).toBe(3210);
    expect(resolvePort(0, "9999")).toBe(0);
  });

  it("falls back to 3000 when PORT is missing, empty or malformed", () => {
    expect(resolvePort(undefined, undefined)).toBe(3000);
    expect(resolvePort(undefined, "")).toBe(3000);
    expect(resolvePort(undefined, "not-a-port")).toBe(3000);
    expect(resolvePort(undefined, "80x")).toBe(3000);
  });

  it("reads a valid PORT from the environment", () => {
    expect(resolvePort(undefined, "8080")).toBe(8080);
  });
});

describe("resolveHost", () => {
  it("prefers an explicit host, then the environment, then the wildcard default", () => {
    expect(resolveHost("127.0.0.1", "10.0.0.1")).toBe("127.0.0.1");
    expect(resolveHost(undefined, "10.0.0.1")).toBe("10.0.0.1");
    expect(resolveHost(undefined, undefined)).toBe("0.0.0.0");
  });
});

describe("startServer", () => {
  it("listens on an ephemeral port with explicit options and no signal handlers", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.stubEnv("PORT", "0");
    const server = startServer({ port: 0, host: "127.0.0.1", registerSignals: false });
    await once(server, "listening");
    const address = server.address();
    expect(typeof address === "object" && address !== null && address.port > 0).toBe(true);
    expect(logSpy).toHaveBeenCalledOnce();
    await closeServer(server);
  });

  it("resolves HOST from the environment when no host is given", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.stubEnv("HOST", "127.0.0.1");
    vi.stubEnv("PORT", "0");
    const server = startServer({ registerSignals: false });
    await once(server, "listening");
    const address = server.address();
    expect(typeof address === "object" && address !== null && address.address).toBe("127.0.0.1");
    await closeServer(server);
  });
});

describe("maybeStart", () => {
  it("does nothing when the importer is not the process entry point", () => {
    expect(maybeStart(pathToFileURL("/definitely/not/the/entry.ts").href)).toBeUndefined();
  });

  it("does nothing when argv[1] is unavailable", () => {
    const original = process.argv[1];
    process.argv[1] = undefined as unknown as string;
    try {
      expect(maybeStart(pathToFileURL("/anything.ts").href)).toBeUndefined();
    } finally {
      process.argv[1] = original;
    }
  });

  it("starts listening when the module is the entry point", async () => {
    const directory = mkdtempSync(join(tmpdir(), "ielts-api-start-"));
    const entry = join(directory, "main.js");
    writeFileSync(entry, "");
    const original = process.argv[1];
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const onceSpy = vi.spyOn(process, "once").mockImplementation(() => process);
    vi.stubEnv("PORT", "0");
    vi.stubEnv("HOST", "127.0.0.1");
    process.argv[1] = entry;
    try {
      const server = maybeStart(pathToFileURL(entry).href);
      expect(server).toBeDefined();
      if (server !== undefined) {
        await once(server, "listening");
        expect(server.listening).toBe(true);
        await closeServer(server);
      }
    } finally {
      process.argv[1] = original;
      rmSync(directory, { recursive: true, force: true });
      onceSpy.mockRestore();
      logSpy.mockRestore();
    }
  });
});

describe("graceful shutdown", () => {
  it("closes the server and exits with code 0", () => {
    const closeCallbacks: (() => void)[] = [];
    const fakeServer = {
      close: (callback: () => void) => {
        closeCallbacks.push(callback);
      },
    } as unknown as Server;
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as unknown as (code?: number) => never);

    const shutdown = createShutdownHandler(fakeServer);
    shutdown("SIGTERM");

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("SIGTERM"));
    expect(closeCallbacks).toHaveLength(1);
    closeCallbacks[0]?.();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});

describe("version", () => {
  it("stays in sync with package.json", () => {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
      version: string;
    };
    expect(pkg.version).toBe(VERSION);
  });
});
