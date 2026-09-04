# IELTS API

[![CI](https://github.com/johnlikescarrot/IELTS-API/actions/workflows/ci.yml/badge.svg)](https://github.com/johnlikescarrot/IELTS-API/actions/workflows/ci.yml)
[![Lint](https://github.com/johnlikescarrot/IELTS-API/actions/workflows/super-linter.yml/badge.svg)](https://github.com/johnlikescarrot/IELTS-API/actions/workflows/super-linter.yml)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)](#testing)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![No auth](https://img.shields.io/badge/auth-none-success)](#no-authentication-ever)

**A free, open, zero-authentication IELTS API written in TypeScript.**
Band score conversion, CEFR alignment, deterministic writing analytics, and
openly licensed practice content — with no API key, no quota, no sign-up, and
no runtime dependencies.

---

## Table of contents

- [Why this project exists](#why-this-project-exists)
- [Design goals](#design-goals)
- [Quick start](#quick-start)
- [No authentication, ever](#no-authentication-ever)
- [API reference](#api-reference)
- [Scoring methodology](#scoring-methodology)
- [Reproducibility](#reproducibility)
- [Testing](#testing)
- [Linting](#linting)
- [Citing this work](#citing-this-work)
- [Limitations](#limitations)
- [Contributing](#contributing)
- [License](#license)

---

## Why this project exists

Research and courseware around the International English Language Testing
System (IELTS) is fragmented across PDFs, spreadsheets and paywalled tools. The
widely shared [`zhengyishiming/IELTS`](https://github.com/zhengyishiming/IELTS)
repository is representative: a valuable but unstructured pile of preparation
material with no programmable interface.

This project turns that domain into a **machine-readable, permanently free
service**. Researchers can compute band conversions reproducibly, courseware
authors can pull openly licensed prompts, and learners can get transparent,
explainable feedback without handing over an email address.

## Design goals

| Goal                          | How it is met                                                  |
| ----------------------------- | -------------------------------------------------------------- |
| **Free forever**              | MIT licensed, self-hostable in one command.                    |
| **No authentication**         | There is no auth middleware in the codebase at all.            |
| **Zero runtime dependencies** | Only the Node standard library is used.                        |
| **Deterministic**             | No randomness, no network calls, no model weights.             |
| **Fully typed**               | `strict` TypeScript with `noUncheckedIndexedAccess`.           |
| **100% covered**              | Enforced thresholds on lines, branches, functions, statements. |
| **Fast**                      | In-memory data, O(1)/O(n) lookups, no I/O per request.         |

## Quick start

```bash
git clone https://github.com/johnlikescarrot/IELTS-API.git
cd IELTS-API
npm install
npm run build
npm start           # http://0.0.0.0:3000
```

Or use it as a library:

```ts
import { createApp, overallBand, estimateWriting } from 'ielts-api';

overallBand({ listening: 7, reading: 6.5, writing: 6, speaking: 7 });
// → { overall: 6.5, mean: 6.625, components: { ... } }

estimateWriting('Universities occupy a central place...', 2).estimatedBand;
```

Try it live:

```bash
curl 'http://localhost:3000/v1/band/convert?skill=listening&rawScore=30'
curl -X POST http://localhost:3000/v1/writing/analyze \
  -H 'content-type: application/json' \
  -d '{"text":"However, cities change. Moreover, they grow.","task":2}'
```

## No authentication, ever

There is no API key, no bearer token, no OAuth flow, no rate-limit header and
no account system anywhere in this repository. Every endpoint responds to an
anonymous request, and `Access-Control-Allow-Origin: *` is set on every
response so the API can be called directly from a browser.

## API reference

The full machine-readable contract is served at `GET /openapi.json`
(OpenAPI 3.1, `security: []`).

### Discovery

| Method | Path            | Description                               |
| ------ | --------------- | ----------------------------------------- |
| `GET`  | `/`             | Service index and endpoint listing.       |
| `GET`  | `/health`       | Liveness probe.                           |
| `GET`  | `/v1/meta`      | Dataset counts, supported enums, licence. |
| `GET`  | `/openapi.json` | OpenAPI 3.1 document.                     |

### Band scores

| Method | Path               | Description                                   |
| ------ | ------------------ | --------------------------------------------- |
| `POST` | `/v1/band/overall` | Overall band from four skill bands.           |
| `GET`  | `/v1/band/convert` | Raw score (0–40) → indicative band.           |
| `GET`  | `/v1/band/target`  | Extra marks needed for a target band.         |
| `GET`  | `/v1/band/round`   | Round a value to the nearest reportable band. |

```jsonc
// POST /v1/band/overall  {"listening":7,"reading":6.5,"writing":6,"speaking":7}
{
  "overall": 6.5,
  "mean": 6.625,
  "components": { "listening": 7, "reading": 6.5, "writing": 6, "speaking": 7 },
  "cefr": { "level": "B2", "minBand": 5.5, "maxBand": 6.5, "descriptor": "..." },
}
```

### CEFR alignment

| Method | Path                    | Description                  |
| ------ | ----------------------- | ---------------------------- |
| `GET`  | `/v1/cefr`              | Full mapping table.          |
| `GET`  | `/v1/cefr/band/:band`   | CEFR level for a band.       |
| `GET`  | `/v1/cefr/level/:level` | Band range for a CEFR level. |

### Vocabulary

| Method | Path                       | Description                                         |
| ------ | -------------------------- | --------------------------------------------------- |
| `GET`  | `/v1/vocabulary`           | Academic entries; filter by `sublist`, `cefr`, `q`. |
| `GET`  | `/v1/vocabulary/:headword` | A single entry with collocations.                   |
| `GET`  | `/v1/cohesive-devices`     | Discourse markers for coherence and cohesion.       |

### Practice content

| Method | Path                             | Description                                          |
| ------ | -------------------------------- | ---------------------------------------------------- |
| `GET`  | `/v1/prompts/writing`            | Task 1 and 2 prompts; filter by `module`, `task`.    |
| `GET`  | `/v1/prompts/writing/:id`        | A single writing prompt.                             |
| `GET`  | `/v1/prompts/speaking`           | Parts 1–3 prompts; filter by `part`.                 |
| `GET`  | `/v1/prompts/speaking/:id`       | A single speaking prompt.                            |
| `GET`  | `/v1/reading/passages`           | Passage index; filter by `module`.                   |
| `GET`  | `/v1/reading/passages/:id`       | Passage text and questions (`?includeAnswers=true`). |
| `POST` | `/v1/reading/passages/:id/check` | Mark a set of submitted answers.                     |

### Analysis

| Method | Path                  | Description                                 |
| ------ | --------------------- | ------------------------------------------- |
| `POST` | `/v1/writing/analyze` | Deterministic four-criterion band estimate. |
| `POST` | `/v1/text/metrics`    | Readability and lexical metrics only.       |

List endpoints accept `limit` (1–100, default 20) and `offset`, and return
`{ items, total, limit, offset }`.

### Errors

Every failure returns the same envelope:

```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "'skill' must be one of: listening, reading",
    "details": { "field": "skill" }
  }
}
```

Codes: `BAD_REQUEST` (400), `NOT_FOUND` (404), `METHOD_NOT_ALLOWED` (405),
`UNPROCESSABLE` (422), `INTERNAL` (500).

## Scoring methodology

**Band rounding.** IELTS reports whole and half bands: a mean ending in `.25`
rounds up to the next half band and `.75` rounds up to the next whole band.
`roundToBand` implements exactly this rule.

**Raw-score conversion.** `src/core/bands.ts` contains three conversion tables
(listening, academic reading, general training reading) expressed as
`[minimumRawScore, band]` pairs, following the charts published in the
Cambridge IELTS practice test series. Real tests are equated individually, so
these are _indicative_.

**Writing estimate.** `/v1/writing/analyze` applies a transparent rubric over
surface features, one component per official criterion:

| Criterion                      | Signals used                                              |
| ------------------------------ | --------------------------------------------------------- |
| Task achievement               | Word count against the 150/250 minimum; paragraph count.  |
| Coherence and cohesion         | Distinct cohesive devices; paragraph structure.           |
| Lexical resource               | Type–token ratio; academic headwords; polysyllabic ratio. |
| Grammatical range and accuracy | Sentence-length variance; subordinators.                  |

Each component is linearly scaled into a band range, rounded to the nearest
reportable band, then averaged. Readability uses the standard Flesch Reading
Ease and Flesch–Kincaid Grade Level formulas over a vowel-group syllable
heuristic with silent-`e` correction.

This is **not** an official band score and does not model argument quality or
grammatical accuracy. It is a reproducible baseline: given identical input it
returns identical output, forever, with no model drift.

## Reproducibility

- No randomness, no clocks, no network I/O in any scoring path.
- No runtime dependencies, so results cannot drift with a transitive upgrade.
- All data is in-repo, versioned, and MIT licensed.
- Pin a commit SHA in your methods section and any reviewer can reproduce every
  number in one `npm ci && npm test`.

## Testing

```bash
npm test        # vitest + v8 coverage, 100% thresholds enforced
```

Coverage thresholds for lines, statements, branches and functions are all set
to 100 in `vitest.config.ts`; the suite fails if any of them regress.

## Linting

```bash
npm run lint    # eslint + typescript-eslint
npm run format  # prettier --check
```

The repository additionally runs
[super-linter](https://github.com/super-linter/super-linter) on every push and
pull request via `.github/workflows/super-linter.yml`.

## Citing this work

If this software supports your research, please cite it. Machine-readable
metadata lives in [`CITATION.cff`](CITATION.cff), which GitHub renders as a
"Cite this repository" button and exports to BibTeX and APA.

```bibtex
@software{ielts_api,
  title  = {IELTS API: a free, open, no-authentication TypeScript API for
            IELTS band conversion, CEFR alignment and writing analytics},
  author = {{IELTS API Contributors}},
  year   = {2026},
  url    = {https://github.com/johnlikescarrot/IELTS-API},
  license = {MIT},
  version = {1.0.0}
}
```

## Limitations

- Band estimates are indicative, not official, and are not validated against
  human rater scores.
- Raw-score conversion tables are approximations of equated live tests.
- Speaking is served as prompts only; no audio processing is performed.
- The bundled corpora are deliberately small, curated and originally authored
  so that they can be redistributed freely.

## Contributing

Issues and pull requests are welcome. Please keep the project dependency-free
at runtime, keep coverage at 100%, and make sure `npm run lint` and `npm test`
pass before opening a PR.

## License

[MIT](LICENSE).
