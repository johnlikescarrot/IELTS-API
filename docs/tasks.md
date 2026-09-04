# Task tracker

This file tracks implemented work against the roadmap. The project is built in
small, reviewable milestones; each milestone lands as a pull request that must
keep coverage at 100% and pass linting/formatting.

## Guiding constraints

- Entirely free, no authentication, no API keys.
- TypeScript implementation.
- **100%** code coverage (statements, branches, functions, lines) enforced by
  coverage thresholds.
- Continuous linting via GitHub Actions (super-linter) plus local
  `npm run check`.
- Content is **original** or factual general reference — no copyrighted test
  material is redistributed.
- Work is delivered in pull requests; never block on external input.

## Milestone 1 — Core API (implemented)

- [x] Project scaffolding (ESM TypeScript, Prettier, ESLint flat config,
      Vitest, super-linter workflow).
- [x] Error model (`ApiError`) and query-parameter validation helpers.
- [x] Seeded PRNG + pagination helpers.
- [x] Band-score domain logic with Listening and Reading (Academic/General)
      conversion tables and overall-band rounding.
- [x] Deterministic essay-prompt generator.
- [x] Dependency-free Node HTTP server with Router, App container, CORS,
      HEAD/OPTIONS, 404/405 handling, and a 1 MiB request-body cap.
- [x] Original content banks: exam structure, writing prompts/task guide,
      speaking parts + cue cards, academic vocabulary, reading question types.
- [x] Endpoints for bands, exam, writing, speaking, vocabulary and reading.
- [x] Tests covering all of the above at 100% coverage.
- [x] README, LICENSE and this tracker.

## Roadmap (proposed next milestones)

- [ ] Continuous-deployment config and a hosted free instance URL.
- [ ] Expand content: more original prompt/cue-card banks and vocabulary.
- [ ] `/v1/practice` listening/reading micro-practice with seeded questions and
      answer keys.
- [ ] Writing band-descriptor reference and banding-check endpoints.
- [ ] OpenAPI document served at `/openapi.json`.
- [ ] Rate-limit/abuse notes and a Dockerfile.
