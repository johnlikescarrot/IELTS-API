#!/usr/bin/env node
/**
 * Executable entry point: `npx ielts-api` or `node dist/bin.js`.
 * All logic lives in src/server.ts `run()` so it can be tested.
 */

import { pathToFileURL } from 'node:url';
import { run } from './server.js';

const entry = process.argv[1];
const invokedDirectly = entry !== undefined && import.meta.url === pathToFileURL(entry).href;

if (invokedDirectly) {
  void run().then((code) => {
    process.exitCode = code;
  });
}
