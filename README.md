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

The original vocabulary and file index derive from the publicly visible
[`zhengyishiming/IELTS`][corpus] corpus. The new **Reading/Listening practice inventory** audits
[`ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS`][practice-source] at a pinned commit: **1,852 units and
4,707 asset records**, with reproducible availability statistics and SHA-256-verified exports.
Public visibility does not imply an open content licence: the new inventory contains **metadata
only**, not upstream exercises, answers or audio.

Read [RESEARCH.md](RESEARCH.md) for the original corpus methodology and the
[practice data card](docs/UPGRADE-YOUR-IELTS-SKILLS.md) for the new study. The complete technical
report draft is served at `/research` and archived as [HTML](docs/research.html).

## Quick start

```bash
npm ci                      # from this repository checkout
npm run build
npm start
# ielts-api 1.1.0 listening on http://0.0.0.0:3000
```

```bash
# Metadata, not question content: source-labelled beginner reading lessons
curl -s "http://localhost:3000/v1/practice/items?skill=reading&level=a1-a2&limit=3"

# 4,174 headwords from Cambridge IELTS volumes 1-22
curl -s "http://localhost:3000/v1/vocabulary?q=environment&limit=3"

# Overall band score, with the IELTS rounding rule applied
curl -s "http://localhost:3000/v1/scores/overall?listening=7&reading=6.5&writing=6&speaking=7"

# One headword, with phonetics, senses and morpheme hints
curl -s "http://localhost:3000/v1/vocabulary/atmosphere"
```

Open <http://localhost:3000/docs> for the endpoint reference, <http://localhost:3000/research>
for the full report draft, and
`/openapi.json` for the OpenAPI 3.1 document.

```js
import { startApiServer, searchVocabulary, calculateOverall } from 'ielts-api';

const server = await startApiServer('0.0.0.0', 3000);
// ...or use the library without a server:
const page = searchVocabulary({ query: 'sustainab', limit: 10, offset: 0 });
```

## Datasets

| Dataset                              |                                            Size | Endpoint                | Provenance                                                          |
| ------------------------------------ | ----------------------------------------------: | ----------------------- | ------------------------------------------------------------------- |
| Cambridge IELTS 1-22 vocabulary      |             4,174 headwords / 4,310 occurrences | `/v1/vocabulary`        | Derived from `1-22yas.xlsx` in [the upstream corpus][corpus]        |
| Analytic band descriptors            |      120 rows (3 sets x 4 criteria x bands 0-9) | `/v1/bands/descriptors` | Original condensed paraphrases (see [DATA-LICENSE](DATA-LICENSE))   |
| Band scale with CEFR levels          |                                         19 rows | `/v1/bands`             | Original compilation                                                |
| Score concordances                   |                             5 scales x 11 bands | `/v1/scores/convert`    | Providers' published comparison tables                              |
| Writing Task 2 prompts               | 111 prompts, 15 categories, 5 question families | `/v1/topics/writing`    | Original items modelled on recurring IELTS question families        |
| Speaking items                       |        80 items across Parts 1-3 (26 / 30 / 24) | `/v1/topics/speaking`   | Original items                                                      |
| Writing Task 1 families              |                                10 task families | `/v1/tasks/writing`     | Original compilation                                                |
| Free resources                       |                                    27 resources | `/v1/resources`         | Original catalogue (free + no login only)                           |
| Reading/Listening practice inventory |               1,852 units / 4,707 asset records | `/v1/practice`          | Metadata-only audit of [UPGRADE-YOUR-IELTS-SKILLS][practice-source] |
| Research corpus index                |                        76 of 404 upstream files | `/v1/corpus`            | Metadata index of [the upstream corpus][corpus]                     |

## Endpoints

All endpoints are `GET`, CORS-open, ETag-cached and authentication-free (also supporting `HEAD` and
`OPTIONS`). JSON API responses use `{ "status": 200, "data": ..., "meta": ... }`. The OpenAPI document
and `/v1/practice/export` intentionally return raw documents instead of that envelope.

