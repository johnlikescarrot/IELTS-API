# Review: UPGRADE-YOUR-IELTS-SKILLS

Reviewed on **2026-09-05**. This is a repository-structure and implementation review, not a
validation of the exercises, answer keys, difficulty labels, or learning outcomes.

## Snapshot and method

- Repository: <https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS>.
- Commit: [`ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c`](https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS/commit/ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c)
  (2026-07-03).
- The recursive Git tree response was **not truncated**: 6,309 entries, including 5,545 blobs.
- GitHub reported no repository licence; no licence file was found outside vendored dependencies.
  **Public visibility is not permission to redistribute content or code.**
- Inspected the tree, project summary, Reading curriculum plan, index generator, full-test builder,
  unified builder, and strategy-generation implementation. Did not execute upstream scripts.
- Did **not** fetch exercise text, answer-key datasets, recordings, documents, environment files,
  authentication captures, student records, or the tracking workbook. No upstream content is imported.

Pinned implementation references:

1. [Project summary](https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS/blob/ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c/Docs/PROJECT_SUMMARY.md).
2. [Reading curriculum plan](https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS/blob/ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c/Reading_1232_Basic/IELTS-Reading-1232-Plan.md).
3. [Index generator](https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS/blob/ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c/Tools/generate_indexes.py).
4. [Full-test builder](https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS/blob/ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c/Tools/build_full_tests.py).
5. [Unified builder](https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS/blob/ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c/Tools/unified_builder.py).
6. [Strategy generator](https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS/blob/ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c/Tools/crawler/generate_strategies.py).

## What is actually present

Count a **unit**, not every representation of it. JSON, JavaScript, HTML, DOCX, audio, processed
JSON and strategies can refer to the same unit; counting files as exercises inflates the inventory.

| Collection                    | Declared units | Observed units | Observation                                   |
| ----------------------------- | -------------: | -------------: | --------------------------------------------- |
| Reading basic, A1-A2          |            198 |            198 | Paired `lesson_NNN.json` / `.js` files        |
| Reading basic, B1-B2          |            374 |            374 | Paired `lesson_NNN.json` / `.js` files        |
| Reading basic, C1-C2          |            660 |            660 | Paired `lesson_NNN.json` / `.js` files        |
| Listening basic, Basic        |             34 |             34 | Lesson HTML and audio                         |
| Listening basic, Intermediate |             34 |             34 | Lesson HTML and audio                         |
| Listening basic, Advanced     |             34 |             34 | Lesson HTML and audio                         |
| Reading full tests            |            315 |        **314** | `Test_105` is absent                          |
| Listening full tests          |            204 |            204 | Audio is absent for tests **83, 85 and 88**   |
| **Total**                     |      **1,853** |      **1,852** | Metadata inventory, not 1,852 validated tests |

Further structure-level observations:

- Reading full tests have 269 source JSON files, 108 processed JSON files, and 20 strategy files.
  These sets overlap and must not be added as separate tests.
- Listening full tests have 201 source JSON files, 187 processed JSON files, 201 audio files, and
  20 strategy files.
- There are 100 literal `Test_{idx_num}.html` filenames in Listening full-test directories. They
  are template artefacts, not additional tests; the inventory excludes them.
- The tree contains vendored dependencies, debugging artefacts and management scripts. These are
  not learning units and are excluded by an explicit allowlist, not a broad file-extension crawl.
- The curriculum plan specifies 11 Reading question families and an emphasis on C1-C2. The actual
  directory labels are **paired** ranges (A1-A2, B1-B2, C1-C2). We do not invent individual CEFR
  labels or equate Basic/Intermediate/Advanced Listening labels with IELTS bands.

## Architectural and assessment findings

The upstream is a learning application, not an open API. It combines a Reading SPA, generated
Listening/full-test HTML, audio assets and learner/manager dashboards. Its documentation describes
an identity-gated learning flow and a priced access period; later implementation work integrates
Supabase. Those constraints are **not** adopted here: this API needs no accounts, cookies, keys,
external database, paid model, or upstream service at runtime.

The full-test builder implements raw-score band tables and permissive answer normalisation in
browser code. This is useful architectural context, not an authoritative scoring standard. The
[official scoring explanation](https://ielts.org/organisations/ielts-for-organisations/understanding-ielts-scoring)
says precise raw-score thresholds vary between test versions. We do not turn those upstream
heuristics into certified scores or use them to claim a guaranteed band improvement.

The strategy generator sends exercise text, answer keys and sometimes audio to a generative model.
Thus, the presence of a `strategies.json` file establishes only **file availability**, not expert
review, correctness or a measured learning benefit. The new task-family guidance is independently
written and grounded in the official test-format descriptions instead:

- [Academic Reading: 11 question families](https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-reading).
- [Listening: 6 question families](https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-listening).

## Design derived from the review

1. **Metadata-only practice catalogue:** one stable identifier per collection and unit number,
   pinned directory references and Git blob identifiers. No text, answer keys or media payloads.
2. **Honest availability:** asset-kind filters and completeness statistics distinguish observed
   assets from declared counts. A file's existence does not establish that it works or is licensed.
3. **Reproducibility:** a deterministic, TypeScript-only tree compiler; explicit input validation;
   SHA-256 over canonical item JSON; seeded sampling; and JSON Lines exports for offline analysis.
4. **Independent pedagogy:** original Reading/Listening task-family strategies, with official
   source URLs and explicit scope. No per-unit task-type or difficulty annotations are guessed.
5. **Rights separation:** the API's metadata compilation is CC BY 4.0; upstream licence remains
   unknown. A metadata licence does not grant permission to use the indexed exercises. The upstream
   application is deliberately not added to the catalogue of free, no-login resources.

## Research use and limits

Suitable uses include inventory audits, missing-asset analysis, reproducible sampling of metadata,
and investigation of how a preparation collection is organised. This is **not** a licensed training
corpus, an item-response-theory calibration, a learner dataset, or evidence of instructional efficacy.
Do not infer semantic duplicates, exact question counts, correct answers, working audio, individual
CEFR levels, or General Training/Academic scope from filenames alone.

An empirical study should report the source commit, API code revision, metadata checksum, filters,
seed and selected identifiers; obtain content rights separately; and preregister evaluation and
sampling decisions. No learner data is collected or sent upstream by this API.
