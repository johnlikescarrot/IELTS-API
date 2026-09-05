# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Pinned Reading/Listening practice metadata: 1,852 units, 4,606 asset records, stable IDs,
  completeness statistics, search, required-seed sampling, and JSON Lines export.
- Independently authored guidance for 11 Academic Reading and 6 Listening question families.
- A full HTML technical-report draft (`/research`), reusable BibTeX (`/citation.bib`), a detailed
  upstream audit, and reproducibility/publication instructions.
- Strict OpenAPI 3.1 and JSON Schema contract tests, an offline TypeScript metadata compiler,
  regenerated artifact checks, CFF schema validation, and Node 24 CI coverage.

### Fixed

- Bound practice and task-guide response arrays in OpenAPI to their actual limits and
  regression-test both the boundary and overflow. Address the CI smoke loop's ShellCheck warning.
- Include code/data licensing and citation metadata in the Docker runtime image, not only npm archives.

- Parse request targets inside the error boundary with a trusted base. Malformed URLs/encoded IDs
  return 400 instead of escaping or becoming 500; error responses are non-cacheable and bodyless for HEAD.

- OpenAPI path templates, raw representation media types, and error envelopes; include service
  routes and advertise a relative server URL suitable for reverse-proxied instances.
- Remove a placeholder DOI, invalid CFF fields/reference types, unverified archive/publication
  claims, and an unverified npm quick-start command. Include DATA-LICENSE in package artifacts.
- Repair Super-Linter workspace/configuration handling, JSON validation, diagnostic permissions,
  and source-data filtering. Keep security checks enabled with two explicit no-auth policy
  exceptions; align Markdown indentation checks with its syntax.

## [1.0.0] - 2026-09-04

Initial 1.0.0 code snapshot. A published release and archive DOI have not been verified.

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

[Unreleased]: https://github.com/johnlikescarrot/IELTS-API/compare/5b615ed55dffa9ae638a37bc82dc8661c4fd85d0...HEAD
[1.0.0]: https://github.com/johnlikescarrot/IELTS-API/tree/5b615ed55dffa9ae638a37bc82dc8661c4fd85d0
