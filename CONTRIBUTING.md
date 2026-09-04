# Contributing

Thanks for helping keep IELTS-API open, free, and citable.

## Guiding principles

- The API must remain completely free and require **no authentication**.
- Data must stay traceable to public sources; link, don't copy.
- TypeScript code must be reliable, readable, and keep **100% coverage**
  (lines, branches, functions, statements — enforced by Vitest).
- No copyrighted files are committed; original content and links are preferred.
- Every change goes through a pull request; Super-Linter must pass.

## Setup

```bash
npm ci
npm run typecheck
npm run test:coverage
npm run build
```

## Before opening a pull request

```bash
npm run format
npm run lint
npm run typecheck
npm run test:coverage
```

CI also runs Super-Linter on every push and PR. Fix lint failures before merging.

## Adding or updating data

- `src/data/vocabulary.ts` — CEFR-graded vocabulary entries.
- `src/data/writing.ts` — Task 1/2 prompts, band-scored samples, tips, mistakes.
- `src/data/speaking.ts` — Speaking Parts 1–3 topics and tips.
- `src/data/skills.ts` — Reading/Listening taxonomies, tips, practice sets.
- `src/data/language.ts` — Grammar rules, collocations, idioms, phrasal verbs.
- `src/data/studyPlans.ts` — Week-by-week study plans.
- `src/data/resources.ts` — Curated links to upstream collections (link only).

When adding resources, verify the upstream URL still resolves. Do not attach
copyrighted PDFs or EPUBs to this repository. All prose datasets must be
original: definitions, examples and essays written for this project.
