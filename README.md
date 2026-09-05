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
workbooks, practice units live in unstructured directories, band descriptors live in PDFs, and score
concordances live in marketing pages. This API turns that material into a stable, versioned, citable HTTP
contract with **no API key, no registration, and no rate limiting by key** — so a researcher can cite it,
archive a response, and reproduce a result years later.

Everything here is built on open corpora and curricula:

- [`zhengyishiming/IELTS`][corpus]: Cambridge IELTS 1-22 vocabulary lists and study corpus
- [`ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS`][upgrade_corpus]: Open IELTS practice curriculum and study sets

See [RESEARCH.md](RESEARCH.md) for the corpus analysis and dataset construction methodology, and
[paper/paper.md](paper/paper.md) for the research paper.

## Quick start

```bash
npx ielts-api                 # or: npm install -g ielts-api
# ielts-api 1.0.0 listening on http://0.0.0.0:3000
```

```bash
# 4,174 headwords from Cambridge IELTS volumes 1-22
curl -s "http://localhost:3000/v1/vocabulary?q=environment&limit=3"

# Overall band score, with the IELTS rounding rule applied
curl -s "http://localhost:3000/v1/scores/overall?listening=7&reading=6.5&writing=6&speaking=7"

# Raw score to band conversion (Academic Reading: 35/40 -> Band 8.0)
curl -s "http://localhost:3000/v1/scores/raw-to-band?skill=reading&mode=academic&raw=35"

# 50 high-frequency themes with keywords and Task 2 prompts
curl -s "http://localhost:3000/v1/themes?category=Environment"

# 1,852 practice units catalogued across Reading and Listening
curl -s "http://localhost:3000/v1/practice?type=reading-basic&level=A1_A2&limit=5"

# Reproducible manifest with SHA-256 digests
curl -s "http://localhost:3000/manifest.json"
```

Open <http://localhost:3000/docs> for interactive documentation, `/openapi.json` for the OpenAPI 3.1
document, and `/manifest.json` for dataset integrity digests.

```js
import { startApiServer, searchVocabulary, calculateOverall, getRawToBand } from 'ielts-api';

const server = await startApiServer('0.0.0.0', 3000);
// ...or use the library directly in Node.js:
const page = searchVocabulary({ query: 'sustainab', limit: 10, offset: 0 });
const band = getRawToBand('reading', 35, 'academic');
```

## Datasets

| Dataset                         |                                            Size | Endpoint                 | Provenance                                                        |
| ------------------------------- | ----------------------------------------------: | ------------------------ | ----------------------------------------------------------------- |
| Cambridge IELTS 1-22 vocabulary |             4,174 headwords / 4,310 occurrences | `/v1/vocabulary`         | Derived from `1-22yas.xlsx` in [the upstream corpus][corpus]      |
| High-frequency theme bank       |                50 themes across 11 master banks | `/v1/themes`             | Standard IELTS frequency corpus with Task 2 prompts               |
| Practice units catalogue        |        1,852 verified units across R & L skills | `/v1/practice`           | Curriculum audit of [UPGRADE-YOUR-IELTS-SKILLS][upgrade_corpus]   |
| Task-family strategy guides     |        17 strategy guides (11 Reading, 6 List.) | `/v1/strategies`         | Test specifications and 6-step study methodology                  |
| Raw score to band conversion    |                         4 tables x 41 raw ranks | `/v1/scores/raw-to-band` | Official IELTS marking guidelines                                 |
| Analytic band descriptors       |      120 rows (3 sets x 4 criteria x bands 0-9) | `/v1/bands/descriptors`  | Original condensed paraphrases (see [DATA-LICENSE](DATA-LICENSE)) |
| Band scale with CEFR levels     |                                         19 rows | `/v1/bands`              | Original compilation                                              |
| Score concordances              |                             5 scales x 11 bands | `/v1/scores/convert`     | Providers' published comparison tables                            |
| Writing Task 2 prompts          | 111 prompts, 15 categories, 5 question families | `/v1/topics/writing`     | Original items modelled on recurring IELTS question families      |
| Speaking items                  |        80 items across Parts 1-3 (26 / 30 / 24) | `/v1/topics/speaking`    | Original items                                                    |
| Writing Task 1 families         |                                10 task families | `/v1/tasks/writing`      | Original compilation                                              |
| Free resources                  |                                    27 resources | `/v1/resources`          | Original catalogue (free + no login only)                         |
| Research corpus index           |                        76 of 404 upstream files | `/v1/corpus`             | Metadata index of [the upstream corpus][corpus]                   |
| Research dataset manifest       |                      All dataset SHA-256 hashes | `/manifest.json`         | Cryptographic integrity verification                              |

## Endpoints

All endpoints are `GET`, CORS-open, ETag-cached and authentication-free. Every JSON response uses the
same envelope: `{ "status": 200, "data": ..., "meta": ... }`.

