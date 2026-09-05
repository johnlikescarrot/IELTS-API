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

Everything here is built on two open corpora: [`zhengyishiming/IELTS`][corpus], a noisy file dump
from which the vocabulary dataset is derived, and [`ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS`][practice],
a large CEFR-levelled practice bank that is indexed as metadata by `/v1/practice`. See
[RESEARCH.md](RESEARCH.md) for the corpus analyses and the dataset construction methodology, and
[paper/paper.md](paper/paper.md) for the short research paper.

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

# One headword, with phonetics, senses and morpheme hints
curl -s "http://localhost:3000/v1/vocabulary/atmosphere"

# A CEFR-levelled Reading passage with its passage and questions
curl -s "http://localhost:3000/v1/reading?level=B1-B2&limit=2"

# The Academic Reading question-type taxonomy
curl -s "http://localhost:3000/v1/reading/types"
```

Open <http://localhost:3000/docs> for the interactive documentation and
`/openapi.json` for the OpenAPI 3.1 document.

```js
import { startApiServer, searchVocabulary, calculateOverall } from 'ielts-api';

const server = await startApiServer('0.0.0.0', 3000);
// ...or use the library without a server:
const page = searchVocabulary({ query: 'sustainab', limit: 10, offset: 0 });
```

## Datasets

| Dataset                         |                                            Size | Endpoint                | Provenance                                                                                                                  |
| ------------------------------- | ----------------------------------------------: | ----------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Cambridge IELTS 1-22 vocabulary |             4,174 headwords / 4,310 occurrences | `/v1/vocabulary`        | Derived from `1-22yas.xlsx` in [the upstream corpus][corpus]                                                                |
| CEFR-levelled Reading items     |      12 passages / 48 questions, A1-C2, 9 types | `/v1/reading`           | Original items calibrated to the CEFR levels and Academic Reading question-type taxonomy of [the practice corpus][practice] |
| Practice corpus index           |                   1,852 of 5,545 upstream files | `/v1/practice`          | Metadata index of [the practice corpus][practice]                                                                           |
| Analytic band descriptors       |      120 rows (3 sets x 4 criteria x bands 0-9) | `/v1/bands/descriptors` | Original condensed paraphrases (see [DATA-LICENSE](DATA-LICENSE))                                                           |
| Band scale with CEFR levels     |                                         19 rows | `/v1/bands`             | Original compilation                                                                                                        |
| Score concordances              |                             5 scales x 11 bands | `/v1/scores/convert`    | Providers' published comparison tables                                                                                      |
| Writing Task 2 prompts          | 111 prompts, 15 categories, 5 question families | `/v1/topics/writing`    | Original items modelled on recurring IELTS question families                                                                |
| Speaking items                  |        80 items across Parts 1-3 (26 / 30 / 24) | `/v1/topics/speaking`   | Original items                                                                                                              |
| Writing Task 1 families         |                                10 task families | `/v1/tasks/writing`     | Original compilation                                                                                                        |
| Free resources                  |                                    27 resources | `/v1/resources`         | Original catalogue (free + no login only)                                                                                   |
| Research corpus index           |                        76 of 404 upstream files | `/v1/corpus`            | Metadata index of [the upstream corpus][corpus]                                                                             |

## Endpoints

All endpoints are `GET`, CORS-open, ETag-cached and authentication-free. Every JSON response uses the
same envelope: `{ "status": 200, "data": ..., "meta": ... }`.

| Method | Path                    | Description                                                                                                    |
| ------ | ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| GET    | `/`                     | Service index, dataset sizes, citation links                                                                   |
| GET    | `/v1`                   | List every versioned endpoint                                                                                  |
| GET    | `/health`               | Liveness and dataset availability                                                                              |
| GET    | `/docs`                 | Human-readable documentation                                                                                   |
| GET    | `/openapi.json`         | OpenAPI 3.1 document generated from the live route table                                                       |
| GET    | `/v1/vocabulary`        | Search the vocabulary dataset (`q`, `match`, `volume`, `pos`, `sort`, `order`, `limit`, `offset`)              |
| GET    | `/v1/vocabulary/stats`  | Dataset statistics                                                                                             |
| GET    | `/v1/vocabulary/random` | Seeded random sample (`count`, `seed`)                                                                         |
| GET    | `/v1/vocabulary/daily`  | Deterministic entry for a date (`date`, `count`)                                                               |
| GET    | `/v1/vocabulary/:word`  | Look up one headword                                                                                           |
| GET    | `/v1/bands`             | The band scale with indicative CEFR levels                                                                     |
| GET    | `/v1/bands/descriptors` | Band descriptors (`set`, `criterion`, `band`)                                                                  |
| GET    | `/v1/bands/:band`       | One band, with the descriptors that bracket it                                                                 |
| GET    | `/v1/scores/overall`    | Overall band from the four components                                                                          |
| GET    | `/v1/scores/convert`    | IELTS band to CEFR / TOEFL iBT / Cambridge / PTE / DET                                                         |
| GET    | `/v1/scores/interpret`  | Another scale back to an indicative IELTS band                                                                 |
| GET    | `/v1/topics/writing`    | Writing Task 2 prompts (`category`, `type`, `q`)                                                               |
| GET    | `/v1/topics/speaking`   | Speaking Parts 1-3 (`part`, `q`)                                                                               |
| GET    | `/v1/tasks/writing`     | Writing Task 1 families (`module`)                                                                             |
| GET    | `/v1/reading`           | Search the CEFR-levelled Reading item bank (`q`, `level`, `topic`, `type`, `sort`, `order`, `limit`, `offset`) |
| GET    | `/v1/reading/stats`     | Reading item-bank statistics                                                                                   |
| GET    | `/v1/reading/topics`    | Distinct reading topics                                                                                        |
| GET    | `/v1/reading/types`     | The Academic Reading question-type taxonomy                                                                    |
| GET    | `/v1/reading/random`    | Seeded random reading sample (`count`, `seed`, `level`)                                                        |
| GET    | `/v1/reading/daily`     | Deterministic reading item for a date (`date`)                                                                 |
| GET    | `/v1/reading/:id`       | One reading item, with its passage and questions                                                               |
| GET    | `/v1/corpus`            | Corpus metadata, statistics and facets                                                                         |
| GET    | `/v1/corpus/stats`      | Corpus statistics                                                                                              |
| GET    | `/v1/corpus/items`      | Search the corpus index                                                                                        |
| GET    | `/v1/practice`          | Practice corpus metadata, statistics and facets                                                                |
| GET    | `/v1/practice/stats`    | Practice corpus statistics                                                                                     |
| GET    | `/v1/practice/items`    | Search the practice corpus index (`module`, `level`, `format`, `q`)                                            |
| GET    | `/v1/resources`         | Free preparation resources (`type`, `q`)                                                                       |

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

**Reading item lookup.**

```jsonc
GET /v1/reading/r_c1_001
{
  "status": 200,
  "data": {
    "id": "r_c1_001", "level": "C1-C2", "topic": "technology", "wordCount": 286,
    "title": "The Economics of Attention",
    "passage": "For most of economic history, the scarce resource was material...",
    "questions": [
      { "id": "q1", "type": "matching-information",
        "text": "Which paragraph contains the following information: ...",
        "answer": "C", "explanation": "The third paragraph says ..." }
    ]
  },
  "meta": { "id": "r_c1_001" }
}
```

The Reading item bank is **original** work: passages and questions are calibrated to the CEFR
reading levels and the nine Academic Reading question types that recur in open IELTS practice
corpora, but no third-party passage or exam question is reproduced.

## Reproducible data pipeline

Every dataset is regenerated from source with standard-library-only Python:

```bash
python3 scripts/extract_vocabulary.py 1-22yas.xlsx data/vocabulary.json
python3 scripts/extract_corpus.py tree.json data/corpus.json
python3 scripts/extract_practice.py tree.json data/practice.json --reading-index reading-index.json
```

CI re-derives `data/vocabulary.json` and `data/practice.json` from their upstream repositories on
every push and fails if the committed datasets have drifted. `data/reading.json` is original
authored content; CI checks its schema and invariants instead.

## Quality

- **100% coverage** — statements, branches, functions and lines, enforced per file by the test
  runner (`npm test` fails below 100%). 351 tests, zero runtime dependencies.
- **super-linter** runs on every push, every pull request, weekly, and on demand.
- **Typechecked** with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and
  `noUnusedLocals`.
- **Deterministic responses** — ETags, conditional-request support and seeded sampling make every
  response reproducible and archivable.

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
  version = {1.0.0},
  url     = {https://github.com/johnlikescarrot/IELTS-API},
  license = {MIT, CC-BY-4.0}
}
```

Machine-readable citation metadata: [`CITATION.cff`](CITATION.cff), [`codemeta.json`](codemeta.json),
[`.zenodo.json`](.zenodo.json). Tagged releases are archived on Zenodo, which mints a versioned DOI.

Please also cite the upstream corpora the datasets were derived from:

```bibtex
@misc{ielts_open_corpus,
  title  = {IELTS: an open corpus of IELTS preparation materials},
  author = {zhengyishiming},
  year   = {2024},
  url    = {https://github.com/zhengyishiming/IELTS}
}

@misc{ielts_practice_corpus,
  title  = {Upgrade Your IELTS Skills: a CEFR-levelled IELTS/PTE practice corpus},
  author = {ngoclong1209},
  year   = {2026},
  url    = {https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS}
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
- **Upstream files:** never redistributed. `/v1/corpus` and `/v1/practice` publish metadata only.
- **Reading items:** original passages and questions authored for this API; no third-party item or
  exam question is reproduced.

IELTS is a jointly owned trademark of the British Council, IDP: IELTS Australia and Cambridge
Assessment English. This project is not affiliated with, endorsed by, or connected to the IELTS
partners.

[corpus]: https://github.com/zhengyishiming/IELTS
[practice]: https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS
