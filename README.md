# IELTS-API

[![CI](https://github.com/johnlikescarrot/IELTS-API/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/johnlikescarrot/IELTS-API/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22.18-green.svg)](package.json)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen.svg)](vitest.config.ts)
[![Dependencies](https://img.shields.io/badge/runtime%20deps-0-success.svg)](package.json)

A free, open, **no-authentication** REST API for IELTS study data, written in
TypeScript with **zero runtime dependencies**. It serves structured, original
study material — academic vocabulary with CEFR levels, speaking topics for all
three test parts, writing prompts for Academic and General Training, common
learner mistakes with corrections, paraphrased band descriptors, and an
official-rule band-score calculator.

- No API key. No account. No rate limit. No tracking.
- `Access-Control-Allow-Origin: *` — call it from any web page.
- `ETag` + `304 Not Modified` conditional caching on all data endpoints.
- An OpenAPI 3.1 document at [`/openapi.json`](#openapi) and machine-readable
  citation formats for scholarly use.

## Quick start

```bash
git clone https://github.com/johnlikescarrot/IELTS-API.git
cd IELTS-API
npm install
npm run build
npm start              # IELTS-API listening on http://0.0.0.0:3000
```

Or run directly from source on Node.js >= 22.18 (no build step):

```bash
npm install
npm run dev            # uses Node's native TypeScript stripping
```

Then:

```bash
curl http://localhost:3000/v1/vocabulary/random
```

```json
{
  "data": [
    {
      "id": 21,
      "word": "sustainable",
      "phonetic": "/səˈsteɪnəbl/",
      "partOfSpeech": "adjective",
      "cefr": "B2",
      "topics": ["environment"],
      "definition": "Able to continue over time without damaging the planet or using up resources.",
      "example": "Cities are investing in sustainable transport such as cycling.",
      "synonyms": ["eco-friendly", "viable"],
      "collocations": ["sustainable development", "sustainable farming"]
    }
  ],
  "meta": { "seed": "2026-09-04", "count": 1, "available": 120 }
}
```

## Endpoints

| Method | Path                       | Description                                                           |
| ------ | -------------------------- | --------------------------------------------------------------------- |
| GET    | `/`                        | API index listing every endpoint.                                     |
| GET    | `/health`                  | Liveness, version and uptime.                                         |
| GET    | `/v1/vocabulary`           | Vocabulary with filters, search, sorting and pagination.              |
| GET    | `/v1/vocabulary/:idOrWord` | One entry by numeric id or exact word (e.g. `1` or `curriculum`).     |
| GET    | `/v1/vocabulary/random`    | Deterministic sample; seed defaults to today (word of the day).       |
| GET    | `/v1/topics`               | Vocabulary topics with entry counts.                                  |
| GET    | `/v1/speaking`             | Speaking topics for Parts 1, 2 and 3.                                 |
| GET    | `/v1/speaking/:id`         | One topic by slug, e.g. `work-and-career`.                            |
| GET    | `/v1/speaking/random`      | Deterministic sample of speaking topics.                              |
| GET    | `/v1/writing`              | Academic and General Training writing prompts.                        |
| GET    | `/v1/writing/:id`          | One prompt, e.g. `w001`.                                              |
| GET    | `/v1/writing/random`       | Deterministic sample of prompts.                                      |
| GET    | `/v1/mistakes`             | Common learner mistakes with corrections and explanations.            |
| GET    | `/v1/band-descriptors`     | Paraphrased descriptors (bands 5-9) plus the overall nine-band scale. |
| GET    | `/v1/band-score`           | The official overall-score rounding rules.                            |
| POST   | `/v1/band-score`           | Calculate an overall band score.                                      |
| GET    | `/v1/tips`                 | Study tips by skill.                                                  |
| GET    | `/v1/citation`             | Citation metadata: BibTeX, RIS, APA 7 or JSON.                        |
| GET    | `/openapi.json`            | The OpenAPI 3.1 document.                                             |

## Datasets

All data was authored originally for this project; nothing is copied from
copyrighted practice tests. The topical coverage (vocabulary, writing samples,
common mistakes, exercises) is inspired by the kinds of materials collected in
open study repositories such as
[zhengyishiming/IELTS](https://github.com/zhengyishiming/IELTS), restructured
as clean, queryable JSON.

| Dataset       | Size | Notes                                                         |
| ------------- | ---- | ------------------------------------------------------------- |
| Vocabulary    | 120  | 12 topics, CEFR A2-C2, IPA, synonyms, collocations.           |
| Speaking      | 10   | Full Part 1/2/3 sets with cue cards and follow-ups.           |
| Writing       | 30   | Academic Task 1 and 2; General Training letters and essays.   |
| Mistakes      | 40   | Incorrect/correct pairs with explanations, by category.       |
| Descriptors   | 10   | Bands 5-9 for writing and speaking (paraphrased, unofficial). |
| Overall scale | 10   | The standard nine-band labels and meanings.                   |
| Tips          | 24   | Four skills plus general strategy.                            |

Dataset integrity (unique ids, complete fields, valid enums) is enforced by the
test suite in `tests/datasets.test.ts`.

## Query conventions

### Pagination

List endpoints accept `page` (default 1) and `per_page` (default 20, max 100)
and return a `meta` object with HATEOAS-style links that preserve your filters:

```json
{
  "data": [],
  "meta": {
    "page": 2,
    "perPage": 20,
    "total": 120,
    "totalPages": 6,
    "links": {
      "self": "/v1/vocabulary?per_page=20&page=2",
      "first": "/v1/vocabulary?per_page=20&page=1",
      "prev": "/v1/vocabulary?per_page=20&page=1",
      "next": "/v1/vocabulary?per_page=20&page=3",
      "last": "/v1/vocabulary?per_page=20&page=6"
    }
  }
}
```

### Filtering and search

- `topic=environment`, `cefr=B2`, `part_of_speech=verb` (vocabulary)
- `module=academic`, `task=2`, `type=opinion` (writing)
- `category=spelling` (mistakes), `skill=speaking` (tips)
- `q=` free-text search with AND semantics: every word must appear in the
  entry's text fields, e.g. `/v1/vocabulary?q=urban%20city`.

Invalid values return `400` with the allowed list in `error.details`, never a
silent empty result.

### Deterministic sampling

Every `/random` endpoint accepts `count` and `seed`. The same seed always
returns the same sample, so `/v1/vocabulary/random` without a seed defaults to
today's UTC date — a stable "word of the day" you can build a widget on.

### Band-score calculator

```bash
curl -X POST http://localhost:3000/v1/band-score \
  -H "Content-Type: application/json" \
  -d '{"listening": 6.5, "reading": 6, "writing": 6, "speaking": 6.5}'
```

```json
{ "data": { "listening": 6.5, "reading": 6, "writing": 6, "speaking": 6.5, "overall": 6.5 } }
```

Scores must be 0-9 in half bands. The overall is the mean rounded to the
nearest half band with quarter bands rounding up (6.25 to 6.5, 6.75 to 7.0) —
exactly how IELTS reports it.

### Errors

Every failure is a JSON envelope with a machine-readable code and, where
useful, per-parameter details:

```json
{
  "error": {
    "status": 400,
    "code": "invalid_parameter",
    "message": "Parameter 'cefr' is invalid: 'C9' is not one of the allowed values.",
    "details": [{ "param": "cefr", "message": "..." }]
  }
}
```

Codes: `not_found`, `method_not_allowed`, `invalid_parameter`, `invalid_body`,
`invalid_json`, `unsupported_media_type`, `payload_too_large`, `internal_error`.
Wrong methods still answer with an `Allow` header; `OPTIONS` preflights get
`204 No Content`.

## Citing IELTS-API in research

The project ships a [`CITATION.cff`](CITATION.cff) (shown by GitHub's
"Cite this repository" button), and the API itself serves citation metadata at
`/v1/citation?format=bibtex|ris|apa|json` so tools can credit it mechanically.

BibTeX:

```bibtex
@software{ielts_api_2026,
  author = {{IELTS-API Contributors}},
  title = {IELTS-API: a free and open REST API for IELTS study data},
  year = {2026},
  version = {1.0.0},
  url = {https://github.com/johnlikescarrot/IELTS-API},
  license = {MIT}
}
```

APA 7:

> IELTS-API Contributors. (2026). _IELTS-API: A free and open REST API for
> IELTS study data_ (Version 1.0.0) [Computer software]. GitHub.
> <https://github.com/johnlikescarrot/IELTS-API>

Tips for maximal scholarly visibility: enable Zenodo or another DOI minting
service on this repository, cite the specific version you used, and reference
the `/v1/citation` endpoint in supplementary materials so readers can fetch
the exact metadata.

## OpenAPI

`/openapi.json` serves a complete OpenAPI 3.1 document. Paste it into
[Swagger Editor](https://editor.swagger.io/) or import it into Postman/Insomnia
to explore the API interactively. A test asserts the document and the route
table can never drift apart.

## Project structure

```text
src/
  app.ts            server wiring: dispatch, caching, errors, lifecycle
  server.ts         entry point (starts only when run directly)
  openapi.ts        the OpenAPI 3.1 document
  citation.ts       BibTeX/RIS/APA renderers
  version.ts        single source of truth for the version string
  types.ts          shared domain types
  lib/              router, validation, pagination, search, seeded random,
                    band maths, body parsing, errors, ETag/CORS helpers
  data/             the datasets (pure typed constants)
  routes/           one module per resource plus the route table
tests/              unit and integration tests (100% coverage enforced)
.github/            CI workflow (super-linter + build/test), dependabot
```

## Development

```bash
npm run dev            # run from source with node --watch
npm run build          # type-check and emit to dist/
npm start              # run the built server
npm test               # run the test suite
npm run test:coverage  # run tests with the 100% coverage gate
npm run lint           # ESLint (typescript-eslint)
npm run format         # Prettier write
npm run format:check   # Prettier check (matches super-linter)
```

Quality gates enforced in CI on every push and pull request:

- **super-linter** lints the whole repository (Markdown, YAML, JSON, Dockerfile,
  GitHub Actions, secrets, and more). TypeScript linting runs through the
  project's own stricter `eslint` + `prettier` + `tsc` job.
- **100% coverage** — statements, branches, functions and lines — is a hard
  threshold in `vitest.config.ts`; CI fails below it.
- A **smoke test** boots the built server and hits `/health`.

Environment variables: `PORT` (default 3000) and `HOST` (default `0.0.0.0`).
The server handles `SIGTERM`/`SIGINT` gracefully, so it drops into any
container or platform unchanged — see the included `Dockerfile`.

## Contributing

Pull requests are welcome. Keep coverage at 100%, add tests for any new
behaviour, and keep datasets original. CI must pass (super-linter plus the
build/test job) before merge.

## License

[MIT](LICENSE) — free for any use, including commercial and academic.
