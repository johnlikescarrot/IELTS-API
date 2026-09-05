# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Raw-score conversion** for the two objectively marked papers (`/v1/scores/raw`,
  `/v1/scores/tables`). Exhaustive tables over 0-40 correct answers for Listening, Academic Reading
  and General Training Reading. Every row records whether its boundary is `published` (reproduced
  from agreeing public sources) or `extrapolated`, and rows where public tables materially disagree
  carry the competing boundary, so a study can report its sensitivity to the choice of table.
  Responses also report the marginal number of further correct answers needed for the next half
  band.
- **Listening and Reading question-type taxonomy** (`/v1/questions`, `/v1/questions/:id`): all 17
  types (6 Listening, 11 Reading) with the construct each measures, its answer format, whether its
  answers follow the order of the text, and original strategy and pitfall notes. This closes the
  gap the previous release acknowledged: the API no longer covers only the productive skills.
- **Test-format blueprints** (`/v1/format`, `/v1/format/:module`) for all six papers, with
  part-level item counts, timings, register and focus, resolved together with the question types
  and conversion table that apply to each paper.
- **Citation export** (`/v1/citation`) in nine formats — BibTeX, RIS, CSL-JSON, APA, MLA, Chicago,
  Harvard, EndNote and plain text — served verbatim with the content type each reference manager
  expects, plus `?upstream=true` to cite the corpus this work derives from. All formats are
  rendered from one canonical record, so no two surfaces can disagree.
- **Scholarly discovery surface**: `/paper` (landing page with Highwire Press `citation_*` tags,
  Dublin Core, Open Graph and a schema.org JSON-LD graph, with the abstract visible without
  interaction and references as a numbered list), `/paper.pdf` (full text as a real PDF generated
  with zero dependencies and linked by `citation_pdf_url`), `/robots.txt` and `/sitemap.xml`.
- **A dependency-free PDF writer** (`src/lib/pdf.ts`): base-14 Helvetica metrics, greedy line
  breaking, automatic pagination and a hand-built cross-reference table. Output is pure ASCII and
  byte-for-byte reproducible, so the PDF is served under a stable ETag.

### Changed

- `/docs` now emits a schema.org `WebAPI` node and defers citation to `/paper`. It deliberately
  does **not** carry Highwire tags: duplicating them would make Google Scholar treat the
  documentation as a second, competing record of the same work and split its citations.
- `/` and `/health` report the two new dataset sizes; `/` links the paper, the PDF and the citation
  endpoint.
- The OpenAPI document describes the ten new operations and excludes the non-JSON paths.

### Fixed

- JSON-LD blocks are now serialised with `<`, `>` and `&` escaped as JSON `\u` sequences. Embedding
  a raw `</script>` in any bibliographic field could previously break out of the script element.

### Security

- HTML escaping and JSON-LD serialisation moved into a single reviewed module (`src/lib/html.ts`)
  shared by every rendered page.

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
