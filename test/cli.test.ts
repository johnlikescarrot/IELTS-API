import { afterEach, describe, expect, it, vi } from 'vitest';

import { isEntryPoint, runCli } from '../src/lib/cli.js';

import type { Server } from 'node:http';

const servers: Server[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  while (servers.length > 0) {
    const server = servers.pop();
    if (server === undefined) {
      continue;
    }
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }
});

describe('isEntryPoint', () => {
  it('is true when the started script is this module', () => {
    expect(isEntryPoint('file:///app/src/cli.ts', '/app/src/cli.ts')).toBe(true);
  });

  it('is false for a different module', () => {
    expect(isEntryPoint('file:///app/src/cli.ts', '/app/src/other.ts')).toBe(false);
  });

  it('is false when there is no entry script', () => {
    expect(isEntryPoint('file:///app/src/cli.ts', undefined)).toBe(false);
  });
});

describe('runCli', () => {
  it('prints usage for --help without starting a server', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    await expect(runCli(['--help'], true)).resolves.toBeNull();
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0]?.[0]).toContain('Usage: ielts-api');
  });

  it('prints the version for --version', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    await expect(runCli(['--version'], true)).resolves.toBeNull();
    expect(spy.mock.calls[0]?.[0]).toMatch(/^ielts-api \d+\.\d+\.\d+$/);
  });

  it('does not start a server when the module is imported, not executed', async () => {
    await expect(runCli([], false)).resolves.toBeNull();
  });

  it('starts a server when executed as the entry point', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const server = await runCli(['--port', '0', '--host', '127.0.0.1'], true, {});
    expect(server).not.toBeNull();
    servers.push(server as Server);
    const { port } = (server as Server).address() as { port: number };
    expect(port).toBeGreaterThan(0);
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    expect(response.status).toBe(200);
    const logged = spy.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(logged).toContain('listening on');
    expect(logged).toContain('/docs');
  });

  it('stays silent with --silent', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const server = await runCli(['--port', '0', '--silent'], true, {});
    servers.push(server as Server);
    expect(spy).not.toHaveBeenCalled();
  });

  it('propagates argument errors', async () => {
    await expect(runCli(['--nope'], true)).rejects.toThrow(/Unknown argument/);
  });
});
