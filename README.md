# IELTS API

**A free, open, no-authentication REST API for IELTS preparation research.**

[![ci](https://github.com/johnlikescarrot/IELTS-API/actions/workflows/ci.yml/badge.svg)](https://github.com/johnlikescarrot/IELTS-API/actions/workflows/ci.yml)
[![super-linter](https://github.com/johnlikescarrot/IELTS-API/actions/workflows/super-linter.yml/badge.svg)](https://github.com/johnlikescarrot/IELTS-API/actions/workflows/super-linter.yml)
[![coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)](https://github.com/johnlikescarrot/IELTS-API)
[![license: MIT](https://img.shields.io/badge/code%20license-MIT-blue.svg)](LICENSE)
[![data license: CC BY 4.0](https://img.shields.io/badge/data%20license-CC%20BY%204.0-lightgrey.svg)](DATA-LICENSE)
[![zero runtime dependencies](https://img.shields.io/badge/runtime%20dependencies-0-success)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6.svg)](https://www.typescriptlang.org/)

---

## Why this exists

IELTS preparation data is everywhere and machine-readable almost nowhere: vocabulary lists live in
workbooks, band descriptors live in PDFs, and score concordances live in marketing pages. This API
turns that material into a stable, versioned, citable HTTP contract with **no API key, no
registration, and no rate limiting by key** — so a researcher can cite it, archive a response, and
reproduce a result years later.

The legacy vocabulary and corpus index derive from [`zhengyishiming/IELTS`][corpus].
The new original Reading collection is informed by a pinned structural review of
[`ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS`](docs/UPSTREAM-REVIEW.md), without copying its
questions, audio or login system. See [RESEARCH.md](RESEARCH.md) for methodology and
[paper/paper.md](paper/paper.md) for the **draft, not peer-reviewed** manuscript.

## Quick start

```bash
npm ci
npm run build
npm start
# Listens on 0.0.0.0:3000; no account or external service is needed.
```

```bash
# 4,174 headwords from Cambridge IELTS volumes 1-22
curl -s "http://localhost:3000/v1/vocabulary?q=environment&limit=3"

# Overall band score, with the IELTS rounding rule applied
curl -s "http://localhost:3000/v1/scores/overall?listening=7&reading=6.5&writing=6&speaking=7"

# One headword, with phonetics, senses and morpheme hints
curl -s "http://localhost:3000/v1/vocabulary/atmosphere"
```

Open <http://localhost:3000/docs> for the human-readable documentation and
`/openapi.json` for the OpenAPI 3.1 document.

```js
import { startApiServer, searchVocabulary, calculateOverall } from './dist/index.js';

const server = await startApiServer('0.0.0.0', 3000);
// ...or use the library without a server:
const page = searchVocabulary({ query: 'sustainab', limit: 10, offset: 0 });
```

## Datasets

| Dataset                         |                                            Size | Endpoint                | Provenance                                                        |
| ------------------------------- | ----------------------------------------------: | ----------------------- | ----------------------------------------------------------------- |
| Cambridge IELTS 1-22 vocabulary |             4,174 headwords / 4,310 occurrences | `/v1/vocabulary`        | Derived from `1-22yas.xlsx` in [the upstream corpus][corpus]      |
| Analytic band descriptors       |      120 rows (3 sets x 4 criteria x bands 0-9) | `/v1/bands/descriptors` | Original condensed paraphrases (see [DATA-LICENSE](DATA-LICENSE)) |
| Band scale with CEFR levels     |                                         19 rows | `/v1/bands`             | Original compilation                                              |
| Score concordances              |                             5 scales x 11 bands | `/v1/scores/convert`    | Providers' published comparison tables                            |
| Writing Task 2 prompts          | 111 prompts, 15 categories, 5 question families | `/v1/topics/writing`    | Original items modelled on recurring IELTS question families      |
| Speaking items                  |        80 items across Parts 1-3 (26 / 30 / 24) | `/v1/topics/speaking`   | Original items                                                    |
| Writing Task 1 families         |                                10 task families | `/v1/tasks/writing`     | Original compilation                                              |
| Free resources                  |                                    27 resources | `/v1/resources`         | Original catalogue (free + no login only)                         |
| Research corpus index           |                        76 of 404 upstream files | `/v1/corpus`            | Metadata index of [the upstream corpus][corpus]                   |

Original reading materials: **6 fictional passages, 36 questions**, two exercises per editorial
level (`foundation`, `intermediate`, `advanced`). These are AI-assisted original writing under
CC BY 4.0, not official IELTS questions or a calibrated CEFR/band benchmark.

## Endpoints

All endpoints are `GET`, CORS-open, ETag-cached and authentication-free. Every JSON response uses the
same envelope: `{ "status": 200, "data": ..., "meta": ... }`.

| Method | Path                    | Description                                                                                       |
| ------ | ----------------------- | ------------------------------------------------------------------------------------------------- |
| GET    | `/`                     | Service index, dataset sizes, citation links                                                      |
| GET    | `/v1`                   | List every versioned endpoint                                                                     |
| GET    | `/health`               | Liveness and dataset availability                                                                 |
| GET    | `/docs`                 | Human-readable documentation                                                                      |
| GET    | `/openapi.json`         | OpenAPI 3.1 document generated from the live route table                                          |
| GET    | `/v1/vocabulary`        | Search the vocabulary dataset (`q`, `match`, `volume`, `pos`, `sort`, `order`, `limit`, `offset`) |
| GET    | `/v1/vocabulary/stats`  | Dataset statistics                                                                                |
| GET    | `/v1/vocabulary/random` | Seeded random sample (`count`, `seed`)                                                            |
| GET    | `/v1/vocabulary/daily`  | Deterministic entry for a date (`date`, `count`)                                                  |
| GET    | `/v1/vocabulary/:word`  | Look up one headword                                                                              |
| GET    | `/v1/bands`             | The band scale with indicative CEFR levels                                                        |
| GET    | `/v1/bands/descriptors` | Band descriptors (`set`, `criterion`, `band`)                                                     |
| GET    | `/v1/bands/:band`       | One band, with the descriptors that bracket it                                                    |
| GET    | `/v1/scores/overall`    | Overall band from the four components                                                             |
| GET    | `/v1/scores/convert`    | IELTS band to CEFR / TOEFL iBT / Cambridge / PTE / DET                                            |
| GET    | `/v1/scores/interpret`  | Another scale back to an indicative IELTS band                                                    |
| GET    | `/v1/topics/writing`    | Writing Task 2 prompts (`category`, `type`, `q`)                                                  |
| GET    | `/v1/topics/speaking`   | Speaking Parts 1-3 (`part`, `q`)                                                                  |
| GET    | `/v1/tasks/writing`     | Writing Task 1 families (`module`)                                                                |
| GET    | `/v1/corpus`            | Corpus metadata, statistics and facets                                                            |
| GET    | `/v1/corpus/stats`      | Corpus statistics                                                                                 |
| GET    | `/v1/corpus/items`      | Search the corpus index                                                                           |
| GET    | `/v1/resources`         | Free preparation resources (`type`, `q`)                                                          |
| GET    | `/v1/reading`           | Original reading catalogue (`q`, `level`, `topic`, `limit`, `offset`)                             |
| GET    | `/v1/reading/stats`     | Actual counts, dataset version and content SHA-256                                                |
| GET    | `/v1/reading/random`    | Seeded sampling (`seed`, `count`, `q`, `level`, `topic`)                                          |
| GET    | `/v1/reading/:id`       | A passage and questions, without solutions                                                        |
| POST   | `/v1/reading/:id/grade` | Stateless feedback, accepted variants and paragraph evidence                                      |

### Worked examples

**Overall band score.** IELTS averages the four components and rounds to the nearest half band;
means ending in .25 or .75 round **up**.

```jsonc
GET /v1/scores/overall?listening=7&reading=6&writing=6&speaking=6
{
  "status": 200,
  "data": {
    "components": { "listening": 7, "reading": 6, "writing": 6, "speaking": 6 },
    "mean": 6.25, "overall": 6.5, "cefr": "B2", "spread": 1,
    "explanation": "The mean of the four components is 6.25, which falls exactly between two
                    bands; IELTS rounds a .25/.75 mean up, giving 6.5."
  }
}
```

**Vocabulary search.**

```jsonc
GET /v1/vocabulary?q=hydro&match=prefix&limit=2
{
  "status": 200,
  "data": [
    {
      "id": "w02041", "word": "hydrogen", "phonetic": "/'haɪdrədʒən/",
      "partOfSpeech": "noun",
      "definition": "A nonmetallic univalent element that is normally a colorless and odorless ...",
      "senses": [{ "pos": "noun", "text": "..." }],
      "morphemes": "hydro(water);gen(create)",
      "volumes": [1]
    }
  ],
  "meta": { "total": 7, "limit": 2, "offset": 0, "hasMore": true, "match": "prefix" }
}
```

### Original reading practice and feedback

```bash
curl -s 'http://localhost:3000/v1/reading?level=foundation'
curl -s 'http://localhost:3000/v1/reading/random?seed=study-2026&count=2'
curl -s 'http://localhost:3000/v1/reading/library-of-things'
curl -s -X POST 'http://localhost:3000/v1/reading/library-of-things/grade' \
  -H 'Content-Type: application/json' \
  --data '{"answers":[{"questionId":"q1","answer":"B"},{"questionId":"q5","answer":"seven"}]}'
```

That submission earns **2 of 6 marks (33.33%)**; four omitted questions are unanswered. Feedback
includes accepted answers, an explanation and one-based paragraph references for every question.
The percentage is **not an IELTS band score**. Single-choice questions accept option IDs; true/false
questions accept `TRUE`, `FALSE` or `NOT GIVEN`; short answers accept only the listed variants.

- NFC Unicode normalization, lowercasing and collapsed whitespace; punctuation and accents are preserved.
- One mark per question, no fuzzy matching or partial credit; short-answer limits count whitespace-separated words.
- No accounts, cookies, device IDs, answer persistence or third-party calls. Application logs omit
  request bodies and query strings; deployment providers may have their own logging policies.
- JSON bodies are limited to **16 KiB**, **10 seconds**, and **256 Unicode code points per answer**.
  Unknown/duplicate question IDs and unexpected fields are rejected before grading. Browser CORS
  preflight permits `Content-Type`; POST and error responses use `Cache-Control: no-store`.
- Public views omit solutions, but source and grading feedback expose them intentionally. This is
  open practice, **not a secure exam service**.
- Sampling is without replacement and returns fewer items if the filtered pool is smaller than
  `count`. Record the dataset version, SHA-256 and seed to reproduce a selection.

See [research reuse](docs/RESEARCH-REUSE.md) for offline JSONL export, limitations, responsible
experiment design and the citation/archival checklist.

## Reproducible data pipeline

Both datasets are regenerated from source with standard-library-only Python:

```bash
python3 scripts/extract_vocabulary.py 1-22yas.xlsx data/vocabulary.json
python3 scripts/extract_corpus.py tree.json data/corpus.json
```

CI re-derives `data/vocabulary.json` from the upstream workbook on every push and fails if the
committed dataset has drifted.

## Quality

- **100% coverage** — statements, branches, functions and lines, enforced per file by the test
  runner (`npm test` fails below 100%). Zero runtime dependencies; schema-validated HTTP contracts.
- **super-linter** runs on every push, every pull request, weekly, and on demand.
- **Typechecked** with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and
  `noUnusedLocals`.
- **Reproducible stimuli** — ETags, explicit seeds and content hashes support archival comparisons
  within a pinned version. Health uptime and unseeded vocabulary samples are not fixed stimuli.

```bash
npm install
npm run validate   # typecheck + lint + format check + tests with coverage
npm run dev        # hot-reloading server
```

## Deploying

```bash
docker build -t ielts-api .
docker run --rm -p 3000:3000 ielts-api
```

Configuration: `--port` / `PORT`, `--host` / `HOST`, `--silent`, `--help`, `--version`.

## Citing this project

If you use the API or datasets in research, please cite the actual version and commit used.
Citation is scholarly attribution, not a condition for free API access.

```bibtex
@software{ielts_api,
  title   = {IELTS API: a free, no-authentication REST API and open dataset for IELTS preparation research},
  author  = {{The IELTS API contributors}},
  year    = {2026},
  version = {1.0.0},
  url     = {https://github.com/johnlikescarrot/IELTS-API},
  license = {MIT, CC-BY-4.0}
}
```

Machine-readable citation metadata: [`CITATION.cff`](CITATION.cff), [`codemeta.json`](codemeta.json),
[`.zenodo.json`](.zenodo.json). The Zenodo file is an archival template; **no verified DOI is currently
claimed**. A maintainer must enable archiving and verify a real record before advertising one.
See [responsible citation and Google Scholar guidance](docs/RESEARCH-REUSE.md).

Please also cite the upstream corpus the vocabulary dataset was derived from:

```bibtex
@misc{ielts_open_corpus,
  title  = {IELTS: an open corpus of IELTS preparation materials},
  author = {zhengyishiming},
  year   = {2024},
  url    = {https://github.com/zhengyishiming/IELTS}
}
```

## Licence and provenance

- **Code:** [MIT](LICENSE).
- **Data:** [CC BY 4.0](DATA-LICENSE) — attribution required, which is the point.
- **Band descriptors:** original condensed paraphrases, _not_ the official IELTS wording. Cite the
  published descriptors from <https://www.ielts.org/for-organisations/ielts-scoring-in-detail> when
  you need the authoritative text.
- **Score concordances:** indicative values compiled from the providers' own published comparison
  tables. Receiving institutions apply their own rules.
- **Upstream corpus files:** `/v1/corpus` publishes metadata only; the legacy vocabulary dataset is
  separately derived from a workbook with unresolved gloss provenance.
- **Original Reading:** independently authored passages, questions and explanations under CC BY 4.0.
  No material from the reviewed learning platform is rehosted or unlocked.

IELTS is a jointly owned trademark of the British Council, IDP: IELTS Australia and Cambridge
Assessment English. This project is not affiliated with, endorsed by, or connected to the IELTS
partners.

[corpus]: https://github.com/zhengyishiming/IELTS