| Method | Path                     | Description                                                                                       |
| ------ | ------------------------ | ------------------------------------------------------------------------------------------------- |
| GET    | `/`                      | Service index, dataset sizes, citation links                                                      |
| GET    | `/v1`                    | List every versioned endpoint                                                                     |
| GET    | `/health`                | Liveness and dataset availability                                                                 |
| GET    | `/docs`                  | Human-readable documentation                                                                      |
| GET    | `/openapi.json`          | OpenAPI 3.1 document generated from the live route table                                          |
| GET    | `/research`              | Full technical report draft with abstract, methods, limitations and citation tags                 |
| GET    | `/v1/practice`           | Practice collections, observed counts, provenance and rights limitations                          |
| GET    | `/v1/practice/stats`     | Structural availability and duplicate-blob statistics                                             |
| GET    | `/v1/practice/items`     | Metadata search (`collection`, `skill`, `level`, `complete`, `q`, `limit`, `offset`)              |
| GET    | `/v1/practice/items/:id` | Stable path-derived metadata lookup                                                               |
| GET    | `/v1/practice/sample`    | Without-replacement selection (`seed` required, `count`, shared filters)                          |
| GET    | `/v1/practice/export`    | Complete checksum-verifiable metadata snapshot, raw JSON                                          |
| GET    | `/v1/vocabulary`         | Search the vocabulary dataset (`q`, `match`, `volume`, `pos`, `sort`, `order`, `limit`, `offset`) |
| GET    | `/v1/vocabulary/stats`   | Dataset statistics                                                                                |
| GET    | `/v1/vocabulary/random`  | Seeded random sample (`count`, `seed`)                                                            |
| GET    | `/v1/vocabulary/daily`   | Deterministic entry for a date (`date`, `count`)                                                  |
| GET    | `/v1/vocabulary/:word`   | Look up one headword                                                                              |
| GET    | `/v1/bands`              | The band scale with indicative CEFR levels                                                        |
| GET    | `/v1/bands/descriptors`  | Band descriptors (`set`, `criterion`, `band`)                                                     |
| GET    | `/v1/bands/:band`        | One band, with the descriptors that bracket it                                                    |
| GET    | `/v1/scores/overall`     | Overall band from the four components                                                             |
| GET    | `/v1/scores/convert`     | IELTS band to CEFR / TOEFL iBT / Cambridge / PTE / DET                                            |
| GET    | `/v1/scores/interpret`   | Another scale back to an indicative IELTS band                                                    |
| GET    | `/v1/topics/writing`     | Writing Task 2 prompts (`category`, `type`, `q`)                                                  |
| GET    | `/v1/topics/speaking`    | Speaking Parts 1-3 (`part`, `q`)                                                                  |
| GET    | `/v1/tasks/writing`      | Writing Task 1 families (`module`)                                                                |
| GET    | `/v1/corpus`             | Corpus metadata, statistics and facets                                                            |
| GET    | `/v1/corpus/stats`       | Corpus statistics                                                                                 |
| GET    | `/v1/corpus/items`       | Search the corpus index                                                                           |
| GET    | `/v1/resources`          | Free preparation resources (`type`, `q`)                                                          |

### Reproducible practice metadata

```bash
# Observe structural gaps; does not diagnose content quality
curl -s 'http://localhost:3000/v1/practice/items?collection=listening-tests&complete=false'

# Pin the returned contentSha256, seed, filters and count in a research protocol
curl -s 'http://localhost:3000/v1/practice/sample?seed=study-2026&count=10&skill=reading'

# Archive exactly the committed snapshot without authentication
curl -fsS 'http://localhost:3000/v1/practice/export' -o practice-snapshot.json
```

