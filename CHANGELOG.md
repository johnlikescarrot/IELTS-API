# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.4.0] - 2026-09-05

The **test-centre layer**: the API can now score a mock paper and assemble a full mock exam. The
design follows the loop a test centre implements — pick a paper, sit it under the official timings,
count correct answers, convert marks to bands, compute the overall — but publishes the durable,
citable parts as data instead of page-local state. Nothing is copied from any client-side test-centre
project: the format reference and the guidance text are original compilations, and the conversion
tables are derived numbers with provenance.

### Added

- **Raw-score conversion tables** (`src/data/rawScores.ts`, `/v1/scores/raw`, `/v1/scores/raw/tables`):
  the partners' published raw-to-band guidance for the 40-question receptive papers, as three
  machine-readable tables — one Listening table shared by both modules, separate Academic and
  General Training Reading tables. Every row appears identically in at least two independent
  reproductions; rows below band 3.0 are omitted because published tables diverge there, and the API
  returns `band: null` instead of inventing a number. Each conversion names the matched range and
  the margins to the neighbouring bands (`oneBandAhead`, `oneBandBehind`).
- **Exam format reference** (`/v1/exams`): the official four-paper format as data — 30 min Listening
  (+10 min paper-based transfer), 60 min Reading, 60 min Writing (Task 1: 20 min / 150 words, Task 2:
  40 min / 250 words), 11-14 min Speaking — with part contexts and the commonly published Reading
  splits (13/13/14 Academic, 14/13/13 General Training), flagged as varying by paper.
- **Deterministic mock-exam blueprint** (`/v1/exams/blueprint`): `module`, `date`, optional `target`
  and `seed` produce a byte-identical session — the official format, a question-type mix allocated
  from the practice-corpus frequencies by the largest-remainder method (always exactly 40
  questions), one linked listening paper, graded reading lessons matched to the target CEFR band,
  an original Task 1 family and Task 2 prompt, Speaking Parts 1-3, and the scoring path from raw
  marks to the overall band.
- `src/lib/exam.ts`: pure blueprint and format builders; `allocateQuestions` (largest-remainder) is
  exported and unit-tested in isolation.
- `RESEARCH.md` Part VI: provenance of the tables, the row-by-row cross-check protocol, the
  blueprint construction, what is deliberately not published, threats to validity and reproduction
  steps.
- `README.md`, `paper/paper.md` and `CITATION.cff` describe the test-centre layer; the service
  index and `/health` now report the number of raw-score tables.

### Changed

- Test suite grown to 539 tests, still at 100% statement, branch, function and line coverage per
  file, zero runtime dependencies.
- `CITATION.cff`, `codemeta.json`, `.zenodo.json` and `paper/paper.bib` cite version 1.4.0 and the
  partners' scoring guidance used for the conversion tables.

## [1.3.0] - 2026-09-05

The **archive layer**, a fourth dataset family: the API now indexes what IELTS preparation material
looks like before anyone curates it. The upstream collection
([`msneloy/IELTS`](https://github.com/msneloy/IELTS)) is a 5.4 GB, licence-less personal archive —
rips of the Cambridge IELTS 1-18 listening audio, the audio of five companion courses, the twelve
British Council "Sample Academic Reading" task PDFs, and a teacher's folder of marked student
writing. As with every other family, only derived, non-substitutive metadata and statistics are
published. The API remains free, GET-only, authentication-free and dependency-free.

### Added

- **Grey-literature archive index** (`data/archive.json`, 555 of 557 upstream files indexed): every
  file classified into nine canonical collections with normalised titles, byte sizes, blob SHA-1
  provenance and permalinks. Endpoints: `/v1/archive`, `/v1/archive/stats`, `/v1/archive/volumes`,
  `/v1/archive/volumes/:id`, `/v1/archive/items`, `/v1/archive/:id`.
- **The media-archaeology table** (`/v1/archive/volumes`): one row per Cambridge IELTS volume with
  its naming scheme (`cassette-side` → `cd-track` → `test-section`), the media era it implies, track
  and byte totals, the listening tests recoverable from the file names (7 of 17 audio volumes),
  completeness (14 of 18 volumes hold a full four-test audio set; volume 18 is a cover image only),
  and watermark provenance (vendor tracks in volumes 4 and 5, a channel credit across volume 16).
  The folder that calls itself "1 TO 17" in fact contains volumes 1-18, and the index says so.
- **Official sample tasks, measured**: the twelve British Council sample PDFs mapped onto the
  canonical question-type taxonomy (8 distinct types) with passage-level readability computed by the
  same formulas as the practice-test index. The samples sit at full-test difficulty — median Flesch
  Reading Ease 41.5 against the full-reading-test corpus mean of 43.5. Question counts are
  deliberately not published: the PDF text layer scrambles question numbers, and a number that
  cannot be trusted is left visibly `null`.
- **Learner assignment log**: 33 files of a study group's marked writing (5-27 August 2022) — 24
  essays by four named learners across eight Writing task types (7,458 words total), 7 prompt
  images, one answered grammar exercise and one Task 2 prompt list — each essay published as eleven
  derived statistics, never as text.
- `scripts/extract_archive.py`: deterministic extraction from the upstream tree; standard library
  except for a pinned `pypdf` (6.17.0) needed for the twelve sample PDFs. The readability formulas
  are imported from `scripts/extract_practice_tests.py`, so the two datasets stay comparable by
  construction. CI downloads the 38 document blobs it needs by blob SHA and re-derives the index
  byte-identically on every run.
- `RESEARCH.md` Part V: archive composition, the naming-scheme analysis, sample measurement, essay
  profiling methodology and the threats to validity (multi-draft files, margin notes, name-based
  classification, bytes-are-not-duration).
- The service index, `/health`, `/docs` and `/openapi.json` now report the archive datasets.

### Changed

- `CITATION.cff`, `codemeta.json` and the README citation block cite version 1.3.0; the keyword
  lists now include learner corpus, grey literature and listening comprehension.
- Test suite grown to 502 tests, still at 100% statement, branch, function and line coverage per
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
