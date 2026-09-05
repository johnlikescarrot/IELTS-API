# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.3.0] - 2026-09-05

The **assessment layer**: the API's first capability that produces a band score, and a fourth
upstream collection that shows exactly what such scores are pointed at — the homework archive of a
real IELTS preparation cohort. The API remains free, GET-only, authentication-free and
dependency-free.

### Added

- **Writing assessor** (`GET /v1/assess/writing`): a transparent heuristic band estimate for any
  Task 1 or Task 2 writing sample. Four criteria (Task Achievement / Task Response, Coherence and
  Cohesion, Lexical Resource, Grammatical Range and Accuracy) each start from a published baseline
  of 6.5 and move in half-band steps through a fixed catalogue of 25 threshold rules; estimates
  clamp to [4.0, 8.0] and combine into an overall estimate with the official IELTS rounding rule
  (.25/.75 means round up). The response names every rule that fired, the observation that
  triggered it and its effect, publishes every measurement behind them (including two new ones:
  distinct discourse markers and complex-sentence share over a published 23-marker subordination
  list), places the sample against the corpus readability groups, and carries a disclaimer in every
  response. Identical requests produce byte-identical estimates.
- **Assignment-archive index** (`data/assignments.json`, 26 documents): a derived, non-substitutive
  index of the `Assignments/` tree of [`msneloy/IELTS`](https://github.com/msneloy/IELTS) — one
  month of homework writing (August 2022) from a real preparation cohort: 24 submissions (20
  Task 1, 4 Task 2) by four pseudonymised learners across seven visual genres, plus two
  teacher-authored documents. Per document: date, task, genre, learner label, measured surface
  statistics (words, sentences, paragraphs, mean sentence length, sentence-length spread,
  type-token ratio, long-word share, Flesch Reading Ease, Flesch-Kincaid grade, discourse-marker
  density) and upstream provenance (path, blob SHA-1, permalink, snapshot commit). No essay, answer
  key or prompt is redistributed. Endpoints: `/v1/assignments`, `/v1/assignments/stats`,
  `/v1/assignments/items`.
- `scripts/extract_assignments.py`: standard-library-only, deterministic extraction with a
  published three-stage genre classifier and a fixed learner-pseudonymisation table.
- `RESEARCH.md` Part V: the archive analysis, the index construction, the assessment design (all
  25 rules with thresholds and effects) and the threats to validity.
- CI now validates the assignment index for internal consistency on every run.

### Changed

- `/`, `/health`, `/docs` and `/openapi.json` report the new endpoints and dataset; the service
  index adds the assignment counts.
- `CITATION.cff`, `codemeta.json` and the README citation block cite version 1.3.0; keywords now
  include writing assessment, automated scoring and learner corpus.
- Test suite grown to 515 tests, still at 100% statement, branch, function and line coverage per
  file.

## [1.2.0] - 2026-09-05

Two additions in one release: the **toolkit** — the first capabilities that consume text as well as
publish it — and the **strategy layer**, a third dataset family.

The toolkit adds two deterministic text analysers and a study planner that composes every existing
dataset into a week-by-week schedule. The strategy layer indexes a self-study materials collection
([`Oxidaner/ielts`](https://github.com/Oxidaner/ielts)) the same way as the research corpus — derived
metadata and statistics only, nothing redistributed — and adds an original response-framework
taxonomy that gives the productive papers what the question-type taxonomy gives the receptive ones.
The API remains free, GET-only, authentication-free and dependency-free.

### Added

- **Readability analyser** (`GET /v1/tools/readability`): Flesch Reading Ease and Flesch-Kincaid
  grade for any text (up to 4,000 characters) with the full counts behind them, an interpretive
  label, and a corpus context that places the text next to the group means published by
  `/v1/tests/stats` (full reading tests 43.5, graded lessons `A1-A2` 70.2, `B1-B2` 26.0,
  `C1-C2` 5.0).
- **Essay profiler** (`GET /v1/tools/essay-profile`): type-token ratio, Guiraud's root TTR,
  long-word share, sentence-length spread, discourse-marker density, coverage against the 4,174
  Cambridge headwords and recurring-theme detection through the Part II keyword sets, mapped onto
  heuristic hints phrased after the four Writing band-descriptor criteria. Every threshold is
  published and every hint names its numbers.
- **Study planner** (`GET /v1/study/plan`): deterministic week-by-week plans from a target band,
  optional component scores (defaulting to target − 1.5), a weekly hour budget and a vocabulary
  rate. Gaps are weighted into hours, weeks are split into foundation, practice and polish phases,
  and every week links to the endpoints that supply its material: question-type drills, graded
  reading at the corpus-calibrated level, Task 2 categories, rotating speaking topics, two themes
  per week, quarterly full mocks and a final review. Identical requests produce byte-identical
  plans.
- **Study-materials index** (`data/materials.json`, 2,354 of 2,385 files indexed): a metadata index of
  what candidates actually collect while preparing — past-paper recall banks ("jijing"), question
  banks, scenario vocabulary, essay templates, idea banks, methodology notes, mock-practice packages
  and saved reading-passage websites — classified by category, skill and format, with upstream
  provenance (path, blob SHA-1, permalink). Endpoints: `/v1/materials`, `/v1/materials/stats`,
  `/v1/materials/items`.
- **Response frameworks**: 12 original frameworks for Writing Task 2 (one per question family,
  including the concession–rebuttal variant) and Speaking Parts 2–3 (long-turn spines and Part 3
  development frames), each with ordered stages, purpose statements, concrete moves, cue language and
  pitfalls, cross-linked to `/v1/topics/writing` and `/v1/topics/speaking`. Endpoints:
  `/v1/frameworks`, `/v1/frameworks/:id`.
- `scripts/extract_materials.py`: standard-library-only, deterministic extraction of the materials
  index from a GitHub tree listing; reproducible in CI.
- `RESEARCH.md` Part III (toolkit methodology, measurement definitions, threats to validity of
  surface heuristics) and Part IV (materials collection, classification rules, framework taxonomy).
- The service index, `/health`, `/docs` and `/openapi.json` now report the new capabilities and
  datasets.

### Changed

- `CITATION.cff`, `codemeta.json` and the README citation block cite version 1.2.0; the keyword
  lists now include text analysis, lexical diversity, study planning and response frameworks.
- Test suite grown to 469 tests, still at 100% statement, branch, function and line coverage per
  file.

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

[Unreleased]: https://github.com/johnlikescarrot/IELTS-API/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/johnlikescarrot/IELTS-API/releases/tag/v1.1.0
[1.0.0]: https://github.com/johnlikescarrot/IELTS-API/releases/tag/v1.0.0
