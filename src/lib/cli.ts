/**
 * Command-line entry-point plumbing.
 *
 * The logic lives here rather than in `cli.ts` so that it can be unit tested:
 * `cli.ts` itself stays branch-free, which keeps the coverage report honest.
 */

import { pathToFileURL } from 'node:url';

import type { AddressInfo } from 'node:net';

import { parseCli, usage } from './config.js';
import { startApiServer } from '../server.js';
import { API_VERSION, SERVICE_NAME } from '../version.js';

import type { Server } from 'node:http';

/**
 * Decide whether a module was invoked directly.
 *
 * @param moduleUrl - `import.meta.url` of the module.
 * @param entryPath - `process.argv[1]`, i.e. the script Node started with.
 */
export function isEntryPoint(moduleUrl: string, entryPath: string | undefined): boolean {
  if (entryPath === undefined) {
    return false;
  }
  return pathToFileURL(entryPath).href === moduleUrl;
}

/**
 * Run the command-line interface.
 *
 * @param argv - Arguments without the node executable and script path.
 * @param entry - Whether the module was invoked directly; when `false` the
 *   arguments are validated but no server is started.
 * @param env - Environment used for `PORT` / `HOST` overrides.
 * @returns The listening server, or `null` when nothing was started.
 */
export async function runCli(
  argv: readonly string[],
  entry: boolean,
  env: NodeJS.ProcessEnv = process.env,
): Promise<Server | null> {
  const result = parseCli(argv, env);
  if (result.kind === 'help') {
    console.log(usage());
    return null;
  }
  if (result.kind === 'version') {
    console.log(`${SERVICE_NAME} ${API_VERSION}`);
    return null;
  }
  if (!entry) {
    return null;
  }
  const { host, port, log } = result.config;
  const server = await startApiServer(host, port, { log });
  const { port: boundPort } = server.address() as AddressInfo;
  if (log) {
    console.log(`${SERVICE_NAME} ${API_VERSION} listening on http://${host}:${boundPort}`);
    console.log(`  docs:   http://localhost:${boundPort}/docs`);
    console.log(`  openapi: http://localhost:${boundPort}/openapi.json`);
  }
  return server;
}
