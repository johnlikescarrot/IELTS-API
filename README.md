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

The vocabulary and original corpus index build on [`zhengyishiming/IELTS`][corpus]. A new
**Reading/Listening metadata catalogue** studies [`UPGRADE-YOUR-IELTS-SKILLS`][practice-source]
without redistributing its exercises or assuming they are free to reuse. See
[RESEARCH.md](RESEARCH.md), [the practice study](docs/PRACTICE.md), and
[paper/paper.md](paper/paper.md) (a draft, not a peer-reviewed publication).

## Quick start

```bash
git clone https://github.com/johnlikescarrot/IELTS-API.git
cd IELTS-API
npm ci
npm run build
npm start -- --host 0.0.0.0
# ielts-api 1.0.0 listening on http://0.0.0.0:3000
```

```bash
# 4,174 headwords from Cambridge IELTS volumes 1-22
curl -s "http://localhost:3000/v1/vocabulary?q=environment&limit=3"

# Overall band score, with the IELTS rounding rule applied
curl -s "http://localhost:3000/v1/scores/overall?listening=7&reading=6.5&writing=6&speaking=7"

# One headword, with phonetics, senses and morpheme hints
curl -s "http://localhost:3000/v1/vocabulary/atmosphere"
```

Open <http://localhost:3000/docs> for the endpoint reference and
`/openapi.json` for the OpenAPI 3.1 document.

```js
import { startApiServer, searchVocabulary, calculateOverall } from './dist/index.js';

const server = await startApiServer('0.0.0.0', 3000);
// ...or use the library without a server:
const page = searchVocabulary({ query: 'sustainab', limit: 10, offset: 0 });
```

The npm package name was not published when this update was verified; the source-build instructions
above work without relying on `npx ielts-api`. Build and install a local archive with
`npm pack --ignore-scripts` if needed.

## Datasets

| Dataset                             |                                            Size | Endpoint                | Provenance                                                              |
| ----------------------------------- | ----------------------------------------------: | ----------------------- | ----------------------------------------------------------------------- |
| Cambridge IELTS 1-22 vocabulary     |             4,174 headwords / 4,310 occurrences | `/v1/vocabulary`        | Derived from `1-22yas.xlsx` in [the upstream corpus][corpus]            |
| Analytic band descriptors           |      120 rows (3 sets x 4 criteria x bands 0-9) | `/v1/bands/descriptors` | Original condensed paraphrases (see [DATA-LICENSE](DATA-LICENSE))       |
| Band scale with CEFR levels         |                                         19 rows | `/v1/bands`             | Original compilation                                                    |
| Score concordances                  |                             5 scales x 11 bands | `/v1/scores/convert`    | Providers' published comparison tables                                  |
| Writing Task 2 prompts              | 111 prompts, 15 categories, 5 question families | `/v1/topics/writing`    | Original items modelled on recurring IELTS question families            |
| Speaking items                      |        80 items across Parts 1-3 (26 / 30 / 24) | `/v1/topics/speaking`   | Original items                                                          |
| Writing Task 1 families             |                                10 task families | `/v1/tasks/writing`     | Original compilation                                                    |
| Free resources                      |                                    27 resources | `/v1/resources`         | Original catalogue (free + no login only)                               |
| Research corpus index               |                        76 of 404 upstream files | `/v1/corpus`            | Metadata index of [the upstream corpus][corpus]                         |
| Reading/Listening practice metadata |      1,852 canonical items across 4 collections | `/v1/practice`          | Commit-pinned metadata only; [rights and methodology](docs/PRACTICE.md) |

## Endpoints

All endpoints are `GET`, CORS-open, ETag-cached and authentication-free, with `HEAD` and `OPTIONS`
support. Domain JSON responses use the envelope `{ "status": 200, "data": ..., "meta": ... }`;
`/openapi.json` serves the raw specification and `/docs` serves HTML.

