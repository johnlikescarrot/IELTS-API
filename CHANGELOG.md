# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.5.0] - 2026-09-07

The **retention layer**: the API now publishes the forgetting-curve data and the review schedulers
that cite it, and keeps the two apart. The occasion was
[`Iamdacai/ielts-vocab-system`](https://github.com/Iamdacai/ielts-vocab-system), a working IELTS
vocabulary trainer whose scheduler is labelled, in its code and in its API responses, as the
Ebbinghaus algorithm. Ebbinghaus (1885) measured _savings_ — the share of relearning time spared —
at seven intervals and fit them with a decay equation containing no review term. He proposed no
schedule. The ladder in wide deployment is folk pedagogy with a citation attached, and this release
publishes both the primary data and five actual published algorithms so the difference is checkable
rather than rhetorical. Nothing is simulated, nothing is fitted at request time, and every scheduler
is a pure function of an explicit state. The API remains free, GET-only, authentication-free and
dependency-free.

### Added

- **Retention overview** (`GET /v1/retention`): the four forgetting-curve studies, the five
  schedulers, their sources and the shared retention model used to compare them.
- **The forgetting curve** (`GET /v1/retention/curve`): Ebbinghaus's savings at his seven true
  retention intervals — 19 min, 63 min, 8.75 h, 1 d, 2 d, 6 d, 31 d, not the rounded retellings —
  together with the three independent replications tabulated by Murre and Dros (2015): Mack (1927),
  Seitz (1942) and Dros (2013). 28 observations across four series, each carrying its study and its
  published figure. The endpoint also evaluates the 1885 equation against its author's own data and
  returns the residuals: mean absolute 0.013, maximum 0.033, with the maximum falling exactly on the
  24-hour point with a _positive_ sign — the sleep-consolidation bump Murre and Dros identify,
  visible in the residuals of a 140-year-old two-parameter fit.
- **Five published review schedulers** (`GET /v1/retention/schedulers`, `/v1/retention/schedulers/:id`):
  Pimsleur's graduated interval recall (1967), the Leitner box system (1972), SM-2 (Woźniak, 1990),
  half-life regression (Settles and Meeder, 2016), and the folk ladder deployed by IELTS vocabulary
  trainers — the last flagged `provenance: folk-pedagogical` and `claimsEbbinghaus: true`.
  Intervals are stored as integer seconds, from 5 seconds to 565 days.
- **Measured disagreement between renderings**: Pimsleur's ladder is exact powers of five in seconds
  and is usually quoted rounded, so the published label sits beside the computed value (the rung
  printed as "1 hour" is 3,125 s, i.e. 52.08 minutes). Leitner's five-box day intervals are rendered
  incompatibly by different secondary sources — 1/2/4/8/16, 1/2/7/14/30, 1/2/4.5/9.5/21 — of a 1972
  popular-science book that specified box _frequencies_ and used three boxes, not five. Rather than
  pick one silently, the API publishes the doubling rendering as canonical and the others as named
  variants with the per-box ratios computed: `leitner-calendar` diverges at boxes 3, 4 and 5 by 1.75,
  1.75 and 1.88.
- **Schedule projection** (`GET /v1/retention/schedule`): the full review timeline for one item under
  any scheduler, from any starting state, with each review's interval, elapsed time, predicted
  savings under the 1885 curve, and predicted recall under the shared model.
- **Single-review grading** (`GET /v1/retention/grade`): grade one review and get the resulting state
  and next interval. The fold is interval-then-grade, so the state a caller stores is the state the
  next call needs; the response reports the before and after state explicitly.
- **Scheduler comparison** (`GET /v1/retention/compare`): all five schedulers over one horizon,
  scored on one retention model so none is graded by its own. Over 365 days of perfect recall they
  order 5, 10, 19, 25 and 49 reviews per item — a **9.8-fold spread in study cost** between
  algorithms treated as interchangeable — at mean predicted recall of 0.179, 0.781, 0.490, 0.515 and
  0.900 respectively.
- **Workload projection** (`GET /v1/retention/workload`): the daily review load of a vocabulary
  programme. At 20 new words a day against the 4,174-headword Cambridge list (209 days to cover), the
  folk ladder demands 19 reviews per word, peaking at **380 reviews a day** and settling at 313;
  SM-2 demands 5, peaking at 100. Three times the daily cost for lower predicted recall than Leitner
  at two-thirds of Leitner's price.
- **Two defects documented rather than silently fixed.** The folk ladder indexes its rungs by total
  attempts, so a _failed_ review advances the schedule exactly as a successful one does — it is the
  only one of the five that never rewinds on failure. And its mastery score cannot be reconstructed
  from success and failure counts alone, because the 0-100 clamp destroys order information: four
  successes then one failure gives 92, not 60. Both are reproduced faithfully and reported in the
  scheduler's notes.
- **RESEARCH.md Part VIII**, working through the provenance of each algorithm, the residual analysis,
  the Leitner source conflict, and six threats to validity — including that the comparison model is
  itself one of the contestants, and that savings on nonsense syllables are not word recall.
- Citation metadata for the primary sources: Ebbinghaus (1885), Murre and Dros (2015,
  doi:10.1371/journal.pone.0120644), Pimsleur (1967), Leitner (1972), Woźniak (1990), Settles and
  Meeder (2016, doi:10.18653/v1/P16-1174) and Cepeda et al. (2006) are recorded in `CITATION.cff`,
  `paper/paper.bib` and the README, and are carried in the responses that use them.

### Changed

- `GET /health` and the dataset summary now report the retention dataset: scheduler count,
  forgetting-curve studies, observations and scheduler variants.
- The OpenAPI document gains the eight `/v1/retention/*` operations with their full parameter ranges.
- `paper/paper.md` gains a retention dataset section and a fourth statement-of-need item: an
  auditable reference implementation of the scheduling literature.

### Fixed

- `test/app.test.ts` asserted that a small response is not gzipped using `/health` as its fixture.
  `/health` had grown to within 3% of the 1 KiB compression threshold, so the test was one field away
  from silently inverting. It now uses a genuinely small response and asserts that the body is under
  the threshold, so the fixture's smallness is self-checking.

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
