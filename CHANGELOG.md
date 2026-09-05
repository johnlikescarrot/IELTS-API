# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2026-09-05

Study-planning layer: the API moves from describing preparation material to sequencing it. The design
was informed by the structure of open learner study-notebooks — most directly
[`Oxidaner/ielts`](https://github.com/Oxidaner/ielts), whose folders organise preparation by the four
tested skills plus collected exam experience (经验). No content from that repository (or from the
third-party commercial files it mirrors) is redistributed: the activity catalogue, the study-time
model and the drills are all original artefacts of this project, and the catalogue documents the
same four-skill-plus-experience taxonomy in English.

### Added

- **Study-activity catalogue** (`/v1/plan/activities`): 26 original activities across listening,
  reading, writing, speaking and general exam experience, each tagged with a band range, the plan
  phases it suits, timed steps, and — where useful — an endpoint template that materialises the
  session's material from this API's own datasets.
- **Deterministic study-plan engine** (`/v1/plan`): a pure, seeded generator that shares a weekly
  minute budget across the four skills in proportion to their band gaps (five-minute granularity,
  largest-remainder rounding, budget exactly conserved), sequences the four plan phases across the
  weeks, funds a 15-minute weekly error-log review and a full mock examination out of the largest
  skill budget, and emits fully materialised per-session endpoints. Identical parameters always
  produce byte-identical plans, so a generated plan is citable and reproducible from its inputs.
- **Study-time feasibility model** (`/v1/plan/estimate`): indicative hours per half-band that grow
  with the current band (100/140/200/280/360), reported overall and per skill with an explicit
  "planning heuristic, not a score prediction" caveat.
- **Seeded vocabulary quizzes** (`/v1/quiz`): three drill formats (word-to-definition,
  definition-to-word, spelling cloze) generated from the Cambridge IELTS 1-22 vocabulary dataset
  with same-part-of-speech distractors; the answer key can be withheld (`answers=omit`) for test
  delivery, and a quiz is reproducible from its seed.
- Library exports for all of the above (`buildStudyPlan`, `estimateFeasibility`,
  `normalizeStudyPlanInput`, `skillAllocations`, `hoursPerHalfBand`, `generateQuiz`,
  `STUDY_ACTIVITIES`, `activitiesFor`, `activityStats`), so researchers can run the engine offline
  without the HTTP layer.

### Verification

- 399 tests; the 100% per-file coverage gate still passes.
- `/openapi.json` and `/docs` pick the new endpoints up automatically from the live route table.

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

[Unreleased]: https://github.com/johnlikescarrot/IELTS-API/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/johnlikescarrot/IELTS-API/releases/tag/v1.2.0
[1.1.0]: https://github.com/johnlikescarrot/IELTS-API/releases/tag/v1.1.0
[1.0.0]: https://github.com/johnlikescarrot/IELTS-API/releases/tag/v1.0.0
