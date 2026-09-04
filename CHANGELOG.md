# Changelog

All notable changes to this project are documented in this file. The format is
based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html),
interpreted strictly: any change that could alter a response body for an
unchanged request is a breaking change.

## [1.0.0] - 2026-09-04

### Added

- IELTS score arithmetic: Overall Band Score with the official `.25` and `.75`
  rounding rule, analytic criterion averaging, mean rounding and an inverse
  target planner.
- Raw-score to band-score conversion for Listening, Academic Reading and General
  Training Reading, exposed as inspectable data with next-band distances and
  per-band minimum raw scores.
- The published IELTS to CEFR alignment, with scores below band 4 reported as
  unaligned rather than mapped speculatively.
- 120 original paraphrased analytic band descriptors across Writing Task 1,
  Writing Task 2 and Speaking.
- Academic Word List support: 570 families, 3109 indexed forms, sublist
  summaries, substring search, seeded sampling and form-to-family lookup.
- Text analytics: four classical readability indices, lexical profiling,
  cohesive-device profiling by rhetorical function, and an exposed segmenter.
- A rule base of 33 documented common-mistake detectors across ten linguistic
  categories, with positions, messages and suggestions.
- A transparent Writing band estimator returning a per-criterion score with the
  rationale that produced it.
- Corpora of 24 Writing prompts and 30 Speaking items, with seeded, reproducible
  sampling and a three-part mock Speaking test.
- A self-hosted HTML documentation page and a generated OpenAPI 3.1 document.
- Citation infrastructure: `CITATION.cff`, `codemeta.json`, `.zenodo.json`, a
  JOSS-style paper, and `/v1/citation` and `/v1/references` endpoints.
- Continuous integration running type checking, ESLint, Prettier, tests at 100%
  coverage on three Node.js releases, a determinism check and super-linter.

[1.0.0]: https://github.com/johnlikescarrot/IELTS-API/releases/tag/v1.0.0
