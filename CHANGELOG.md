# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.5.0] - 2026-09-07

The **retention layer**: the API now publishes the spaced-repetition schedules IELTS vocabulary
applications actually run, and scores them against the forgetting curve they all invoke. Every one of
those applications ships a review schedule justified with the same three words — "the Ebbinghaus
forgetting curve" — and almost none of them cites it or agrees with the next one. The upstream
surveyed for this release ([`Iamdacai/ielts-vocab-system`](https://github.com/Iamdacai/ielts-vocab-system),
a deployed WeChat mini-programme with a Node/SQLite backend serving two IELTS word lists) contains
_two_ schedules that disagree with each other at every stage, and replaced one of them in March 2026
with a third that agrees with neither. This release records all three as data, alongside four
published schedules from the literature, and measures the disagreement exhaustively. The API remains
free, GET-only, authentication-free and dependency-free.

### Added

- **The schedule catalogue** (`GET /v1/retention/schedules`): seven review schedules from four design
  lineages — the two schedules of the deployed IELTS application plus the array that replaced one of
  them, the Leitner five-box system (1972), SuperMemo 2 at default ease (1987), Anki's shipped deck
  defaults, and Pimsleur's eleven-step graduated interval recall (1967). Each carries the unit its
  source states the intervals in, the year, a URL at which the interval list can be verified, and a
  terminal rule describing what the schedule does past its published intervals (`repeat-last`,
  `multiply`, `mastery-scaled`).
- **The forgetting curve, refitted on every request** (`GET /v1/retention/curve`): Ebbinghaus's own
  retention equation, `b = 100k / ((log10 t)^c + k)` with `k = 1.84` and `c = 1.25`, published
  together with the seven savings observations he fitted it to. The API recomputes the residuals on
  every request: the largest is 3.29 percentage points and the root-mean-square error is 1.71, which
  the test suite asserts. Quoting "the Ebbinghaus curve" is now checkable against the curve.
- **Predicted-retention scoring**: every schedule is scored by evaluating the curve at each of its
  reviews, and summarised by the **coefficient of variation** of the resulting retentions rather
  than their mean — a schedule designed around a constant target retention drives it towards zero,
  and one assembled from round numbers does not. The consolidation assumption the scoring needs is
  exposed as `growth`, reported in the `meta` of every scored response, and can be removed entirely
  with `growth=1`.
- **Measured disagreement between schedules** (`GET /v1/retention/compare`): the same exhaustive
  treatment the raw-score tables get. The two arrays that shipped in the deployed application before
  and after March 2026 agree at **0 of 8** reviews and diverge by up to **30 days**; Leitner and the
  current deployed array agree at 3 of 5. Rows where only one schedule publishes an interval are
  reported as `null` rather than guessed, and excluded from the agreement rate.
- **Workload simulation** (`GET /v1/retention/workload`): the question a schedule never answers.
  Twenty new words a day under the current deployed schedule settles at **180 items a day** once the
  pipeline fills, on day 110. The simulation is exact rather than sampled and costs
  `O(days x reviews)`, and it reports the closed-form steady state
  `newPerDay x daysPerWeek x (1 + reviews) / 7` alongside the day-by-day timeline.
- **Coverage and deadlines** (`GET /v1/retention/coverage`): how long a word list takes to introduce
  and, separately, how long it takes to _mature_. The 4,464-word Cambridge list the deployed
  application ships takes 224 days to introduce at twenty words a day and **334 days to mature**; a
  60-day deadline would need 75 new words a day and still would not mature in time.
- **The word lists** (`GET /v1/retention/libraries`): the three lists these schedules are pointed at,
  with their published sizes — the deployed application's Cambridge 1-18 (4,464 headwords), Liu
  Hongbo's scene-grouped _IELTS Vocabulary Zhenjing_ (3,674 headwords across 22 scene groups, whose
  published per-scene sizes sum exactly to the published total), and this API's own Cambridge 1-22
  extraction computed live from `data/vocabulary.json`. The response says plainly that the three
  counts are not comparable, because none of the sources states its lemmatisation.
