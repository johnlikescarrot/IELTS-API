#!/usr/bin/env node
/**
 * Command-line entry point: starts the HTTP server.
 *
 * The port is read from `PORT` and the bind address from `HOST`, both with
 * sensible defaults, so the server runs unchanged locally, in a container and
 * on most platform-as-a-service providers.
 *
 * @packageDocumentation
 */

import { pathToFileURL } from "node:url";
import { startServer } from "../http/server.ts";
import { SERVICE_NAME, VERSION } from "../meta.ts";

/**
 * Parses a port from an environment value.
 *
 * @param value - The raw environment value.
 * @param fallback - Port to use when the value is absent or invalid.
 */
export function resolvePort(
  value: string | undefined,
  fallback: number,
): number {
  if (value === undefined) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 65535) {
    return fallback;
  }
  return parsed;
}

/**
 * Starts the server using environment configuration.
 *
 * @param environment - Environment variables to read.
 * @param log - Sink for the startup banner.
 */
export async function main(
  environment: NodeJS.ProcessEnv = process.env,
  log: (message: string) => void = console.log,
): Promise<void> {
  const port = resolvePort(environment["PORT"], 3000);
  const host = environment["HOST"] ?? "0.0.0.0";
  const running = await startServer({ port, host });
  log(
    `${SERVICE_NAME} ${VERSION} listening on http://${host}:${String(running.port)} (no authentication required)`,
  );
}

/**
 * Reports whether this module was executed directly rather than imported.
 *
 * @param argv1 - The second element of `process.argv`.
 * @param moduleUrl - The importing module's URL.
 */
export function isDirectInvocation(
  argv1: string | undefined,
  moduleUrl: string,
): boolean {
  if (argv1 === undefined) {
    return false;
  }
  return pathToFileURL(argv1).href === moduleUrl;
}

/* c8 ignore start -- executed only when the file is run as a program. */
if (isDirectInvocation(process.argv[1], import.meta.url)) {
  await main();
}
/* c8 ignore stop */