The 1,852 observed units differ from the 1,853 implied by upstream collection names: Reading test
105 is absent. Another 51 observed units lack at least one required asset role. Source level labels
are **not** independently validated CEFR labels. File presence is not evidence of correctness,
playability, free access or learning effectiveness. Upstream describes login/payment and has no
repository-level content licence; it is not added to the free-resource catalogue.

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

## Reproducible data pipeline

The original datasets use standard-library-only Python; the practice inventory uses TypeScript
and Node built-ins:

```bash
python3 scripts/extract_vocabulary.py 1-22yas.xlsx data/vocabulary.json
python3 scripts/extract_corpus.py tree.json data/corpus.json
npm run data:practice -- practice-tree.json data/practice.json
npm run docs:generate
```

CI re-derives `data/vocabulary.json` from the upstream workbook on every push and fails if the
committed dataset has drifted. CI also re-derives the practice inventory from its pinned Git tree,
checks documentation snapshots, validates CFF/OpenAPI, and tests on Node 20.19, 22 and 24. See the
[data card](docs/UPGRADE-YOUR-IELTS-SKILLS.md#reproduce-and-verify) for the exact tree request and
independent checksum verification.

## Quality

- **100% coverage** — statements, branches, functions and lines, enforced per file by the test
  runner (`npm test` fails below 100%), including the new TypeScript extraction/documentation scripts.
  Zero runtime dependencies. Coverage is not a claim of pedagogical validation.
- **super-linter** runs on every push, every pull request, weekly, and on demand.
- **Typechecked** with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and
  `noUnusedLocals`.
- **Deterministic responses** — ETags, conditional-request support and seeded sampling make every
  fixed-snapshot query reproducible and archivable when explicit seeds/dates are provided. Health
  uptime and default date/time-based requests are intentionally time-dependent.

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

If you use the API or the datasets, please cite it — citations are what keep the project free.

```bibtex
@software{ielts_api,
  title   = {IELTS API: a free, no-authentication REST API and open dataset for IELTS preparation research},
  author  = {{The IELTS API contributors}},
  year    = {2026},
  version = {1.1.0},
  url     = {https://github.com/johnlikescarrot/IELTS-API},
  license = {MIT, CC-BY-4.0}
}
```

Machine-readable citation metadata: [`CITATION.cff`](CITATION.cff), [`codemeta.json`](codemeta.json),
[`.zenodo.json`](.zenodo.json). These files prepare the project for archiving; they are not evidence
of a Zenodo deposit. Enable the integration, verify a successful release deposit, and only then add
the **real** DOI. Cite the version/commit actually used; 1.1.0 is the development version in this PR.

For the practice inventory, also cite [its exact upstream snapshot][practice-source] and record the
payload checksum. The HTML report includes a visible abstract, methods, results, limitations,
references and citation tags, but remains an **unreviewed draft**. Google Scholar indexing and
citation counts cannot be guaranteed; see the [publication checklist](docs/UPGRADE-YOUR-IELTS-SKILLS.md#citation-and-publication-readiness).

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
- **Original data contributions:** [CC BY 4.0](DATA-LICENSE), with attribution. This grants no rights
  in third-party content; the original vocabulary gloss provenance remains unresolved.
- **Band descriptors:** original condensed paraphrases, _not_ the official IELTS wording. Cite the
  published descriptors from <https://www.ielts.org/for-organisations/ielts-scoring-in-detail> when
  you need the authoritative text.
- **Score concordances:** indicative values compiled from the providers' own published comparison
  tables. Receiving institutions apply their own rules.
- **Upstream binaries:** never mirrored. `/v1/corpus` and `/v1/practice` publish metadata only; the
  practice inventory contains no exercise text, answers, audio, student records or bypass URLs.

IELTS is a jointly owned trademark of the British Council, IDP: IELTS Australia and Cambridge
Assessment English. This project is not affiliated with, endorsed by, or connected to the IELTS
partners.

[corpus]: https://github.com/zhengyishiming/IELTS
[practice-source]: https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS/tree/ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c