- **The deployed mastery rule** (`GET /v1/retention/mastery`): the reinforcement rule the application
  feeds its mastery-scaled schedule with, replayed over any sequence of answers. Its reward and
  penalty are asymmetric and the asymmetry is undocumented upstream: one wrong answer costs exactly
  1.6 correct answers at the same confidence, so mastery is stable at an accuracy of 61.54%.
- **A dated review calendar** (`GET /v1/retention/plan`), to the second, for any schedule and any
  learning date; with `examIn`, it reports the Cepeda et al. (2008) optimal-gap band beside the fixed
  schedule, which is the one result in the literature no fixed interval list can express.
- `RESEARCH.md` Part VIII: the missing-schedule problem, the field survey of the deployed
  application, the construction of the catalogue, the retention scoring and its sensitivity to the
  consolidation assumption, the disagreement survey, the workload analysis, and the threats to
  validity.
- CI now verifies the transcription rather than a derivation: it downloads the two upstream files the
  deployed schedules were read from and fails if the interval arrays this repository publishes are no
  longer present in them verbatim.
- The service index, `/health`, `/docs` and `/openapi.json` now report the retention layer.

### Changed

- `/health` now returns a body above the gzip threshold, so it is compressed for clients that accept
  gzip. Behaviour is unchanged for clients that do not.

## [1.4.0] - 2026-09-05

The **scoring layer**: the API now converts a raw score into a band, and publishes the tables it uses
to do it. IELTS marks Listening and Reading out of 40 and converts to the nine-band scale with a
lookup table it does not publish — only the average marks scored at whole bands, with the warning
that the precise thresholds "vary slightly from test version to test version". A de facto table
circulates instead, copied inline into preparation software without provenance. This release
publishes that table once, as a citable artefact, validated against every figure IELTS does publish.
The API remains free, GET-only, authentication-free and dependency-free.

