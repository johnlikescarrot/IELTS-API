# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2026-09-05

The API stops being read-only in one carefully bounded way: it will now measure **your** text, not
just serve its own. The five `/v1/analyze/*` endpoints run the passage you supply through the same
measurement pipeline that produced the published readability index, so a passage you submit and a
passage in the corpus are directly comparable numbers rather than two different tools' outputs.

Nothing here predicts a band score, and that is a design decision rather than an omission. IELTS
bands are awarded by trained examiners against the analytic descriptors; a surface-feature model
that guessed at one would be unciteable and, worse, would be believed. Every response is a
measurement with its caveats attached.

### Added

- **`GET|POST /v1/analyze/readability`** — six classical readability formulae (Flesch Reading Ease,
  Flesch-Kincaid, Gunning Fog, SMOG, Coleman-Liau, ARI) with a bibliographic citation for each, plus
  the passage's position against every measured group of the practice-test index.
- **`GET|POST /v1/analyze/vocabulary`** — lexical profile against the Cambridge IELTS 1-22 headword
  list: coverage, lexical density, type-token ratio over content words, hapax ratio, sophistication,
  and the matched and off-list forms.
- **`GET|POST /v1/analyze/cohesion`** — an inventory of the cohesive devices in a text, classified by
  the discourse relation they signal (eleven relations) and by register, with over-repetition and
  unsignalled relations called out. Longest-match-first scanning means `in addition to this` is never
  also counted as `in addition`.
- **`GET|POST /v1/analyze/writing`** — descriptor-aligned diagnostics for a Writing Task 1 or Task 2
  response: official minimum length, paragraphing, cohesion range, lexical density, Cambridge
  coverage and sentence-length variation, each mapped to the analytic criterion it bears on.
- **`GET /v1/analyze/devices`** — the cohesive-device inventory itself, browsable and filterable, so
  the classification behind the cohesion analysis is auditable rather than a black box.
- **`POST` body support** on the four text-bearing endpoints: `text/plain`, `application/json` with a
  `text` property, or a form-encoded `text` field, up to 256 KiB. A passage is routinely longer than
  a URL may safely be, and query strings end up in proxy and server logs; a body keeps the text out
  of the request line. `POST` responses are `cache-control: no-store`.
- `src/lib/text.ts`, a TypeScript port of the Python measurement pipeline, so the API and the data
  extraction scripts can never drift apart.

### Changed

- `RouteInfo` gained an optional `acceptsBody` flag; the OpenAPI document generates a matching `post`
  operation (with `413`, `415` and `422` responses) for every route that declares it, and `/docs`
  shows the accepted methods per route.
- CORS preflight and the common response headers now advertise `POST` and the `content-type` header.
- `405` responses report `allow: GET, HEAD, POST`; a `POST` to a route that does not accept a body
  still returns `405`.
- Test suite grown to 449 tests, still at 100% statement, branch, function and line coverage per file.

### Privacy

- Submitted text is analysed in process and is never stored, logged or transmitted. The request
  logger records the method, path and query string only, which is why long text belongs in a body.

## [1.1.0] - 2026-09-05

Second dataset family: the practice-test collection
[`ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS`](https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS)
is analysed, normalised and indexed. As with the research corpus, only derived metadata and
statistics are published — no passage, question, answer key, transcript or recording is
redistributed.

### Added

- **Practice-test index** (`data/practice-tests.json`, 1,702 items, 27,225 questions): structure,
  normalised question types, asset availability, upstream provenance (path, blob SHA-1, permalink)
  and passage-level readability statistics (words, sentences, type-token ratio, Flesch Reading Ease,
  Flesch-Kincaid grade) for 269 full reading tests, 201 full listening tests and 1,232 CEFR-graded
  reading lessons. Endpoints: `/v1/tests`, `/v1/tests/stats`, `/v1/tests/items`, `/v1/tests/:id`.
