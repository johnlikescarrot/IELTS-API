# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **High-Frequency Theme Bank (`/v1/themes`, `/v1/themes/:id`)**: 50 curated themes across 11 master groups (Education, Environment, Technology, Society & Culture, Health, Work, Government & Law, Media, Globalisation, Science & Arts, Family & Youth) equipped with subtopics, core keywords, and authentic Writing Task 2 prompts.
- **Task-Family Strategy Guides (`/v1/strategies`, `/v1/strategies/:id`)**: 17 comprehensive strategy guides covering 11 Academic Reading question types and 6 Listening question types, alongside a 6-step active learning methodology.
- **Practice Curriculum Catalogue (`/v1/practice`, `/v1/practice/summary`, `/v1/practice/:id`)**: 1,852 verified practice units catalogued from `UPGRADE-YOUR-IELTS-SKILLS` (Reading Basic A1-A2, B1-B2, C1-C2; Listening Basic; Reading Full Tests; Listening Full Tests).
- **Raw Score to Band Conversion (`/v1/scores/raw-to-band`)**: Comprehensive 40-question score conversion tables and query calculator for Academic Reading, General Training Reading, and Listening.
- **Dataset Manifest & Integrity Verification (`/manifest.json`, `docs/manifest.json`)**: Deterministic SHA-256 cryptographic digests generated across all core dataset files.
- **Extended Test Suite & 100% Coverage**: 34 test files, 344 unit tests with 100% statement, branch, function, and line coverage enforced.
- **Enhanced CI & Super-Linter Workflows**: Multi-node CI matrix (Node.js 20.19.0 & 22.x), strict path-based Super-Linter workflow with ESLint 9 flat config, and manifest verification.

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