The **test-centre layer**, a fifth dataset family: the API now indexes an operational IELTS
mock-exam platform rather than a folder of files. The upstream
([`wanli4473/yysd-testcenter`](https://github.com/wanli4473/yysd-testcenter)) is the repository
behind the YYSD IELTS online mock-exam test center - a static exam front end, an Express/SQLite
account-and-scoring API, and 377 self-marking HTML papers under an auto-rebuilt content manifest,
including an unbroken Cambridge 4-21 across all three papers (220 volume-bearing papers plus two
teacher-made secret-set reading mocks). As with every other family, only derived, non-substitutive
metadata and statistics are published.

### Added

- **Raw-score conversion** (`GET /v1/scores/raw`): a raw score out of 40 to a band, with the band's
  raw-score range, the marks still needed for the next band, a `sensitivity` block reporting the band
  at one mark fewer and one mark more, and optional progress towards a `target` band. `module` is
  required and has three values — `listening`, `reading-academic`, `reading-general` — with no
  default and no inference.
- **The three conversion tables** (`GET /v1/scores/raw/tables`), each carrying the official average
  marks it is validated against. All twelve published anchors fall inside the row the table assigns
  to them; the rows partition 0-40 exactly; General Training never scores above Academic at any raw
  score. Every table is labelled `indicative-consensus`, never "official".
- **Measured disagreement between sources**: three alternative published tables are recorded in full,
  and the API computes exhaustively — over all 41 raw scores — where each disagrees with the
  consensus (agreement 97.6%, 87.8% and 53.7%). Modern sources agree almost perfectly from band 5.5
  up and diverge in the tail below band 4.5.
- **Short-section rescaling** (`outOf`): a drill of fewer than 40 questions is rescaled
  proportionally, and the response says so — one mark on a 10-question section moves the scaled
  score by four, and rescaling is not equating.
- `RESEARCH.md` Part VI: the missing-table problem, a field survey of a live mock-exam platform
  ([`wanli4473/yysd-testcenter`](https://github.com/wanli4473/yysd-testcenter): 148 papers call the
  conversion helper, 104 define a table inline, 44 define none and fall back to a shim that guesses
  the module with `/reading/i.test(examId)` and so has no General Training branch), construction and
  validation, the disagreement survey, why rescaling is not equating, and the threats to validity.
- The service index, `/health`, `/docs` and `/openapi.json` now report the raw-score tables.

- **Mock-exam test-centre index** (`data/testcenter.json`): the paper catalogue (377 items with
  zone, subject, canonical paper facet, exam-shell duration, Cambridge volume/test references,
  deterministic English titles and per-file blob provenance), the **Cambridge holdings matrix**
  (19 rows: volume 3 is partial, volumes 4-21 complete - all three papers, four tests each), the
  **hand-tagged question taxonomy** (1,099 groups over 5,408 questions of Cambridge 5-21, each
  labelled with a canonical question type, one of 24 teaching scenes crosswalked onto the theme
  groups, and one of three difficulty judgements), and the **production score calibration** (the
  two raw-score-to-band tables the platform injects into every exam page, with level labels and an
  indicative caveat). Endpoints: `/v1/testcenter`, `/v1/testcenter/stats`,
  `/v1/testcenter/catalog`, `/v1/testcenter/catalog/:id`, `/v1/testcenter/volumes`,
  `/v1/testcenter/volumes/:id`, `/v1/testcenter/groups`, `/v1/testcenter/scenes`,
  `/v1/testcenter/scoring` (with band lookup), `/v1/testcenter/drill`.
- **The drill composer** (`GET /v1/testcenter/drill`): deterministic timed drills composed from
  the tagged groups under any filter combination, paced with the centre's own budgets (0.8 minutes
  per listening question, 1.5 per reading question) and carrying the scoring sheet. Stateless and
  byte-identical for identical requests, like the study planner.
- **Cross-corpus validation**: the centre's teacher taxonomy, mapped onto the canonical question
  types, agrees with the Part II practice corpus where the papers overlap - listening completion
  57.3% against 58.5%, reading identification 27.7% against 28.6% combined - while quantifying the
  disagreement where the collections differ (multiple choice 8.4% against 17.2%).
- `scripts/extract_testcenter.py`: standard-library-only, deterministic extraction from four
  platform-generated artifacts (manifest, two taxonomy files, scoring helper) plus the tree
  listing; the canonical type list is imported from `scripts/extract_practice_tests.py` so both
  mappings validate against one taxonomy by construction. CI downloads the four blobs by SHA and
  re-derives the index byte-identically on every run, then checks it for internal consistency.
- `RESEARCH.md` Part VII: the platform analysis, the holdings matrix, the label-mapping decisions,
  the cross-corpus comparison and the threats to validity (single-organisation tags, snapshot lag,
  disambiguation, unlicensed upstream).
- The service index, `/health`, `/docs` and `/openapi.json` now report the test-centre dataset.

### Changed

- `CITATION.cff`, `codemeta.json`, `.zenodo.json` and the README citation block cite version 1.4.0;
  the keyword lists now include score conversion, psychometrics, the mock-exam domain and score
  calibration.
- Test suite grown to 640 tests, still at 100% statement, branch, function and line coverage per
  file.

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

[Unreleased]: https://github.com/johnlikescarrot/IELTS-API/compare/v1.5.0...HEAD
[1.5.0]: https://github.com/johnlikescarrot/IELTS-API/releases/tag/v1.5.0
[1.4.0]: https://github.com/johnlikescarrot/IELTS-API/releases/tag/v1.4.0
[1.3.0]: https://github.com/johnlikescarrot/IELTS-API/releases/tag/v1.3.0
[1.2.0]: https://github.com/johnlikescarrot/IELTS-API/releases/tag/v1.2.0
[1.1.0]: https://github.com/johnlikescarrot/IELTS-API/releases/tag/v1.1.0
[1.0.0]: https://github.com/johnlikescarrot/IELTS-API/releases/tag/v1.0.0
