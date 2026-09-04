# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-09-04

### Added

- Free, no-authentication REST API for IELTS study content, written in
  TypeScript with zero runtime dependencies.
- Band-scored vocabulary dataset: 48 academic words across 8 topics with IPA,
  CEFR-style band levels, synonyms, and collocations.
- Practice tests: 2 academic reading tests (3 sections each) and 2 listening
  tests (2 sections each) with full transcripts, 56 questions across 6 IELTS
  question formats, answers, and evidence-based explanations.
- Writing: 4 Task 1 and 4 Task 2 prompts with band-8 model answers, key
  points, and useful vocabulary; 20 common learner mistakes with corrections.
- Speaking: Part 1 topics, Part 2 cue cards with model responses and key
  vocabulary, and Part 3 discussion sets with strategies.
- Band-score tools: indicative raw-to-band conversion tables for listening,
  academic reading, and general training reading, plus a calculator and the
  four-skill overall-band averaging rule.
- 24 per-skill study and exam tips.
- Self-documenting API: `/docs` HTML page, OpenAPI 3.1 document at
  `/openapi.json` generated from the live route table, and a service
  directory at `/`.
- CORS enabled for all origins; JSON error envelope with stable codes.
- Quality gates: 100% line/branch/function coverage enforced, ESLint +
  Prettier + markdownlint, super-linter on every push and pull request,
  CI workflow running lint, build, and coverage on Node 22.
- Citation tooling: `CITATION.cff`, APA and BibTeX strings served by the API.
