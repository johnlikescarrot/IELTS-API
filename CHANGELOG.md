# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Text analysis** — three endpoints that turn a submitted text into reproducible measurements,
  all pure functions of their input:
  - `/v1/analysis/readability`: six classical readability formulas (Flesch Reading Ease,
    Flesch-Kincaid, Gunning Fog, SMOG, Coleman-Liau, Automated Readability Index), each citing the
    publication it implements, plus a grade-level consensus.
  - `/v1/analysis/lexical`: type-token ratio with its length-corrected variants (root, corrected and
    moving-average TTR), content-word ratio, word repetition, and coverage against the Cambridge
    IELTS 1-22 headword list.
  - `/v1/analysis/essay`: mechanical checks on a Writing Task response against published
    requirements — word count, paragraphing, sentence length and variety, cohesive devices and
    lexical repetition — each labelled `pass`/`warning`/`fail` with the rule it applies. Explicitly
    not a band score; every response carries a `disclaimer`.
- A single documented text segmentation (`src/lib/text.ts`) shared by every metric, so results are
  recomputable by hand and stable across releases.
- `headwordSet()` — memoised lower-cased Cambridge headword lookup, keeping analysis linear in the
  length of the submitted text.

### Changed

- Requests to the analysis endpoints are capped at 5,000 characters and rejected with `422` rather
  than truncated, so a caller is never given a score for only part of their text.

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
