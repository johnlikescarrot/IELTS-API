#!/usr/bin/env node
/**
 * Verifies the determinism claim: for a representative set of requests, two
 * independently constructed applications must produce byte-identical responses.
 *
 * This is the executable form of the reproducibility guarantee described in
 * `docs/reproducibility.md`.
 */

import { createApp } from "../dist/index.js";

const TARGETS = [
  ["GET", "/", null],
  ["GET", "/health", null],
  ["GET", "/v1/meta", null],
  ["GET", "/v1/citation", null],
  ["GET", "/v1/bands", null],
  ["GET", "/v1/cefr", null],
  ["GET", "/v1/conversion", null],
  ["GET", "/v1/descriptors/writing-task-2", null],
  ["GET", "/v1/vocabulary?limit=100", null],
  ["GET", "/v1/vocabulary/random?seed=7&count=25", null],
  ["GET", "/v1/speaking/mock-test?seed=7", null],
  ["GET", "/v1/writing/tasks/random?seed=7&count=5", null],
  ["GET", "/openapi.json", null],
  [
    "POST",
    "/v1/writing/analyse",
    JSON.stringify({
      text: "However, the analysis of significant economic policy requires a formal approach. Moreover, the evidence is consistent.",
      task: 2,
    }),
  ],
];

function dispatch(app, [method, target, body]) {
  const url = new URL(target, "http://determinism.local");
  return app.handle({
    method,
    path: url.pathname,
    query: url.searchParams,
    headers: {},
    body,
  });
}

const first = createApp();
const second = createApp();
let failures = 0;

for (const entry of TARGETS) {
  const a = dispatch(first, entry);
  const b = dispatch(second, entry);
  const c = dispatch(first, entry);
  const identical = a.body === b.body && a.body === c.body;
  if (!identical) {
    failures += 1;
    console.error(`NOT DETERMINISTIC: ${entry[0]} ${entry[1]}`);
  }
  if (a.status >= 400) {
    failures += 1;
    console.error(`UNEXPECTED STATUS ${a.status}: ${entry[0]} ${entry[1]}`);
  }
}

if (failures > 0) {
  console.error(`${failures} determinism check(s) failed.`);
  process.exit(1);
}

console.log(`All ${TARGETS.length} determinism checks passed.`);
