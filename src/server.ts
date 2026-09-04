/**
 * HTTP server construction.
 */

import { createServer } from 'node:http';

import { createRequestHandler } from './app.js';

import type { Server } from 'node:http';
import type { AppOptions } from './app.js';

/**
 * Create (but do not start) the API server.
 *
 * @param options - Application options, forwarded to {@link createRequestHandler}.
 */
export function createApiServer(options: AppOptions = {}): Server {
  return createServer(createRequestHandler(options));
}

/**
 * Create the API server and bind it to a port.
 *
 * @param host - Interface to bind.
 * @param port - TCP port (`0` selects a free port).
 * @param options - Application options.
 * @returns The listening server.
 */
export function startApiServer(host: string, port: number, options: AppOptions = {}): Promise<Server> {
  const server = createApiServer(options);
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.removeListener('error', reject);
      resolve(server);
    });
  });
}
