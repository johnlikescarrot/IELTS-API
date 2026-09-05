# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2026-09-05

The skills & strategies release, researched against the community practice repository
[`ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS`][upgrade].

### Added

- **Skills & exam-format reference**: published part counts, timings, question counts, delivery rules
  and scoring notes for Listening, Reading, Writing and Speaking (`/v1/skills`, `/v1/skills/:skillId`).
- **Question-type taxonomy**: 16 machine-readable Listening/Reading question types, each with answer
  rules, a three-phase strategy playbook (anticipate / during / check), distractor patterns and common
  pitfalls (`/v1/question-types`, `/v1/question-types/:typeId`). The metadata block documents field-name
  interop with the `strategies.json` files published upstream.
- **Raw-mark to band conversion**: indicative 0-40 conversion tables for listening, academic reading and
  general training reading (`/v1/scores/raw`).
- **High-frequency topic bank**: the 50 topics that recur in recent IELTS cycles with 250 original
  collocation chunks and study prompts (`/v1/topics/reading`, `/v1/topics/reading/:topicId`).
- **Open practice content catalog**: verified structural metadata for 1,853 community lessons and full
  tests (102 + 204 listening, 1,232 + 315 reading), including per-artifact availability ranges checked
  against the upstream git tree (missing audio, missing JSON, strategies for tests 1-20 only, reading
  test 105 absent) and resolved raw/blob URLs (`/v1/catalog`, `/v1/catalog/:collectionId`,
  `/v1/catalog/:collectionId/entries/:index`). No copyrighted upstream content is redistributed.
- `UPGRADE-YOUR-IELTS-SKILLS` added to the resource catalogue.

### Changed

- Test suite grew to 368 tests with the 100%-per-file coverage gate maintained; OpenAPI, `/docs`,
  `/health` and the service index now report the new datasets.

[upgrade]: https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS

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
