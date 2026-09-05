# Reproducing a practice-metadata experiment

The API is free, no-auth and offline at runtime. The practice inventory is a metadata compilation,
not a content licence or a validated exercise bank. Start with the [source review](UPSTREAM-REVIEW.md).

## Parameter contract

Search, sample and export share optional `q`, `skill`, `mode`, `level` and `asset` filters:

| Parameter | Accepted values / limits                                                                      |
| --------- | --------------------------------------------------------------------------------------------- |
| `q`       | Case-insensitive substring over IDs, generated labels and asset paths; at most 200 characters |
| `skill`   | `reading`, `listening`                                                                        |
| `mode`    | `basic`, `full-test`                                                                          |
| `level`   | `a1-a2`, `b1-b2`, `c1-c2`, `basic`, `intermediate`, `advanced`, `unspecified`                 |
| `asset`   | `json`, `javascript`, `html`, `audio`, `document`, `processed-json`, `strategy`               |
| `limit`   | Search only: 1–100; default 20                                                                |
| `offset`  | Search only: 0–1,000,000; default 0                                                           |
| `seed`    | Sample only: required, nonblank, at most 128 characters                                       |
| `count`   | Sample only: 1–50; default 5                                                                  |

Text is trimmed before validation; lengths count JavaScript UTF-16 code units. Optional blank
values behave as absent. Filters combine with AND semantics and enum values are case-sensitive.
Repeated and unknown parameters produce 400 errors; missing IDs produce 404. The stats and detail
routes accept no query parameters. Task-family routes accept only `q` and an exact `type` ID.

`offset` beyond the population returns an empty page. An empty filter result is valid. Sampling
returns at most the matching population, with no repeated IDs, in canonical order. The export
accepts no pagination or sampling parameters: it emits **every** matching unit, or zero bytes for
an empty selection. The media type is `application/x-ndjson`.

## Snapshot identity

The source is `ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS` at commit
`ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c`. It is configured in
[`src/data/practice-source.ts`](../src/data/practice-source.ts).

`data/practice.json` contains:

- `schemaVersion`: the inventory format version (currently 1).
- `source`: pinned repository, commit, unknown upstream `license: null`, and `contentIncluded: false`.
- `metadataLicense`: `CC-BY-4.0` for the original compilation, not the indexed files.
- `itemsSha256`: SHA-256 over **UTF-8 `JSON.stringify(items)`, with no trailing newline**.
- `stats`: structural counts and missing sequences/audio, derived from `items`.
- `items`: one ID per collection and original unit number; representations remain grouped together.

The checksum for this snapshot is
`33d6fb0ebf65bde7212dbc232dc56f4d9a0a21f73b7d53b88b803e129023dbd2`.
Git blob identifiers in assets include Git's blob-object framing; they are not bare-file SHA-1 hashes.

## Regenerate without downloading source content

```bash
npm ci
curl -fsSL "https://api.github.com/repos/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS/git/trees/ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c?recursive=1" -o /tmp/practice-tree.json
npm run data:practice -- /tmp/practice-tree.json /tmp/practice.json
cmp data/practice.json /tmp/practice.json
```

The compiler rejects truncated or wrong-snapshot inputs, duplicate selected paths, invalid regular
file metadata and empty inventories. CI performs a fresh tree fetch and byte-for-byte comparison.
An optional GitHub token can raise GitHub's build-time rate limit; it is **not** an API access key.
No exercise text, answer keys, audio, documents, student workbook, credentials or source code are
fetched by the compiler. Do not add those materials to this repository.

## Sampling protocol

1. Pin the API code commit and the inventory checksum.
2. Record all normalised filters, the exact seed and requested count.
3. The generator hashes `itemsSha256 + ':' + seed` using the project's FNV-1a implementation over
   UTF-16 code units, then uses mulberry32 and partial Fisher–Yates selection over the filtered,
   canonically ordered population. Selected indices are sorted before returning the units.
4. Archive both the request and response, including selected IDs and the algorithm identifier
   `fnv1a-mulberry32-partial-fisher-yates-v1`.
5. Obtain any needed content rights separately. No sampled ID certifies content quality or access.

A golden regression fixture uses `skill=listening`, `mode=full-test`, `asset=audio`, count 5 and seed
`nghiên-cứu-2026`. Its IDs are `listening-full-test-0004`, `0036`, `0066`, `0074` and `0179` (the same
`listening-full-test-` prefix applies to each). Sampling is a reproducibility aid, not a
cryptographically secure randomisation service.

## Archive and verify

```bash
curl -fsS "http://localhost:3000/v1/practice/export?level=a1-a2" -o /tmp/practice.jsonl
curl -fsS "http://localhost:3000/v1/practice/stats" -o /tmp/practice-stats.json
curl -fsS "http://localhost:3000/citation.bib" -o /tmp/ielts-api.bib
npm run validate
npm run docs:check
```

Each JSON Lines record contains `schemaVersion`, `source`, `metadataLicense`, `indexSha256` and
`unit`. A filtered export does not reproduce the _whole-inventory_ checksum by itself; retain the
full inventory when independently verifying that digest. ETags validate HTTP representations, not
scientific validity, legal rights or equivalence across changed API versions.

`npm run docs:update` regenerates OpenAPI, BibTeX and the Markdown report without opening a port.
The served OpenAPI advertises `/` as its server URL, so clients use the actual public instance
rather than a sandbox-local address. Validation uses Swagger Parser and JSON Schema 2020-12 in
strict mode against real responses; these are development dependencies, not server dependencies.
