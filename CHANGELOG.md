# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Test-format and exam-technique layer**: machine-readable format blueprints of the four papers
  (`/v1/skills`, `/v1/skills/:skill`), 19 receptive question families with original exam-technique
  guides — eleven for Reading, eight for Listening (`/v1/question-types`, `/v1/question-types/:id`),
  indicative raw-score to band mappings for Listening, Academic Reading and General Training Reading
  (`/v1/scores/raw`), and the study-system catalogue of cycle, phases and CEFR ladder
  (`/v1/study-system`). Complements the v1.1.0 practice layer; all prose is original work, no
  third-party test content is reproduced (see `RESEARCH.md` §9).

## [1.1.0] - 2026-09-05

The practice release: everything a learner practises on, in citable, licensed form.

### Added

- **Graded reading dataset**: 9 original CEFR-graded passages (A2-C1, 1,700+ words) with 27
  exam-style items — one multiple-choice, one True/False/Not-given and one short-answer per passage,
  every answer carrying an explanation. Endpoints: `/v1/reading`, `/v1/reading/stats`,
  `/v1/reading/:id` (with `?answers=false` to withhold the key for self-testing).
- **Learning-strategy bank**: 24 evidence-labelled strategy cards across listening, reading, writing
  and speaking, each calibrated to a band range; research pointers name published findings and
  unsupported folklore is explicitly labelled `practitioner convention`. Endpoints: `/v1/strategies`,
  `/v1/strategies/:id`.
- **Vocabulary quiz generator**: deterministic seeded multiple-choice quizzes composed live from the
  4,174-entry dataset, forward (`word-to-meaning`) or reverse (`meaning-to-word`), optional part-of-
  speech restriction; the same seed and filters reproduce the same items years later. Endpoint:
  `/v1/quizzes/vocabulary`.
- **Study-plan generator**: a transparent, documented band-gap heuristic that allocates weekly hours
  across the four skills, rotates the focus, scales vocabulary load, schedules mock-test milestones,
  and points at real dataset items (prompts, speaking cards, passages, strategy ids). Endpoint:
  `/v1/study-plan`.
- Methodology and case-study notes in [RESEARCH.md](RESEARCH.md) §7 (design of the new modules) and
  §8 (what closed mirrors of IELTS practice content reveal about demand, and what was deliberately
  not taken from them).

### Changed

- `/`, `/health` and the OpenAPI `info` block now advertise the reading dataset, the strategy bank
  and the generators; `/docs` lists them alongside the existing datasets.
- Citation metadata (`CITATION.cff`, `codemeta.json`, `.zenodo.json`) updated for 1.1.0, including
  learning-strategy and quiz-generation keywords and three additional research references.

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

[Unreleased]: https://github.com/johnlikescarrot/IELTS-API/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/johnlikescarrot/IELTS-API/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/johnlikescarrot/IELTS-API/releases/tag/v1.0.0
