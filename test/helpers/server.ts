import { startApiServer } from '../../src/server.js';
import type { AddressInfo } from 'node:net';

import type { Server } from 'node:http';
import type { AppOptions } from '../../src/app.js';

/** A running test server bound to a random port on the loopback interface. */
export interface TestServer {
  /** Base URL, e.g. `http://127.0.0.1:54321`. */
  base: string;
  /** Underlying server. */
  server: Server;
  /** Issue a request against the running server. */
  request: (path: string, init?: RequestInit) => Promise<Response>;
  /** Read a JSON envelope. */
  json: <T = unknown>(
    path: string,
    init?: RequestInit,
  ) => Promise<{ status: number; data: T; meta: Record<string, unknown> }>;
  /** Shut the server down. */
  close: () => Promise<void>;
}

/**
 * Start the API on a random free port.
 *
 * @param options - Application options forwarded to the request handler.
 */
export async function startTestServer(options: AppOptions = {}): Promise<TestServer> {
  const server = await startApiServer('127.0.0.1', 0, options);
  const { port } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}`;
  return {
    base,
    server,
    request: (path, init) => fetch(`${base}${path}`, init),
    json: async (path, init) => {
      const response = await fetch(`${base}${path}`, init);
      return (await response.json()) as {
        status: number;
        data: never;
        meta: Record<string, unknown>;
      };
    },
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error === undefined ? resolve() : reject(error)));
      }),
  };
}
