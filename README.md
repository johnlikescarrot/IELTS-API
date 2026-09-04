# IELTS-API

**A free, authentication-free, dependency-free and fully reproducible reference
implementation of IELTS scoring and language-assessment analytics, written in
TypeScript.**

[![Verify](https://github.com/johnlikescarrot/IELTS-API/actions/workflows/verify.yml/badge.svg)](https://github.com/johnlikescarrot/IELTS-API/actions/workflows/verify.yml)
[![Super-Linter](https://github.com/johnlikescarrot/IELTS-API/actions/workflows/super-linter.yml/badge.svg)](https://github.com/johnlikescarrot/IELTS-API/actions/workflows/super-linter.yml)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)](#testing-and-coverage)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![OpenAPI 3.1](https://img.shields.io/badge/OpenAPI-3.1-6ba539)](openapi.json)
[![No auth required](https://img.shields.io/badge/auth-none%20required-success)](#no-authentication-ever)

---

## Why this exists

Research, courseware and study tools that touch IELTS repeatedly reimplement the
same small set of rules — and repeatedly get them wrong. The Overall Band Score
rounding rule is not ordinary rounding. Academic and General Training Reading use
different conversion tables. The published CEFR alignment does not cover scores
below band 4. Automated writing feedback is usually a black box that cannot be
audited, replicated or cited.

IELTS-API is a single, small, dependency-free artefact that gets those details
right, states its sources, and behaves identically every time it is called, so
that results computed with it can be reproduced by anyone, forever.

## Design principles

| Principle             | What it means here                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Free and open**     | MIT licensed, no account, no key, no quota, no telemetry.                                                           |
| **No authentication** | There is no authentication code path in the repository. `security: []` is declared in the OpenAPI document.         |
| **Zero runtime deps** | `dependencies` in `package.json` is empty. Only the Node standard library is used.                                  |
| **Deterministic**     | Identical requests produce byte-identical bodies. Random sampling is seeded and the seed is echoed in the response. |
| **Glass box**         | Every estimated score is returned with the features and the rationale that produced it.                             |
| **Citable**           | `CITATION.cff`, `codemeta.json`, `.zenodo.json` and a `/v1/citation` endpoint served by the API itself.             |
| **Verified**          | 100% statement, branch, function and line coverage, enforced in CI, plus super-linter on every push.                |

## No authentication, ever

Every endpoint is public. There is no API key, bearer token, session, cookie or
account anywhere in this project, and none will be added: the OpenAPI document
declares an empty `security` array and an empty `securitySchemes` object, and the
test suite asserts that no `WWW-Authenticate` header is ever emitted. CORS is
open (`Access-Control-Allow-Origin: *`) so the API can be called directly from a
browser, a notebook or a static site.

## Quick start

### Run the server

```bash
git clone https://github.com/johnlikescarrot/IELTS-API.git
cd IELTS-API
npm ci
npm run build
npm start           # listens on http://0.0.0.0:3000
```

```bash
curl 'http://localhost:3000/v1/score/overall?listening=6.5&reading=6.5&writing=6&speaking=6'
```

```json
{
  "data": {
    "components": {
      "listening": 6.5,
      "reading": 6.5,
      "writing": 6,
      "speaking": 6
    },
    "mean": 6.25,
    "overall": 6.5,
    "rounding": "to-half",
    "cefr": "B2",
    "rule": "A mean fraction of exactly .25 rounds up to the next half band and exactly .75 rounds up to the next whole band."
  }
}
```

Interactive documentation is served at `/docs`; the machine-readable
specification is served at `/openapi.json` and committed as
[`openapi.json`](openapi.json).

### Use it as a library

```ts
import {
  analyseWriting,
  overallBandScore,
  rawScoreToBand,
  cefrForBand,
} from "ielts-api";

rawScoreToBand("reading-academic", 30).band; // 7
rawScoreToBand("reading-general-training", 30).band; // 6
overallBandScore({ listening: 7, reading: 7, writing: 6.5, speaking: 6.5 })
  .overall; // 7
cefrForBand(7).level; // "C1"

const report = analyseWriting(essay, { task: 2 });
report.estimatedBand; // e.g. 6.5
report.criteria[0].rationale; // why that criterion scored what it scored
```

### Embed it anywhere

The whole API is a pure function from a request value to a response value, so it
can be mounted in any runtime without the Node adapter:

```ts
import { createApp } from "ielts-api";

const app = createApp();
const response = app.handle({
  method: "GET",
  path: "/v1/bands/7",
  query: new URLSearchParams(),
  headers: {},
  body: null,
});
```

## Endpoints

### Service

| Method | Path             | Purpose                                                |
| ------ | ---------------- | ------------------------------------------------------ |
| GET    | `/`              | Service index listing every endpoint                   |
| GET    | `/health`        | Liveness probe with no timestamps                      |
| GET    | `/docs`          | Self-contained HTML documentation, no external assets  |
| GET    | `/openapi.json`  | OpenAPI 3.1 document generated from the route table    |
| GET    | `/v1/meta`       | Version, licence, authentication and determinism facts |
| GET    | `/v1/citation`   | Citation metadata and a ready-to-paste BibTeX entry    |
| GET    | `/v1/references` | Bibliography of the bundled datasets and formulas      |

### Scale and alignment

| Method | Path                       | Purpose                               |
| ------ | -------------------------- | ------------------------------------- |
| GET    | `/v1/bands`                | The 19 reportable band scores         |
| GET    | `/v1/bands/{band}`         | One band with its scale description   |
| GET    | `/v1/cefr`                 | The IELTS-to-CEFR alignment table     |
| GET    | `/v1/cefr/{band}`          | CEFR level for one band               |
| GET    | `/v1/descriptors`          | Rubrics and the criteria they assess  |
| GET    | `/v1/descriptors/{rubric}` | Analytic band descriptors, filterable |

### Scoring

| Method | Path                           | Purpose                                          |
| ------ | ------------------------------ | ------------------------------------------------ |
| GET    | `/v1/conversion`               | All raw-score conversion tables                  |
| GET    | `/v1/conversion/{paper}`       | One conversion table                             |
| GET    | `/v1/conversion/{paper}/{raw}` | Convert a raw score, with marks to the next band |
| GET    | `/v1/score/raw`                | Convert using `skill` and `module`               |
| GET    | `/v1/score/requirements`       | Minimum raw score for each band                  |
| GET    | `/v1/score/overall`            | Overall Band Score from four components          |
| POST   | `/v1/score/overall`            | The same, from a JSON body                       |
| POST   | `/v1/score/criteria`           | Average analytic criterion scores                |
| GET    | `/v1/score/round`              | Apply the rounding rule to an arbitrary mean     |
| GET    | `/v1/score/target`             | Score still needed in the outstanding skill      |

### Vocabulary, writing, speaking and text analytics

| Method | Path                        | Purpose                                             |
| ------ | --------------------------- | --------------------------------------------------- |
| GET    | `/v1/vocabulary`            | Browse the 570 Academic Word List families          |
| GET    | `/v1/vocabulary/sublists`   | Sublist summary                                     |
| GET    | `/v1/vocabulary/random`     | Seeded, reproducible sample                         |
| GET    | `/v1/vocabulary/{word}`     | Resolve any word form to its family                 |
| GET    | `/v1/vocabulary-stats`      | Size of the bundled lexical resources               |
| GET    | `/v1/writing/tasks`         | Browse the Writing prompt corpus                    |
| GET    | `/v1/writing/tasks/random`  | Seeded, reproducible prompt selection               |
| GET    | `/v1/writing/tasks/{id}`    | One prompt                                          |
| GET    | `/v1/writing/mistakes`      | The auditable common-mistake rule base              |
| POST   | `/v1/writing/check`         | Detect common mistakes with positions               |
| POST   | `/v1/writing/analyse`       | Transparent per-criterion band estimate             |
| GET    | `/v1/speaking/topics`       | Topic index                                         |
| GET    | `/v1/speaking/questions`    | Part 1 and Part 3 questions                         |
| GET    | `/v1/speaking/cue-cards`    | Part 2 long-turn cue cards                          |
| GET    | `/v1/speaking/mock-test`    | A seeded three-part mock interview                  |
| POST   | `/v1/text/readability`      | Four classical readability indices                  |
| POST   | `/v1/text/lexical-profile`  | Academic Word List coverage by sublist              |
| POST   | `/v1/text/cohesion`         | Cohesive devices by rhetorical function             |
| POST   | `/v1/text/segment`          | The exact tokenisation used by every other endpoint |
| GET    | `/v1/text/cohesive-devices` | The cohesive-device inventory                       |

## What the numbers mean

- **Overall Band Score.** The mean of the four components, rounded so that a
  fractional part of exactly `.25` rounds **up** to the next half band and exactly
  `.75` rounds **up** to the next whole band. The service reports the unrounded
  mean and names the rounding branch it took, so the arithmetic is auditable.
- **Raw-score conversion.** Listening uses one table for both modules; Reading
  uses different tables for Academic and General Training. The tables are exposed
  as data at `/v1/conversion` and can be inspected, cited or substituted.
- **CEFR alignment.** Only bands 4.0 and above are aligned by the test owners.
  Lower scores are returned as `below-B1` with `aligned: false` rather than being
  mapped speculatively.
- **Writing band estimate.** A deterministic rubric over text-internal features:
  length against the rubric minimum, paragraphing, cohesive-device range and
  density, Academic Word List coverage, lexical variety, rule-based error density
  and sentence length. It does **not** assess topical relevance, factual accuracy
  or originality, and it is **not** a prediction of an examiner award. Every
  criterion score is returned with its rationale so the estimate can be argued
  with rather than merely believed.

## Testing and coverage

```bash
npm run typecheck     # tsc --noEmit, strict
npm run lint          # ESLint 9, flat config
npm run format:check  # Prettier
npm run test:coverage # Vitest with 100% thresholds for lines, branches,
                      # functions and statements
npm run determinism   # byte-identical response check
npm run verify        # all of the above plus a build
```

Coverage thresholds are set to 100% and the build fails below them. The only file
excluded from the coverage report is `src/http/route.ts`, which contains type
declarations exclusively and has no executable statements. Notable properties are
verified exhaustively rather than by example: every one of the 130 321
combinations of four component band scores is checked against the rounding rule,
and every raw score from 0 to 40 is checked against all three conversion tables.

Super-linter runs over the whole code base on every push and every pull request
via [`.github/workflows/super-linter.yml`](.github/workflows/super-linter.yml).

## Reproducibility

See [`docs/reproducibility.md`](docs/reproducibility.md). In short: no clock, no
filesystem, no network and no unseeded randomness is read on any request path, so
a given version of this software answers a given request the same way on every
machine, forever. `scripts/check-determinism.mjs` asserts this in CI.

## Data provenance

See [`docs/data-provenance.md`](docs/data-provenance.md) for the origin, licence
and transformation history of every bundled dataset, including the Academic Word
List, the conversion tables, the descriptor paraphrases and the original prompt
and rule corpora.

## How to cite

If this software supports your research, teaching or product, please cite it.
Citation metadata is available at runtime from `/v1/citation`, and in the
repository from [`CITATION.cff`](CITATION.cff), [`codemeta.json`](codemeta.json)
and [`.zenodo.json`](.zenodo.json).

```bibtex
@software{ielts_api,
  title   = {IELTS-API: a free, authentication-free, reproducible reference
             implementation of IELTS scoring and language-assessment analytics},
  author  = {{IELTS-API Contributors}},
  year    = {2026},
  version = {1.0.0},
  license = {MIT},
  url     = {https://github.com/johnlikescarrot/IELTS-API}
}
```

The scholarly sources behind the bundled data and formulas are listed in
[`paper/paper.bib`](paper/paper.bib) and served from `/v1/references`.

## Contributing

Contributions are welcome; see [`CONTRIBUTING.md`](CONTRIBUTING.md). The bar is
simple: new behaviour needs tests, coverage stays at 100%, super-linter stays
green, and any new datum arrives with its provenance.

## Disclaimer

IELTS is a registered trademark of the British Council, IDP: IELTS Australia and
Cambridge University Press & Assessment. This project is independent, is not
affiliated with, endorsed by or connected to any of them, and reproduces no
copyrighted test material. Band descriptors bundled here are original
paraphrases, and all prompts and rules are original works released under the MIT
licence.

## License

[MIT](LICENSE)
