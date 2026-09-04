import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../src/config.js';
import {
  extractPort,
  registerShutdownHooks,
  run,
  startServer,
  type ServerHandle
} from '../src/server.js';

describe('extractPort', () => {
  it('parses the port from an http address', () => {
    expect(extractPort('http://127.0.0.1:34567', 3000)).toBe(34567);
  });

  it('falls back when the address has no port', () => {
    expect(extractPort('http://0.0.0.0', 3000)).toBe(3000);
  });

  it('falls back for non-http addresses (e.g. unix sockets)', () => {
    expect(extractPort('/tmp/socket', 3000)).toBe(3000);
  });
});

describe('startServer', () => {
  it('listens and closes cleanly', async () => {
    const config = { ...loadConfig({ NODE_ENV: 'test', PORT: '0' }), port: 0 };
    const handle = await startServer(config);
    expect(handle.port).toBeGreaterThan(0);
    await handle.close();
  });
});

describe('registerShutdownHooks', () => {
  function makeHandle(): { handle: ServerHandle; close: ReturnType<typeof vi.fn> } {
    const close = vi.fn(async () => undefined);
    return { handle: { port: 1, close }, close };
  }

  it('closes the server and exits 0 on a signal', async () => {
    const { handle, close } = makeHandle();
    const emitter = new EventEmitter();
    const exit = vi.fn();
    registerShutdownHooks(handle, emitter, ['SIGINT', 'SIGTERM'], exit);
    emitter.emit('SIGINT');
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(close).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('exits 1 when closing fails', async () => {
    const close = vi.fn(async () => {
      throw new Error('close failed');
    });
    const handle: ServerHandle = { port: 1, close };
    const emitter = new EventEmitter();
    const exit = vi.fn();
    registerShutdownHooks(handle, emitter, ['SIGTERM'], exit);
    emitter.emit('SIGTERM');
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('defaults to setting process.exitCode when no exit callback is given', async () => {
    const { handle } = makeHandle();
    const emitter = new EventEmitter();
    const previousExitCode = process.exitCode;
    try {
      registerShutdownHooks(handle, emitter, ['SIGUSR2']);
      emitter.emit('SIGUSR2');
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(process.exitCode).toBe(0);
    } finally {
      process.exitCode = previousExitCode;
    }
  });
});

describe('run', () => {
  it('starts the server and returns 0', async () => {
    const emitter = new EventEmitter();
    const exit = vi.fn();
    const code = await run({ env: { NODE_ENV: 'test', PORT: '0' }, emitter, exit });
    expect(code).toBe(0);
    expect(exit).not.toHaveBeenCalled();
    emitter.emit('SIGTERM');
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('returns 1 and writes to stderr when startup fails', async () => {
    const stderr = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true) as unknown as ReturnType<typeof vi.fn>;
    try {
      const code = await run({ env: { NODE_ENV: 'test', PORT: 'definitely-not-a-port' } });
      expect(code).toBe(1);
      expect(stderr).toHaveBeenCalledTimes(1);
      const message = String(stderr.mock.calls[0]?.[0]);
      expect(message).toContain('ielts-api failed to start');
      expect(message).toContain('ConfigError');
    } finally {
      stderr.mockRestore();
    }
  });

  it('uses the real process emitter when none is injected', async () => {
    const exit = vi.fn();
    const code = await run({ env: { NODE_ENV: 'test', PORT: '0' }, signals: ['SIGUSR2'], exit });
    expect(code).toBe(0);
    process.kill(process.pid, 'SIGUSR2');
    for (let i = 0; i < 100 && exit.mock.calls.length === 0; i++) {
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
    }
    expect(exit).toHaveBeenCalledWith(0);
  });
});
