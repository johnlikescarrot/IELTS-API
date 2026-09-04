# Contributing

Thanks for helping keep the Free IELTS API open, free, and citable.

## Guiding principles

- The API must remain completely free and require **no authentication**.
- Data must stay traceable to the public source repository.
- TypeScript code must be reliable, readable, and keep **100% coverage**.
- No copyrighted files are committed; enriched metadata and links are preferred.

## Setup

```bash
npm ci
npm run check
npm test
npm run build
```

## Before opening a pull request

```bash
npm run format
npm run lint
npm run check
npm test
```

The CI workflow also runs `super-linter/super-linter`. Fix linting failures before merging.

## Adding or updating data

- `src/data/topics.json` — IELTS Writing Task 2 topic banks.
- `src/data/resources.json` — curated resource metadata with source URLs.
- `src/data/writing.json` — writing samples and examiner commentary.
- `src/data/citation.json` — scholarly citation record.

When adding resources, verify the upstream file URL still resolves. Do not attach copyrighted
PDFs or EPUBs to this repository.
