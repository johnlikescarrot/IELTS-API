#!/usr/bin/env node
/**
 * Command-line entry point: `ielts-api [--port 3000] [--host 0.0.0.0] [--silent]`.
 *
 * This module is intentionally branch-free; see `src/lib/cli.ts`.
 */

import { isEntryPoint, runCli } from './lib/cli.js';

await runCli(process.argv.slice(2), isEntryPoint(import.meta.url, process.argv[1]));
