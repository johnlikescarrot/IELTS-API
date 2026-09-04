import { describe, expect, it, vi } from "vitest";
import { isDirectInvocation, main, resolvePort } from "../../src/bin/serve.ts";

describe("resolvePort", () => {
  it("falls back when the value is absent or invalid", () => {
    expect(resolvePort(undefined, 3000)).toBe(3000);
    expect(resolvePort("abc", 3000)).toBe(3000);
    expect(resolvePort("1.5", 3000)).toBe(3000);
    expect(resolvePort("-1", 3000)).toBe(3000);
    expect(resolvePort("70000", 3000)).toBe(3000);
  });

  it("accepts valid ports", () => {
    expect(resolvePort("8080", 3000)).toBe(8080);
    expect(resolvePort("0", 3000)).toBe(0);
  });
});

describe("isDirectInvocation", () => {
  it("is false when there is no script argument", () => {
    expect(isDirectInvocation(undefined, "file:///a.js")).toBe(false);
  });

  it("compares resolved file URLs", () => {
    expect(isDirectInvocation("/tmp/a.js", "file:///tmp/a.js")).toBe(true);
    expect(isDirectInvocation("/tmp/a.js", "file:///tmp/b.js")).toBe(false);
  });
});

describe("main", () => {
  it("starts a server on an ephemeral port and logs the banner", async () => {
    const log = vi.fn();
    await main({ PORT: "0", HOST: "127.0.0.1" }, log);
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0]![0]).toContain("no authentication required");
  });

  it("applies defaults when the environment is empty", async () => {
    const log = vi.fn();
    await main({ PORT: "0" }, log);
    expect(log.mock.calls[0]![0]).toContain("0.0.0.0");
  });
});
