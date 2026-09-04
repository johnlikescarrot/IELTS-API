# IELTS API

[![Quality](https://github.com/johnlikescarrot/IELTS-API/actions/workflows/quality.yml/badge.svg)](https://github.com/johnlikescarrot/IELTS-API/actions/workflows/quality.yml)
[![Coverage: 100%](https://img.shields.io/badge/coverage-100%25-brightgreen)](#quality)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A compact, cache-friendly TypeScript API for IELTS reference facts, transparent overall-band calculations, and **original CC0 practice prompts**. It is free to run, has no account or API key flow, makes no upstream network call, and returns CORS-enabled JSON.

> **Independent project.** This is not an official IELTS product and is not affiliated with IELTS or its owners. “IELTS” is used solely to identify compatibility with the test format. Always confirm consequential decisions with the official providers and the receiving institution.

## What it provides

- Cited, compact metadata for the four assessed skills.
- An exact and inspectable overall-band calculation from four component scores.
- Published _indicative_ Listening and Reading raw-score thresholds, including a warning that thresholds can vary by test version.
- Five purpose-written, CC0-1.0 practice prompts for Writing and Speaking, filterable by skill and module.
- An OpenAPI 3.1 document at `/openapi.json`, a zero-dependency HTML index at `/docs`, and a machine-readable source list at `/v1/sources`.
- Long-lived public-cache headers for every successful response.

It deliberately does **not** provide official test papers, audio, answer keys, copied model answers, scraped books, user tracking, or score prediction.

## Quick start

Requires Node.js 20 or newer.

```bash
npm ci
npm run check
npm run build
npm start
```

The server binds to `0.0.0.0:3000` by default. Set `PORT` to use another port:

```bash
PORT=8080 npm start
```

No environment variable, secret, payment service, database, account, or authentication header is required.

## API

All routes are public. Successful JSON responses include:

```http
Cache-Control: public, max-age=86400, stale-while-revalidate=604800
```

| Method | Route                 | Purpose                                                 |
| ------ | --------------------- | ------------------------------------------------------- |
| `GET`  | `/` and `/v1`         | Service overview and route discovery                    |
| `GET`  | `/v1/health`          | Dependency-free readiness check                         |
| `GET`  | `/docs`               | Human-friendly documentation index                      |
| `GET`  | `/openapi.json`       | OpenAPI 3.1 contract                                    |
| `GET`  | `/v1/reference`       | Complete sections-and-sources catalog                   |
| `GET`  | `/v1/sections`        | Four section summaries                                  |
| `GET`  | `/v1/sections/:skill` | One of `listening`, `reading`, `writing`, or `speaking` |
| `GET`  | `/v1/sources`         | Citable source records and supported claims             |
| `GET`  | `/v1/scoring`         | Scoring method and indicative raw thresholds            |
| `GET`  | `/v1/scoring/overall` | Calculate an overall band from four component scores    |
| `GET`  | `/v1/scoring/raw`     | Retrieve one published indicative raw threshold         |
| `GET`  | `/v1/practice`        | List original CC0 prompts with optional filters         |
| `GET`  | `/v1/practice/:id`    | Retrieve an original CC0 prompt by ID                   |
| `GET`  | `/v1/citation`        | Citation metadata and repository location               |

### Overall-band calculation

Provide all four component scores as strings between 0 and 9 in 0.5 steps:

```bash
curl 'http://localhost:3000/v1/scoring/overall?listening=6.5&reading=6.5&writing=5.0&speaking=7.0'
```

```json
{
  "average": 6.25,
  "components": {
    "listening": 6.5,
    "reading": 6.5,
    "writing": 5,
    "speaking": 7
  },
  "overallBand": 6.5,
  "rounding": "nearest whole or half band"
}
```

The calculation averages the four components then rounds to the nearest whole or half band. That means an average ending in `.25` goes to the next half band, and one ending in `.75` goes to the next whole band. The implementation is a short, tested pure function in `src/scoring.ts`.

### Indicative raw-score guidance

```bash
curl 'http://localhost:3000/v1/scoring/raw?test=reading_general_training&target=7'
```

The route supports `listening`, `reading_academic`, and `reading_general_training`; targets are 4 through 8 where the cited source publishes an example threshold. It returns `422 threshold_not_published` instead of inventing an unsupported conversion. Raw-score results are guidance only: the official source says exact marks can vary slightly by test version.

### Original practice prompts

```bash
curl 'http://localhost:3000/v1/practice?skill=writing&module=academic&limit=3'
```

`skill` can be `writing` or `speaking`; `module` can be `academic` or `general_training`; `limit` is 1 through 20. A `both` prompt appropriately appears in either module filter. Every returned prompt has the `CC0-1.0` content license.

### Errors

Malformed path or query parameters receive a stable JSON error and HTTP `400`:

```json
{
  "error": "invalid_request",
  "issues": [
    {
      "path": "listening",
      "message": "Use a score from 0 to 9 in 0.5 steps."
    }
  ]
}
```

Missing prompt IDs and routes receive `404`. A syntactically valid raw-score request with no published threshold receives `422`.

## Data and content policy

This API was designed after reviewing the complete Git tree of [`zhengyishiming/IELTS`](https://github.com/zhengyishiming/IELTS) on 2026-09-04. That repository is a heterogeneous collection of binary uploads and had no repository license published in its GitHub metadata at the time of review. Public availability is not permission to redistribute a collection, and it does not establish the rights needed for exam-preparation books, recordings, or test materials.

Accordingly, **no file, extract, answer, transcript, prompt, or dataset from that repository is included, transformed, hosted, or exposed by this project.** The API instead limits itself to small factual reference fields linked to official sources and to newly authored CC0 prompts. This boundary makes the service useful without presenting unlicensed educational material as open data.

The citation records returned by the API identify each supported claim and an access date:

1. IELTS, “[IELTS scoring in detail](https://ielts.org/take-a-test/your-results/ielts-scoring-in-detail)” — overall rounding, raw-score guidance, and Writing weighting.
2. British Council, “[IELTS test format](https://takeielts.britishcouncil.org/take-ielts/prepare/test-format)” — section structure, timing, and task counts.
3. British Council, “[Understanding and explaining IELTS scores](https://takeielts.britishcouncil.org/teach-ielts/test-information/ielts-scores-explained)” — band-scale reporting.

Source metadata is revisioned at `2026-09-04`. External pages can change, so consumers should retain this revision with their analysis and verify current official guidance when necessary.

## Reuse and citation

- **Software:** MIT, see [LICENSE](LICENSE).
- **Original practice prompts:** CC0-1.0, as declared in every prompt response.
- **Reference facts:** small linked factual metadata; the cited official pages remain authoritative.

For academic use, cite the versioned software release and include the pinned source revision. The repository includes [CITATION.cff](CITATION.cff), which GitHub can render as a preferred software citation. On release, archive the tagged release with a DOI provider such as Zenodo, then add that DOI to `CITATION.cff`; this is transparent, durable metadata that supports discoverability. No project can honestly guarantee a specific Google Scholar citation count.

## Quality

```bash
npm run check
```

The check is intentionally strict and runs, in order:

1. Prettier format verification.
2. ESLint for TypeScript.
3. Strict TypeScript type checking.
4. Vitest with V8 coverage thresholds of **100%** for statements, branches, functions, and lines across application modules.

The GitHub Actions workflow also runs [Super-Linter](https://github.com/super-linter/super-linter) `v8.7.0` on every pull request, branch push, and manual dispatch. Its configuration lives in `.github/workflows/quality.yml` and `.github/linters/`. This keeps the required external linter part of the review gate rather than treating it as an optional local convention.

## Development

```bash
npm ci
npm run dev
```

Use `npm run format` to apply formatting. Keep new route behavior covered, preserve the 100% threshold, retain the no-auth/no-network service design, and submit only content that is either original or demonstrably licensed for this use.

## Security and privacy

There is no user account, persistent store, analytics SDK, credential, or outbound API request. CORS is intentionally enabled for public browser clients. Deployers should still place the service behind standard infrastructure controls appropriate to their expected traffic, such as TLS, request-size limits, rate limiting, and monitoring.
