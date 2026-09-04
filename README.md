# IELTS API

[![CI](https://github.com/johnlikescarrot/IELTS-API/actions/workflows/ci.yml/badge.svg)](https://github.com/johnlikescarrot/IELTS-API/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Code Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen.svg)](#development)
[![Linted with super-linter](https://img.shields.io/badge/linted%20with-super--linter-2ea44f.svg)](https://github.com/super-linter/super-linter)

**The best free, no-authentication IELTS preparation API ever written in TypeScript.**

One REST API for IELTS study tools, designed to be consumed by apps, bots,
spaced-repetition clients, classroom dashboards and LLM agents:

- **Academic Word List** - all 570 word families in 10 sublists (Coxhead, 2000)
- **Topic vocabulary packs** - 12 IELTS topics with terms, definitions, collocations and examples
- **Question bank** - Speaking Parts 1-3 and Writing Tasks 1-2 in the real test format
- **Band descriptors** - Writing and Speaking criteria for bands 5-9, plus the nine-band overview
- **Score conversion** - raw-to-band tables and official-style overall band rounding
- **Common mistakes** - 20 error-correction drills with explanations and criterion impact
- **Practice generator** - complete seeded mock tests, vocabulary quizzes and week-by-week study plans

No API keys. No sign-up. No rate-limit-by-account. CORS enabled, cacheable, Docker-ready.

> **Trademark disclaimer** - IELTS is a registered trademark of its respective
> owners (British Council, IDP and Cambridge Assessment English). This project
> is an independent study aid and is not affiliated with, endorsed by, or
> approved by them. Data descriptions are condensed paraphrases for study
> purposes; the official published materials are the authoritative source.

## Quick start

### Run it

```bash
# from source
npm ci
npm run dev

# or compiled
npm run build
npm start

# or Docker
docker build -t ielts-api .
docker run -p 3000:3000 ielts-api

# or as a library / CLI
npx github:johnlikescarrot/IELTS-API
```

The server listens on `http://0.0.0.0:3000` (override with `PORT`, `HOST`).

### Try it

```bash
curl http://localhost:3000/health
curl http://localhost:3000/v1/vocab/awl/sublists/1?limit=5
curl "http://localhost:3000/v1/vocab/awl/random?count=5&sublist=3&seed=today"
curl "http://localhost:3000/v1/scoring/conversion?module=listening&raw=34"
curl -X POST http://localhost:3000/v1/scoring/overall \
  -H 'content-type: application/json' \
  -d '{"listening":7,"reading":7,"writing":6,"speaking":6}'
curl "http://localhost:3000/v1/practice/mock-test?seed=exam-day"
```

## API reference

The service is self-documenting: `GET /` and `GET /v1` return the machine-readable
endpoint catalog shown below.

### Meta

| Method | Path      | Description                                 |
| ------ | --------- | ------------------------------------------- |
| GET    | `/`       | API index with the full endpoint catalog    |
| GET    | `/v1`     | Same catalog under the version prefix       |
| GET    | `/health` | Liveness probe (version, uptime, timestamp) |

### Vocabulary

| Method | Path                              | Description                                                        |
| ------ | --------------------------------- | ------------------------------------------------------------------ |
| GET    | `/v1/vocab/awl`                   | Academic Word List overview (570 words, 10 sublists, citation)     |
| GET    | `/v1/vocab/awl/sublists/:sublist` | Words of one sublist (1-10), paginated                             |
| GET    | `/v1/vocab/awl/words/:word`       | One word family with sublist position and citation                 |
| GET    | `/v1/vocab/awl/random`            | Random words: `count` (1-50), `sublist` (1-10), `seed`             |
| GET    | `/v1/vocab/topics`                | The 12 topic vocabulary packs                                      |
| GET    | `/v1/vocab/topics/random`         | Random topic vocabulary: `count`, `topicId`, `seed`                |
| GET    | `/v1/vocab/topics/:topicId`       | One pack (education, environment, technology, health, ...)         |
| GET    | `/v1/vocab/search`                | Unified search: `q`, `scope` (`awl` \| `topics` \| `all`), `limit` |

### Questions

| Method | Path                   | Description                                           |
| ------ | ---------------------- | ----------------------------------------------------- |
| GET    | `/v1/questions`        | Browse: `skill`, `part`, `topic`, `page`, `limit`     |
| GET    | `/v1/questions/random` | One random question: `skill`, `part`, `topic`, `seed` |
| GET    | `/v1/questions/:id`    | One question by id                                    |

### Scoring

| Method | Path                     | Description                                                                           |
| ------ | ------------------------ | ------------------------------------------------------------------------------------- |
| GET    | `/v1/scoring/tables`     | All raw-to-band conversion tables plus the accuracy disclaimer                        |
| GET    | `/v1/scoring/conversion` | Convert one raw score: `module`, `raw` (0-40)                                         |
| POST   | `/v1/scoring/overall`    | Overall band from four skill scores; `.25` rounds up to `.5`, `.75` to the whole band |

### Band descriptors

| Method | Path                      | Description                                                        |
| ------ | ------------------------- | ------------------------------------------------------------------ |
| GET    | `/v1/bands`               | Nine-band scale overview (1-9)                                     |
| GET    | `/v1/bands/:band`         | One band overview                                                  |
| GET    | `/v1/bands/writing/:task` | Task 1 or Task 2 criteria: `?criterion=lexical-resource` to filter |
| GET    | `/v1/bands/speaking`      | Speaking criteria: `?criterion=fluency-and-coherence` to filter    |

### Common mistakes

| Method | Path                  | Description                               |
| ------ | --------------------- | ----------------------------------------- |
| GET    | `/v1/mistakes`        | All mistakes: `category`, `page`, `limit` |
| GET    | `/v1/mistakes/random` | Correction quiz: `count` (1-20), `seed`   |
| GET    | `/v1/mistakes/:id`    | One mistake by id                         |

### Practice

| Method | Path                      | Description                                                                      |
| ------ | ------------------------- | -------------------------------------------------------------------------------- |
| GET    | `/v1/practice/mock-test`  | Full mock test (Speaking 1-3 + Writing 1-2) with timing and instructions: `seed` |
| GET    | `/v1/practice/vocab-quiz` | Multiple-choice vocabulary quiz: `count`, `topicId`, `seed`                      |
| GET    | `/v1/practice/study-plan` | Generated study plan: `currentBand`, `targetBand`, `weeks` (1-52), `seed`        |

## Design notes

### Response envelope

Every success response is `{"data": ...}` (plus `meta` on paginated routes).
Every error is:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Invalid query parameters",
    "details": { "issues": [{ "path": "limit", "message": "Too big", "code": "too_big" }] }
  },
  "requestId": "req-1"
}
```

### Deterministic randomness

Any "random" endpoint accepts a `seed`. The same seed always yields the same
result (FNV-1a hash + Mulberry32 PRNG), so teachers can hand out reproducible
practice sets and clients can cache them safely.

### HTTP caching

Successful `GET` responses carry weak ETags and honour `If-None-Match` with
`304 Not Modified`. Dataset routes send long-lived `Cache-Control` headers, so
a free CDN can front the API at zero cost. Unseeded random routes are
`no-store`.

### Free hosting

The API is a single stateless Node process with zero paid dependencies.
It runs on Fly.io, Render, Railway, Koyeb, Google Cloud Run or a Raspberry Pi
without modification, and the included `Dockerfile` is all you need.

## Data sources and citations

- Academic Word List: Coxhead, A. (2000). _A New Academic Word List_.
  TESOL Quarterly, 34(2), 213-238. Word-family headwords follow the Simple
  English Wiktionary transcription of the list.
- Band descriptors: condensed paraphrases of the publicly published IELTS
  Writing and Speaking band descriptors. The official documents are the
  authoritative source.
- Raw-score conversion tables are the widely published approximations used by
  preparation providers. Official conversion is test-specific and is not
  published verbatim by IELTS; every scoring response therefore carries a
  disclaimer.
- Question bank, topic vocabulary, mistake drills and study plans are original
  practice content written for this project.

## Development

```bash
npm ci                 # install
npm run dev            # watch mode
npm run build          # compile to dist/
npm run typecheck      # strict TypeScript, zero any
npm run lint           # eslint (typescript-eslint, strict)
npm run format:check   # prettier
npm run lint:markdown  # markdownlint
npm test               # vitest with 100% coverage gate
```

Tests enforce **100% code coverage** - statements, branches, functions and
lines - via `vitest` thresholds; the build fails below 100%. Run
`npx vitest run --coverage` to see the report (HTML output in `coverage/`).

### Super-linter

This repository is always linted with
[super-linter](https://github.com/super-linter/super-linter) in CI (the `lint`
job), covering TypeScript ESLint, YAML, Markdown, JSON, Dockerfile (hadolint),
environment files (dotenv-linter) and secret scanning (gitleaks). To run the
same gate locally:

```bash
docker run \
  -e RUN_LOCAL=true \
  -e DEFAULT_BRANCH=main \
  -e LINTER_RULES_PATH=. \
  -e TYPESCRIPT_ES_CONFIG_FILE=.eslintrc.cjs \
  -e YAML_CONFIG_FILE=.yamllint.yml \
  -e MARKDOWN_CONFIG_FILE=.markdown-lint.yml \
  -e VALIDATE_ALL_CODEBASE=true \
  -v "$(pwd)":/tmp/lint \
  super-linter/super-linter:latest
```

## Project structure

```text
src/
  app.ts                  Fastify factory: CORS, security headers, ETag/304, error envelope
  server.ts               Bootstrap: config -> app -> listen + graceful shutdown
  bin.ts                  Executable shim
  config.ts               Validated environment configuration (zod)
  data/                   AWL, questions, bands, mistakes, topic vocabulary, conversions
  lib/                    errors, validation (zod), pagination, ETag, seeded PRNG
  routes/                 One module per domain + self-documenting catalog
  services/               Pure business logic per domain
test/
  data/                   Dataset integrity tests (counts, ranges, uniqueness)
  integration/            Route-by-route HTTP tests via fastify.inject
  lib/ services/          Exhaustive unit tests
  server.test.ts          Startup, shutdown hooks, failure paths
```

## Environment variables

| Variable       | Default       | Description                                                     |
| -------------- | ------------- | --------------------------------------------------------------- |
| `NODE_ENV`     | `development` | `development` \| `test` \| `production`                         |
| `PORT`         | `3000`        | Listening port (0-65535)                                        |
| `HOST`         | `0.0.0.0`     | Listening host                                                  |
| `LOG_LEVEL`    | `info`        | `fatal` to `trace`                                              |
| `CORS_ORIGINS` | `*`           | `*` reflects any origin; otherwise a comma-separated allow-list |

There are no secrets: the API serves static study data and needs no database.

## License

[MIT](LICENSE)
