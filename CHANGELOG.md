# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2026-09-05

Third dataset family: the study-material collection
[`Oxidaner/ielts`](https://github.com/Oxidaner/ielts) — a large Chinese-language dump of IELTS
preparation material (listening handouts, recalled exam prompts, speaking decks) — is studied and
folded in as four derived, non-substitutive datasets. As with the earlier families, no source
document is redistributed: word lists, classification structure and the short factual record of
recalled prompts only.

### Added

- **Listening vocabulary resource** (`data/listening-words.json`): 79 same-meaning replacement
  ("paraphrase") groups with 459 interchangeable terms across verb, adjective/adverb and noun
  sections, each with an original English sense gloss; a five-mechanism paraphrase typology
  (word-family, cross-part-of-speech, polarity, hyponymy, abstract-concrete); 12 listening
  scenarios with nested lexical fields (790 terms); and 8 discourse-relation classes with 54 signal
  markers. Endpoints: `/v1/paraphrases`, `/v1/paraphrases/mechanisms`, `/v1/paraphrases/:id`,
  `/v1/scenarios`, `/v1/scenarios/discourse-markers`, `/v1/scenarios/discourse-markers/:id`,
  `/v1/scenarios/:id`.
- **Recalled writing-prompt index** (`data/writing-recall.json`): 232 unique Writing Task 2 prompts
  crowd-recalled from computer-delivered sessions between 2024-12-01 and 2025-01-31 (235 rows), each
  with the preparer's question type normalised onto the canonical essay families, a verbatim theme
  label with an English gloss and a cross-reference to the theme groups of `/v1/topics/themes`,
  difficulty stars, and recurrence counts (3 prompts recalled twice). Endpoints:
  `/v1/writing/recall`, `/v1/writing/recall/:id`.
- **Speaking question-season structure** (`data/speaking-bank.json`): the September-December 2025
  season with 76 Part 2 cue cards classified by the four canonical content categories (16 person /
  25 object / 26 event / 9 place) and rotation status (27 new / 49 retained), 18 Part 1 topic sets
  with 79 questions, the 22-card crowd-bank Part 2 index with 111 Part 3 follow-up counts, and 10
  title-level cross-references between deck and bank. Endpoints: `/v1/speaking/bank`,
  `/v1/speaking/bank/cue-cards`, `/v1/speaking/bank/cue-cards/:id`, `/v1/speaking/bank/part3`.
- **Rhetorical move structures**: three reusable writing structures — Task 1 static-chart
  comparison, Task 1 dynamic-chart trend narration, and the Task 2 concession-rebuttal essay
  reusable across the opinion, discussion and advantage/disadvantage families — each with ordered
  moves, guidance and a companion lexical inventory. Endpoints: `/v1/writing/move-structures`,
  `/v1/writing/move-structures/:id`.
- `scripts/_pdfmin.py`: a standard-library-only PDF text extractor for the FlateDecode +
  Identity-H + RC4 (revision 4, empty user password) subset that office software emits, including
  ToUnicode CMap parsing and advance widths read from the embedded TrueType `hmtx` table — the
  extraction pipeline needs no poppler, no pypdf and no pip install.
- `scripts/extract_listening_words.py`, `scripts/extract_writing_recall.py`,
  `scripts/extract_speaking_bank.py`: deterministic, standard-library-only derivation of the three
  new datasets, with content-classified cell parsing for the mis-aligned recall workbook.
- `scripts/gen-openapi.mts`: regenerates `docs/openapi.json` from the live route table; CI now
  fails when the published document is stale.
- RESEARCH.md Part III: the study-collection analysis, the paraphrase mechanism typology, the
  season-rotation findings and the threats to validity (recall bias in particular).

### Changed

- The OpenAPI document, the README dataset and endpoint tables, the `/docs` front page and the
  dataset index cover the new datasets and routes.
- CI re-derives all six datasets from pinned upstream blobs and fails on drift.
- Test suite grown to 425 tests, still at 100% statement, branch, function and line coverage per
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