| Method | Path                     | Description                                                                                        |
| ------ | ------------------------ | -------------------------------------------------------------------------------------------------- |
| GET    | `/`                      | Service index, dataset sizes, citation links                                                       |
| GET    | `/v1`                    | List every versioned endpoint                                                                      |
| GET    | `/health`                | Liveness and dataset availability                                                                  |
| GET    | `/manifest.json`         | Dataset SHA-256 cryptographic manifest                                                             |
| GET    | `/docs`                  | Human-readable documentation                                                                       |
| GET    | `/openapi.json`          | OpenAPI 3.1 specification                                                                          |
| GET    | `/v1/vocabulary`         | Search headwords (filter by query, volume, part of speech, morpheme hint; offset & limit)          |
| GET    | `/v1/vocabulary/random`  | Sample headwords uniformly or with a pseudo-random seed                                            |
| GET    | `/v1/vocabulary/:id`     | Look up a word by identifier (`w00001`) or headword (`atmosphere`)                                 |
| GET    | `/v1/themes`             | High-frequency themes (50 themes across 11 groups with Task 2 prompts and core vocabulary)         |
| GET    | `/v1/themes/:id`         | Look up a theme by identifier or slug (`education-technology`)                                     |
| GET    | `/v1/strategies`         | 17 task-family strategy guides for Reading and Listening                                           |
| GET    | `/v1/strategies/:id`     | Look up a strategy guide by task family identifier                                                 |
| GET    | `/v1/practice`           | Catalogue of 1,852 practice units across Reading and Listening basic/full-test collections         |
| GET    | `/v1/practice/summary`   | Summary distribution counts across practice types and CEFR levels                                  |
| GET    | `/v1/practice/:id`       | Look up a practice unit by identifier                                                              |
| GET    | `/v1/bands`              | The IELTS 9-band scale with CEFR mapping and competency labels                                     |
| GET    | `/v1/bands/descriptors`  | Analytic band descriptors for Speaking, Writing Task 1 and Writing Task 2                          |
| GET    | `/v1/scores/overall`     | Calculate overall band with the half-band rounding rule (`?listening=7&reading=6.5&...`)           |
| GET    | `/v1/scores/raw-to-band` | Convert raw score (0-40) to band score for Reading (Academic / General) and Listening              |
| GET    | `/v1/scores/convert`     | Convert IELTS band to CEFR, TOEFL iBT, PTE Academic, Duolingo, Cambridge English Scale             |
| GET    | `/v1/topics/writing`     | Writing Task 2 prompts filtered by category and question family                                    |
| GET    | `/v1/topics/speaking`    | Speaking prompts filtered by part (1, 2, 3) and category                                           |
| GET    | `/v1/tasks/writing`      | Writing Task 1 prompt types (Academic line graph, map, process, etc.; General formal letter, etc.) |
| GET    | `/v1/resources`          | Catalogue of 27 free, no-login IELTS resources (podcasts, mock tests, corpus tools)                |
| GET    | `/v1/corpus`             | Filtered index of the open IELTS corpus (76 files classified by skill and category)                |
| GET    | `/v1/corpus/summary`     | Classification breakdown of the open corpus                                                        |

## Quality

- **100% coverage** — statements, branches, functions and lines, enforced per file by the test
  runner (`npm test` fails below 100%). 344 tests across 34 test files, zero runtime dependencies.
- **super-linter** runs on every push, every pull request, weekly, and on demand.
- **Typechecked** with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and
  `noUnusedLocals`.
- **Deterministic responses** — ETags, conditional-request support and seeded sampling make every
  response reproducible and archivable.

```bash
npm install
npm run validate   # typecheck + lint + format check + tests with 100% coverage
npm run build      # compile TypeScript
npm run dev        # hot-reloading server
```

## Deploying

```bash
docker build -t ielts-api .
docker run --rm -p 3000:3000 ielts-api
```

Configuration: `--port` / `PORT`, `--host` / `HOST`, `--silent`, `--help`, `--version`.

## Citing this project

If you use the API or the datasets, please cite it:

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
[`.zenodo.json`](.zenodo.json). Tagged releases are archived on Zenodo, which mints a versioned DOI.

Please also cite the upstream open projects the datasets were derived from:

```bibtex
@misc{ielts_open_corpus,
  title  = {IELTS: an open corpus of IELTS preparation materials},
  author = {zhengyishiming},
  year   = {2024},
  url    = {https://github.com/zhengyishiming/IELTS}
}

@misc{upgrade_ielts_skills,
  title  = {UPGRADE-YOUR-IELTS-SKILLS: open IELTS practice curriculum and study set},
  author = {ngoclong1209},
  year   = {2026},
  url    = {https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS}
}
```

## Licence and provenance

- **Code:** [MIT](LICENSE).
- **Data:** [CC BY 4.0](DATA-LICENSE) — attribution required.
- **Band descriptors & strategies:** original condensed paraphrases, _not_ the official IELTS wording. Cite the
  published descriptors from <https://www.ielts.org/for-organisations/ielts-scoring-in-detail> when
  you need the authoritative text.
- **Score concordances:** indicative values compiled from the providers' own published comparison
  tables. Receiving institutions apply their own rules.
- **Upstream files:** never redistributed. `/v1/corpus` and `/v1/practice` publish metadata only.

IELTS is a jointly owned trademark of the British Council, IDP: IELTS Australia and Cambridge
Assessment English. This project is not affiliated with, endorsed by, or connected to the IELTS
partners.

[corpus]: https://github.com/zhengyishiming/IELTS
[upgrade_corpus]: https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS
