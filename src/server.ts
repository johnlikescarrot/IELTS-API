/**
 * Server bootstrap: config -> app -> listen, with graceful shutdown hooks.
 * Everything is injectable so the startup path is fully unit-testable.
 */

import type { EventEmitter } from 'node:events';
import { createApp } from './app.js';
import { loadConfig, type AppConfig } from './config.js';

export interface ServerHandle {
  readonly port: number;
  close(): Promise<void>;
}

export async function startServer(config: AppConfig): Promise<ServerHandle> {
  const app = await createApp(config);
  const address = await app.listen({ port: config.port, host: config.host });
  const port = extractPort(address, config.port);
  return {
    port,
    close: async () => {
      await app.close();
    }
  };
}

/** Extracts the numeric port from a listen address, falling back when absent. */
export function extractPort(address: string, fallbackPort: number): number {
  if (address.startsWith('http')) {
    const url = new URL(address);
    const port = Number.parseInt(url.port, 10);
    return Number.isNaN(port) ? fallbackPort : port;
  }
  return fallbackPort;
}

/**
 * Registers `SIGINT`/`SIGTERM` handlers that close the server and set the
 * process exit code. The emitter/exit are injectable for tests.
 */
export function registerShutdownHooks(
  handle: ServerHandle,
  emitter: EventEmitter = process,
  signals: readonly string[] = ['SIGINT', 'SIGTERM'],
  exit: (code: number) => void = (code) => {
    process.exitCode = code;
  }
): void {
  for (const signal of signals) {
    emitter.once(signal, () => {
      void handle.close().then(
        () => exit(0),
        () => exit(1)
      );
    });
  }
}

export interface RunOptions {
  /** Environment variables used to build the config (defaults to process.env). */
  readonly env?: Readonly<Record<string, string | undefined>>;
  /** Emitter used for shutdown signals (defaults to process). */
  readonly emitter?: EventEmitter;
  /** Signals to listen on (defaults to SIGINT and SIGTERM). */
  readonly signals?: readonly string[];
  /** Exit function (defaults to setting process.exitCode). */
  readonly exit?: (code: number) => void;
}

export async function run(options: RunOptions = {}): Promise<number> {
  try {
    const config = loadConfig(options.env);
    const handle = await startServer(config);
    registerShutdownHooks(handle, options.emitter ?? process, options.signals, options.exit);
    return 0;
  } catch (error) {
    process.stderr.write(`ielts-api failed to start: ${String(error)}\n`);
    return 1;
  }
}
