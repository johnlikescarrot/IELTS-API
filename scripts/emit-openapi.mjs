#!/usr/bin/env node
/**
 * Emits the OpenAPI document to `openapi.json` in the repository root.
 *
 * The output is formatted with the project's Prettier configuration so that the
 * emitted file is byte-identical to what the linters expect. The committed
 * document is verified in continuous integration, so the specification published
 * with each release always matches the code that serves it.
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { format } from "prettier";
import { buildOpenApiDocument, createApp } from "../dist/index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = join(root, "openapi.json");
const document = buildOpenApiDocument(createApp().routes);

const formatted = await format(JSON.stringify(document, null, 2), {
  ...(await import("prettier").then((prettier) =>
    prettier.resolveConfig(target),
  )),
  filepath: target,
  parser: "json",
});

writeFileSync(target, formatted, "utf8");
console.log(`Wrote ${target}`);
