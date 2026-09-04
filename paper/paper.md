---
title: >-
  IELTS-API: a free, authentication-free and reproducible reference
  implementation of IELTS scoring and language-assessment analytics
tags:
  - TypeScript
  - language assessment
  - IELTS
  - CEFR
  - readability
  - automated writing evaluation
  - reproducible research
  - open API
authors:
  - name: IELTS-API Contributors
    affiliation: 1
affiliations:
  - name: Independent
    index: 1
date: 4 September 2026
bibliography: paper.bib
---

## Summary

The International English Language Testing System (IELTS) is one of the most
widely used measures of English proficiency for university admission, professional
registration and migration. A large amount of research, courseware and consumer
software therefore depends on a small set of rules: how component band scores
combine into an Overall Band Score, how raw scores on the objectively marked
papers convert to bands, how bands relate to the Common European Framework of
Reference (CEFR) [@councilofeurope2020], and what textual evidence supports a
judgement about a candidate's writing.

`IELTS-API` implements those rules once, correctly, and exposes them as both a
TypeScript library and an HTTP API that requires no authentication of any kind.
It bundles the Academic Word List [@coxhead2000], four classical readability
indices [@flesch1948; @kincaid1975; @gunning1952; @senter1967], an auditable rule
base of frequent learner errors, corpora of Writing and Speaking prompts, and a
transparent estimator that reports a band for each analytic criterion together
with the features and the reasoning that produced it. The software has no runtime
dependencies, is deterministic by construction, and is covered by an exhaustively
verified test suite at 100% statement, branch, function and line coverage.

## Statement of need

Three problems recur in software that touches IELTS.

**The arithmetic is subtly wrong.** The Overall Band Score is not obtained by
ordinary rounding. A mean whose fractional part is exactly `.25` rounds _up_ to
the next half band, and exactly `.75` rounds _up_ to the next whole band.
Implementations that use `Math.round` or banker's rounding disagree with the test
owners on a substantial fraction of score profiles. `IELTS-API` implements the
published rule, reports the unrounded mean and names the rounding branch it took,
and verifies the rule exhaustively over all 130 321 combinations of four
reportable component scores.

**Data is entangled with code.** Conversion tables, descriptors and word lists
are typically hard-coded inside application logic, so they cannot be inspected,
cited or replaced. In `IELTS-API` every dataset is a separate, typed, documented
module and is also served as data — `/v1/conversion`, `/v1/descriptors/{rubric}`,
`/v1/writing/mistakes` — so that a researcher can audit exactly what was used and
substitute an alternative when a study requires one.

**Automated feedback is unaccountable.** Commercial scoring engines are opaque,
non-deterministic across versions, gated behind paid authentication, and
therefore unusable as a reproducible baseline. `IELTS-API` takes the opposite
position: the estimator is a glass box whose thresholds are published in source,
whose output includes a rationale for every criterion, and whose limitations are
returned in the response payload itself. It is intended as a _baseline_ against
which opaque or neural scorers can be compared, and as a formative-feedback
instrument, explicitly not as a prediction of an examiner award.

A fourth, practical need motivates the licensing and access model. Educational
tools built by students, teachers and small research groups cannot rely on APIs
that require accounts, keys or quotas. Every endpoint here is free and
unauthenticated, the OpenAPI document declares an empty `security` array, and the
service can be self-hosted from a single `npm start`.

## Functionality

- **Score arithmetic.** Overall Band Score with the official rounding rule,
  analytic criterion averaging, an inverse "what do I still need?" planner over
  the discrete reporting scale, and a rounding endpoint for verifying third-party
  implementations.
- **Raw-score conversion.** Listening, Academic Reading and General Training
  Reading tables, exposed as data, with the marks required to reach the next band
  and the minimum raw score for each target band.
- **CEFR alignment.** The published mapping, with scores below band 4 reported as
  unaligned rather than mapped speculatively.
- **Band descriptors.** 120 original paraphrased descriptors across three rubrics,
  four criteria and ten bands, filterable by criterion and band.
- **Lexical profiling.** Academic Word List coverage by sublist, type-token and
  root type-token ratios, and form-to-family lookup over 3109 indexed strings.
- **Readability.** Flesch Reading Ease, Flesch-Kincaid Grade Level, the Gunning
  fog index and the Automated Readability Index, with the surface statistics they
  derive from.
- **Error detection.** 33 documented regular-expression rules across ten
  linguistic categories, each reported with severity, position, message and
  suggested correction.
- **Practice corpora.** 24 Writing prompts and 30 Speaking items, with seeded
  sampling so that a practice set or an experimental stimulus set can be
  regenerated exactly from its seed.

## Reproducibility

The request path performs no I/O: no clock, no filesystem, no network and no
unseeded randomness. Sampling endpoints take an explicit integer seed and echo it
in the response metadata. `/health` deliberately carries no timestamp. Two
independently constructed application instances produce byte-identical bodies for
the same request, a property asserted in continuous integration on every push.
The OpenAPI document is generated from the same route table that dispatches
traffic and is verified against the committed copy, so specification and
implementation cannot diverge. Semantic versioning is interpreted strictly: any
change that could alter a response body for an unchanged request is a breaking
change.

## Quality assurance

Continuous integration runs type checking, ESLint, Prettier, the full test suite
with 100% coverage thresholds, a production build across three Node.js releases,
the determinism check, and `super-linter` over the entire code base. Two
properties are verified exhaustively rather than by sampling: the Overall Band
Score rounding rule over its complete input space, and raw-score conversion over
every raw score of every paper. Dataset invariants — 570 word families with the
published sublist sizes, unique identifiers across every corpus, and a matching
example for every detection rule — are asserted as tests rather than asserted in
prose.

## Acknowledgements

This project builds on the published scholarship of Averil Coxhead, Rudolf
Flesch, J. Peter Kincaid and colleagues, Robert Gunning, R. J. Senter and E. A.
Smith, and on the Council of Europe's framework. IELTS is a registered trademark
of the British Council, IDP: IELTS Australia and Cambridge University Press &
Assessment; this project is independent of and unaffiliated with all of them.

## References
