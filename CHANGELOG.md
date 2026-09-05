# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Text analytics** (`/v1/analyze/*`), the first endpoints that accept `POST` as well as `GET`:
  - `/v1/analyze/text` — Flesch Reading Ease, Flesch-Kincaid Grade Level, Gunning Fog, SMOG,
    Coleman-Liau, the Automated Readability Index and a consensus grade; type-token ratio, root TTR
    (Guiraud), log TTR (Herdan's C), the Maas index, MTLD, hapax legomena and lexical density;
    sentence-length statistics; and a frequency distribution.
  - `/v1/analyze/cohesion` — 48 cohesive devices grouped into 7 discourse functions.
  - `/v1/analyze/essay` — a deterministic, fully published surface-feature rubric that returns an
    indicative band per dimension together with the evidence that produced it, plus actionable
    suggestions. Explicitly not an IELTS score.
  - `/v1/analyze/vocabulary` — coverage of a text against the Cambridge IELTS 1-22 word lists.
- `POST` support in the dispatcher: bodies up to 256 KiB, JSON (`{"text": ...}`) or plain text,
  `413` beyond the limit, `no-store` on analysis responses, and `405` when a path exists but not for
  the requested method.
- New public library exports: `src/lib/text.ts` and `src/lib/essay.ts`.

### Changed

- CORS now advertises `POST` and the `content-type` request header.
- The OpenAPI document keys operations by method, so a path can document both `GET` and `POST`, and
  documents the `405` and `413` responses.

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
