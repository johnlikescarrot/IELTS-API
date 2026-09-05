# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Original reading practice: six fictional passages, 36 questions, three editorial levels,
  searchable discovery, deterministic sampling, content SHA-256 and stateless POST grading.
- Paragraph-grounded feedback, declared answer variants, word-limit enforcement and strict submission validation.
- Commit-pinned review of `ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS`, with observed inventory,
  licensing/access boundaries and no redistribution of upstream content.
- OpenAPI 3.1 validation, live reading request/response schema tests, snapshot drift checks,
  real chunked-body and disconnect regression tests, and citation metadata validation in CI.
- Research reuse, offline JSONL export and responsible citation/archival guidance.

### Fixed

- Official Super-Linter uses the repository's ESLint configuration and dependencies, scans
  `src/data` rather than accidentally excluding it, and runs from the container's workspace.
- Method-aware routing, browser POST preflight, per-path Allow headers, bounded UTF-8 JSON ingestion,
  no-store grading/errors, bodyless HEAD errors and privacy-preserving request logging.
- OpenAPI uses `{parameter}` path templates, accurate error envelopes, POST request bodies and
  a relative server URL compatible with HTTPS reverse proxies.
- Removed the placeholder DOI and invalid Citation File Format fields/types; removed unverified
  archive/publication claims and marked the manuscript as a draft.

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