- **Question-type taxonomy**: the 13 canonical IELTS Reading and Listening task families, each with
  original strategy guidance, the traps it sets, its answer format, and the frequency observed in the
  indexed corpus; 65 upstream free-text labels are normalised onto it. Endpoints:
  `/v1/question-types`, `/v1/question-types/:id`.
- **Exam themes**: 50 recurring themes in 11 groups with original keyword sets (`/v1/topics/themes`).
- `scripts/extract_practice_tests.py`: standard-library-only, deterministic extraction of the index
  from an upstream tree listing and a local checkout.
- `RESEARCH.md` Part II: the collection analysis, the label-normalisation table, the question-type
  distribution by paper, the readability findings (CEFR tiers are ordered correctly but calibrated
  far too hard) and the threats to validity that apply to them.

### Changed

- `/` and `/health` report the practice-test dataset sizes; `/docs` lists the new datasets.
- The OpenAPI document, the README dataset table and the endpoint index cover the new routes.
- Test suite grown to 341 tests, still at 100% statement, branch, function and line coverage per file.

### Fixed

- super-linter now installs the project's dependencies before it runs: version 8 lints TypeScript
  with this repository's own `eslint.config.js`, which cannot be loaded unless the packages it
  imports are resolvable, so the job failed before checking a single file.
- The whole tree is clean under super-linter 8 again: an unused shell loop variable (SC2034),
  Markdown and BibTeX indentation that editorconfig-checker rejected, the JOSS paper's top-level
  section headings (MD025), and the two Checkov OpenAPI policies that assume every API
  authenticates its callers — recorded, with the reason, in `.checkov.yaml`.

## [1.0.0] - 2026-09-04

First citable release.

### Added

- **Vocabulary dataset**: 4,174 headwords (4,310 occurrences) extracted from the Cambridge IELTS
  volumes 1-22 word lists, with phonetics, part-of-speech-tagged senses, morpheme hints and volume
  provenance. Endpoints: `/v1/vocabulary`, `/v1/vocabulary/stats`, `/v1/vocabulary/random`,
  `/v1/vocabulary/daily`, `/v1/vocabulary/:word`.
- **Band data**: the 0-9 band scale with indicative CEFR levels (`/v1/bands`), 120 condensed analytic
  band descriptors across Speaking, Writing Task 1 and Writing Task 2 (`/v1/bands/descriptors`), and
  per-band lookup (`/v1/bands/:band`).
- **Scoring**: overall-band calculation with the IELTS rounding rule (`/v1/scores/overall`),
  IELTS-to-other-scale conversion for CEFR, TOEFL iBT, Cambridge English Scale, PTE Academic and the
  Duolingo English Test (`/v1/scores/convert`), and the reverse mapping (`/v1/scores/interpret`).
- **Task banks**: 111 Writing Task 2 prompts (`/v1/topics/writing`), 80 Speaking items across Parts
  1-3 (`/v1/topics/speaking`), 10 Writing Task 1 families (`/v1/tasks/writing`).
- **Research corpus index**: metadata and statistics for the 76 IELTS-relevant files of the 404-file
  upstream corpus (`/v1/corpus`, `/v1/corpus/stats`, `/v1/corpus/items`).
- **Resource catalogue**: 27 preparation resources, restricted to free, login-free ones
  (`/v1/resources`).
- **Service endpoints**: `/`, `/v1`, `/health`, `/docs`, `/openapi.json`.
- Deterministic responses: ETags, conditional-request support, gzip compression, open CORS, seeded
  sampling.
- Reproducible data pipeline in `scripts/` (standard library only).
- Citation metadata: `CITATION.cff`, `codemeta.json`, `.zenodo.json`, `paper/paper.md`.
- 100% coverage gate, super-linter on push / pull request / weekly, CI on Node 20 and 22.

[Unreleased]: https://github.com/johnlikescarrot/IELTS-API/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/johnlikescarrot/IELTS-API/releases/tag/v1.2.0
[1.1.0]: https://github.com/johnlikescarrot/IELTS-API/releases/tag/v1.1.0
[1.0.0]: https://github.com/johnlikescarrot/IELTS-API/releases/tag/v1.0.0