| Method | Path                       | Description                                                                                            |
| ------ | -------------------------- | ------------------------------------------------------------------------------------------------------ |
| GET    | `/`                        | Service index, dataset sizes, citation links                                                           |
| GET    | `/v1`                      | List every versioned endpoint                                                                          |
| GET    | `/health`                  | Liveness and dataset availability                                                                      |
| GET    | `/docs`                    | Human-readable documentation                                                                           |
| GET    | `/openapi.json`            | OpenAPI 3.1 document generated from the live route table                                               |
| GET    | `/v1/vocabulary`           | Search the vocabulary dataset (`q`, `match`, `volume`, `pos`, `sort`, `order`, `limit`, `offset`)      |
| GET    | `/v1/vocabulary/stats`     | Dataset statistics                                                                                     |
| GET    | `/v1/vocabulary/random`    | Seeded random sample (`count`, `seed`)                                                                 |
| GET    | `/v1/vocabulary/daily`     | Deterministic entry for a date (`date`, `count`)                                                       |
| GET    | `/v1/vocabulary/:word`     | Look up one headword                                                                                   |
| GET    | `/v1/bands`                | The band scale with indicative CEFR levels                                                             |
| GET    | `/v1/bands/descriptors`    | Band descriptors (`set`, `criterion`, `band`)                                                          |
| GET    | `/v1/bands/:band`          | One band, with the descriptors that bracket it                                                         |
| GET    | `/v1/scores/overall`       | Overall band from the four components                                                                  |
| GET    | `/v1/scores/convert`       | IELTS band to CEFR / TOEFL iBT / Cambridge / PTE / DET                                                 |
| GET    | `/v1/scores/interpret`     | Another scale back to an indicative IELTS band                                                         |
| GET    | `/v1/topics/writing`       | Writing Task 2 prompts (`category`, `type`, `q`)                                                       |
| GET    | `/v1/topics/speaking`      | Speaking Parts 1-3 (`part`, `q`)                                                                       |
| GET    | `/v1/tasks/writing`        | Writing Task 1 families (`module`)                                                                     |
| GET    | `/v1/corpus`               | Corpus metadata, statistics and facets                                                                 |
| GET    | `/v1/corpus/stats`         | Corpus statistics                                                                                      |
| GET    | `/v1/corpus/items`         | Search the corpus index                                                                                |
| GET    | `/v1/resources`            | Free preparation resources (`type`, `q`)                                                               |
| GET    | `/v1/practice`             | Reading/Listening metadata manifest, rights, provenance and SHA-256                                    |
| GET    | `/v1/practice/collections` | Declared versus observed counts for four practice collections                                          |
| GET    | `/v1/practice/items`       | Search/filter by `q`, `skill`, `collection`, `level`, `mode`, `audio`; paginate with `limit`, `offset` |
| GET    | `/v1/practice/items/:id`   | Look up a stable path-derived metadata ID                                                              |
| GET    | `/v1/practice/sample`      | Reproducible sample without replacement; required `seed`, optional `count` and filters                 |

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

### Reading/Listening metadata and reproducible sampling

```bash
# Source-labelled Reading exercises: these are metadata, not licensed exercise payloads.
curl -fsS "http://localhost:3000/v1/practice/items?skill=reading&level=c1-c2&limit=3"

# Repeatable sample; archive the response, filters, dataset SHA-256 and software revision.
curl -fsS "http://localhost:3000/v1/practice/sample?seed=paper-example-v1&skill=listening&mode=full-test&count=5"
```

The reviewed snapshot contains **306 Listening and 1,546 Reading items**. It lacks Reading Test 105
and the canonical audio files for Listening Tests 83, 85 and 88; the API reports those facts rather
than assuming the directory labels imply completeness. Upstream content has no established reuse
licence and may require login/payment. **This API remains free and no-auth.** See the
[full research and endpoint reference](docs/PRACTICE.md).

## Reproducible data pipeline

The original two datasets are regenerated with standard-library-only Python:

```bash
python3 scripts/extract_vocabulary.py 1-22yas.xlsx data/vocabulary.json
python3 scripts/extract_corpus.py tree.json data/corpus.json
```

The new practice index is generated by a tested TypeScript allowlist extractor:

```bash
npm run data:practice -- /tmp/practice-tree.json /tmp/practice.json
cmp data/practice.json /tmp/practice.json
npm run openapi:generate
```

See [the pinned-tree download command](docs/PRACTICE.md#reproduce-the-index). CI independently
re-derives both the vocabulary and practice datasets and fails on drift. Tests also validate the
OpenAPI schema, actual practice/error responses and the committed OpenAPI snapshot.

## Quality

- **100% coverage** — statements, branches, functions and lines, enforced per file by the test
  runner (`npm test` fails below 100%), including the TypeScript generation scripts. Zero runtime dependencies.
- **super-linter** runs on every push, every pull request, weekly, and on demand.
- **Typechecked** with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and
  `noUnusedLocals`.
- **Reproducible static data and seeded samples** — pinned source revisions, SHA-256, stable IDs
  and a named sampling algorithm. Health uptime and unseeded random endpoints are intentionally
  dynamic; replay requires the same software/data version and inputs.

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

If this software supports your research, please cite the version or exact commit you used and the
relevant upstream sources. Access never depends on providing a citation.

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
[`.zenodo.json`](.zenodo.json). These prepare the project for archival, but **no Zenodo DOI has been
verified for this repository**. Do not cite a placeholder. A maintainer must publish and verify an
archive before recording its real DOI. See the [research/release checklist](docs/RESEARCH-WORKFLOW.md),
including Google Scholar's requirements and the limits of any discoverability claim.

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
- **Derived metadata:** [CC BY 4.0](DATA-LICENSE) with attribution; upstream content rights are not transferred.
- **Band descriptors:** original condensed paraphrases, _not_ the official IELTS wording. Cite the
  published descriptors from <https://www.ielts.org/for-organisations/ielts-scoring-in-detail> when
  you need the authoritative text.
- **Score concordances:** indicative values compiled from the providers' own published comparison
  tables. Receiving institutions apply their own rules.
- **Corpus and practice indices:** `/v1/corpus` and `/v1/practice` publish metadata only, not
  upstream exercise payloads or media. The legacy vocabulary glosses have separate provenance
  limitations documented in [RESEARCH.md](RESEARCH.md).

IELTS is a jointly owned trademark of the British Council, IDP: IELTS Australia and Cambridge
Assessment English. This project is not affiliated with, endorsed by, or connected to the IELTS
partners.

[corpus]: https://github.com/zhengyishiming/IELTS
[practice-source]: https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS
