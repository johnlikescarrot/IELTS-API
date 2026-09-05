# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added (1.1.0 development)

- Pinned metadata-only Reading/Listening inventory: 1,852 units, 4,707 assets, transparent
  completeness policy, stable path-derived IDs and SHA-256-verifiable exports.
- Six free/no-auth `/v1/practice` endpoints for discovery, statistics, filtered search, lookup,
  deterministic sampling and complete archival export. No upstream exercise content is served.
- Offline TypeScript extractor, generated HTML research draft at `/research`, detailed source audit
  and data card, synthetic fixtures, live JSON Schema contract tests and byte-for-byte snapshot tests.
- CI checks for practice reproduction, CFF and OpenAPI validity; Node 24 test coverage.

### Fixed

- OpenAPI now uses `{parameter}` paths, the actual error envelope, explicit no-auth security,
  unique operation IDs and a relative server URL that works behind HTTPS proxies.
- Removed a placeholder DOI and invalid CFF fields/types; corrected unsupported Zenodo deposit
  claims and documented third-party licensing limitations.
- Malformed URLs/Host headers and percent-encoded path parameters return 400 instead of escaping
  the request handler or becoming 500s. CORS preflights permit ETag requests; all representations
  declare encoding variance for shared caches.
- Super-Linter uses pinned Actions, installed ESLint dependencies and the repository's flat config;
  the generated-data exclusion no longer hides `src/data/*.ts`.
- Release workflow generates/verifies documentation before attaching it, and packages include
  DATA-LICENSE and research documentation.

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

[Unreleased]: https://github.com/johnlikescarrot/IELTS-API/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/johnlikescarrot/IELTS-API/releases/tag/v1.0.0
