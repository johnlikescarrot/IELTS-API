# IELTS-API: A Free, No-Auth, Open IELTS Practice API in TypeScript

## Summary

High-stakes English tests such as the International English Language Testing
System (IELTS) shape university admissions, migration and employment for
millions of candidates each year, yet openly licensed, machine-readable
practice infrastructure remains scarce. Study materials are typically locked in
PDF dumps, behind paywalls, or inside apps that require accounts and API keys.
`IELTS-API` addresses this gap with a free, no-authentication REST API and an
open dataset covering the full IELTS preparation cycle: CEFR-graded vocabulary
(64 items across 10 topics), Writing Task 1/2 prompts with band-scored sample
answers, Speaking Parts 1–3 topics, Reading/Listening question-type taxonomies
with practice sets, grammar rules, academic collocations, idioms, phrasal
verbs, week-by-week study plans, and deterministic band-score calculators that
implement the official overall-band rounding rule.

## Statement of need

Researchers in computer-assisted language learning (CALL), learning analytics
and NLP need stable, citable endpoints to (a) deliver practice content in
experiments without licensing friction, (b) log learner interactions against a
versioned item bank, and (c) reproduce band-score conversions transparently.
Teachers and self-study learners need the same content without sign-ups or
fees. Existing community collections (e.g. file-sharing repositories of
textbooks) are not APIs: they cannot be queried, paginated, or cited at the
item level. `IELTS-API` is designed as scholarly infrastructure — every item
has a stable id, the dataset ships with a `CITATION.cff`, an OpenAPI contract,
and a 100%-covered TypeScript implementation so results built on it are
auditable and reproducible.

## Design

- **Zero-friction access.** No API keys, no accounts, open CORS, JSON
  everywhere, and a health check plus OpenAPI document for programmatic
  discovery.
- **Query-first dataset.** All collections support `search`/`limit`/`offset`
  filtering (e.g. `level=C1`, `category=environment`, `formality=formal`) so
  items can be sampled reproducibly for experiments and apps.
- **Transparent scoring.** Raw-to-band tables live in one auditable module
  (`src/utils/bands.ts`) with boundary tests for every row; overall rounding
  follows the published x.25/x.75 rule.
- **Software-engineering guarantees.** Strict TypeScript, ESLint + Prettier,
  CI on Node 20/22, Super-Linter on every push/PR, and a 100% line/branch/
  function/statement coverage gate enforced by Vitest.

## Originality of content

All definitions, examples, essay samples, prompts and explanations in this
repository were written for this project and are released under the MIT
license. The project is thematically inspired by community IELTS study
collections but reproduces none of their copyrighted material.

## Acknowledgements

Inspired by the open IELTS study community, including the file-sharing
collection at <https://github.com/zhengyishiming/IELTS> whose topic coverage
(vocabulary, writing samples, speaking guides, grammar references) informed
the API's domain model.

## References

- British Council / IDP / Cambridge. _IELTS band scores and marking._ Public
  band descriptors and raw-score conversion guidance.
- Common European Framework of Reference for Languages (CEFR), Council of
  Europe.
- Smith, A. M., et al. _Journal of Open Source Software_ review criteria for
  research software (applied here as a quality model).
