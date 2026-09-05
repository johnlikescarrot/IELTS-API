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

Everything here is built on an open corpus: [`zhengyishiming/IELTS`][corpus]. See
[RESEARCH.md](RESEARCH.md) for the corpus analysis and the dataset construction methodology, and
[paper/paper.md](paper/paper.md) for the short research paper.

## Quick start

```bash
npx ielts-api                 # or: npm install -g ielts-api
# ielts-api 1.0.0 listening on http://0.0.0.0:3000
```

```bash
# 4,174 headwords from Cambridge IELTS volumes 1-22
curl -s "http://localhost:3000/v1/vocabulary?q=environment&limit=3"

# 30 correct answers out of 40 on the Listening paper -> band 7.0
curl -s "http://localhost:3000/v1/scores/raw?component=listening&raw=30"

# Overall band score, with the IELTS rounding rule applied
curl -s "http://localhost:3000/v1/scores/overall?listening=7&reading=6.5&writing=6&speaking=7"

# The complete Reading question-type taxonomy
curl -s "http://localhost:3000/v1/questions?skill=reading"

# Cite this API, straight into a .bib file
curl -s "http://localhost:3000/v1/citation?format=bibtex" > ielts-api.bib
```

Open <http://localhost:3000/docs> for the interactive documentation,
`/openapi.json` for the OpenAPI 3.1 document, and `/paper` for the accompanying paper
(with a generated [PDF full text](http://localhost:3000/paper.pdf) and Highwire Press citation metadata).

```js
import { startApiServer, searchVocabulary, convertRawScore } from 'ielts-api';

const server = await startApiServer('0.0.0.0', 3000);
// ...or use the library without a server:
const page = searchVocabulary({ query: 'sustainab', limit: 10, offset: 0 });
const band = convertRawScore('reading-academic', 30); // -> band 7.0
```

## Datasets

| Dataset                         |                                            Size | Endpoint                | Provenance                                                        |
| ------------------------------- | ----------------------------------------------: | ----------------------- | ----------------------------------------------------------------- |
| Cambridge IELTS 1-22 vocabulary |             4,174 headwords / 4,310 occurrences | `/v1/vocabulary`        | Derived from `1-22yas.xlsx` in [the upstream corpus][corpus]      |
| Analytic band descriptors       |      120 rows (3 sets x 4 criteria x bands 0-9) | `/v1/bands/descriptors` | Original condensed paraphrases (see [DATA-LICENSE](DATA-LICENSE)) |
| Band scale with CEFR levels     |                                         19 rows | `/v1/bands`             | Original compilation                                              |
| Score concordances              |                             5 scales x 11 bands | `/v1/scores/convert`    | Providers' published comparison tables                            |
| Raw-score conversion tables     |             3 tables x 18 rows, exhaustive 0-40 | `/v1/scores/raw`        | Consensus of public tables, every boundary labelled               |
| Question-type taxonomy          |             17 types (6 Listening / 11 Reading) | `/v1/questions`         | Published test format + original strategy notes                   |
| Test-format blueprints          |                              6 papers, 20 parts | `/v1/format`            | Published test format + original commentary                       |
| Writing Task 2 prompts          | 111 prompts, 15 categories, 5 question families | `/v1/topics/writing`    | Original items modelled on recurring IELTS question families      |
| Speaking items                  |        80 items across Parts 1-3 (26 / 30 / 24) | `/v1/topics/speaking`   | Original items                                                    |
| Writing Task 1 families         |                                10 task families | `/v1/tasks/writing`     | Original compilation                                              |
| Free resources                  |                                    27 resources | `/v1/resources`         | Original catalogue (free + no login only)                         |
| Research corpus index           |                        76 of 404 upstream files | `/v1/corpus`            | Metadata index of [the upstream corpus][corpus]                   |

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
| GET    | `/v1/scores/raw`        | Raw Listening or Reading score out of 40 to a band score                                          |
| GET    | `/v1/scores/tables`     | The raw-score conversion tables, with the provenance of every boundary                            |
| GET    | `/v1/scores/interpret`  | Another scale back to an indicative IELTS band                                                    |
| GET    | `/v1/topics/writing`    | Writing Task 2 prompts (`category`, `type`, `q`)                                                  |
| GET    | `/v1/topics/speaking`   | Speaking Parts 1-3 (`part`, `q`)                                                                  |
| GET    | `/v1/tasks/writing`     | Writing Task 1 families (`module`)                                                                |
| GET    | `/v1/questions`         | Listening and Reading question-type taxonomy (`skill`, `ordered`, `q`)                            |
| GET    | `/v1/questions/:id`     | One question type, with the other types of the same paper                                         |
| GET    | `/v1/format`            | Test-format blueprints for all six papers (`skill`)                                               |
| GET    | `/v1/format/:module`    | One paper, resolved with its question types and conversion table                                  |
| GET    | `/v1/corpus`            | Corpus metadata, statistics and facets                                                            |
| GET    | `/v1/corpus/stats`      | Corpus statistics                                                                                 |
| GET    | `/v1/corpus/items`      | Search the corpus index                                                                           |
| GET    | `/v1/resources`         | Free preparation resources (`type`, `q`)                                                          |
| GET    | `/v1/citation`          | Citation metadata in nine formats (`format`, `upstream`)                                          |
| GET    | `/paper`                | Paper landing page with Highwire Press citation metadata                                          |
| GET    | `/paper.pdf`            | Full text of the paper as a PDF, generated with zero dependencies                                 |
| GET    | `/robots.txt`           | Crawler directives                                                                                |
| GET    | `/sitemap.xml`          | Sitemap of every stable URL                                                                       |

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

**Raw score to band score.** Listening and Reading are marked out of 40. The response reports the
marginal cost of the next half band and, crucially, the provenance of the boundary it used.

```jsonc
GET /v1/scores/raw?component=listening&raw=30
{
  "status": 200,
  "data": {
    "component": "listening", "raw": 30, "outOf": 40, "accuracy": 0.75,
    "band": 7, "range": { "min": 30, "max": 31 },
    "basis": "published",
    "disagreement": "An older, widely reprinted table gives 30-32 for band 7.0.",
    "nextBand": { "band": 7.5, "raw": 32, "additionalCorrect": 2 },
    "marginToLoseBand": 0, "cefr": "C1"
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

Both datasets are regenerated from source with standard-library-only Python:

```bash
python3 scripts/extract_vocabulary.py 1-22yas.xlsx data/vocabulary.json
python3 scripts/extract_corpus.py tree.json data/corpus.json
```

CI re-derives `data/vocabulary.json` from the upstream workbook on every push and fails if the
committed dataset has drifted.

## Quality

- **100% coverage** — statements, branches, functions and lines, enforced per file by the test
  runner (`npm test` fails below 100%). 501 tests, zero runtime dependencies.
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
**The API will do it for you:**

```bash
curl -s "http://localhost:3000/v1/citation?format=bibtex"   > ielts-api.bib
curl -s "http://localhost:3000/v1/citation?format=ris"      > ielts-api.ris
curl -s "http://localhost:3000/v1/citation?format=csl-json" > ielts-api.json
```

Nine formats are served verbatim with the content type each reference manager expects: `bibtex`,
`ris`, `csl-json`, `apa`, `mla`, `chicago`, `harvard`, `endnote` and `text`. All of them are
rendered from one canonical record, so no two surfaces can disagree.

```bibtex
@software{theieltsapicontributors2026ielts,
  title     = {IELTS API: a free, no-authentication REST API and open dataset for IELTS preparation research},
  author    = {The IELTS API contributors},
  year      = {2026},
  version   = {1.0.0},
  publisher = {Zenodo},
  url       = {https://github.com/johnlikescarrot/IELTS-API},
  license   = {MIT (code); CC BY 4.0 (data)},
  doi       = {10.5281/zenodo.0000000}
}
```

### Academic discoverability

The service publishes a proper scholarly surface rather than relying on the repository being found:

- **`/paper`** — a landing page for the accompanying paper carrying Highwire Press `citation_*`
  tags (the scheme Google Scholar's own examples use), Dublin Core, Open Graph and a schema.org
  JSON-LD graph with `ScholarlyArticle`, `Dataset` and `SoftwareSourceCode` nodes. The
  author-written abstract is visible without scrolling, clicking or signing in, and the references
  are a numbered list of formal citations — the content requirements Scholar actually checks.
- **`/paper.pdf`** — the full text as a real PDF, generated at request time with zero dependencies:
  title in 24 pt at the top of page 1, authors on the line directly below, `References` section at
  the end. It is linked from the landing page by `citation_pdf_url`, which is what stops Scholar
  indexing the HTML and the PDF as two competing records that split the citation count.
- **`/robots.txt`** and **`/sitemap.xml`** — every path explicitly allowed and listed, because a
  blocked crawl path is the most common reason a technically correct landing page is never indexed.

Machine-readable citation metadata also ships in the repository:
[`CITATION.cff`](CITATION.cff), [`codemeta.json`](codemeta.json), [`.zenodo.json`](.zenodo.json).
Tagged releases are archived on Zenodo, which mints a versioned DOI.

Please also cite the upstream corpus the vocabulary dataset was derived from — the API serves that
too, at `/v1/citation?upstream=true&format=bibtex`:

```bibtex
@misc{zhengyishiming2024ielts,
  title     = {IELTS: an open corpus of IELTS preparation materials},
  author    = {zhengyishiming},
  year      = {2024},
  publisher = {GitHub},
  url       = {https://github.com/zhengyishiming/IELTS}
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
- **Raw-score conversion tables:** indicative. The IELTS partners re-equate boundaries for every
  test version and publish no definitive table, so a converted band carries roughly half a band of
  table uncertainty. Every row is labelled `published` or `extrapolated`, and rows where public
  tables materially disagree carry the competing boundary, so a study can report its sensitivity to
  the choice of table.
- **Upstream files:** never redistributed. `/v1/corpus` publishes metadata only.

IELTS is a jointly owned trademark of the British Council, IDP: IELTS Australia and Cambridge
Assessment English. This project is not affiliated with, endorsed by, or connected to the IELTS
partners.

[corpus]: https://github.com/zhengyishiming/IELTS
