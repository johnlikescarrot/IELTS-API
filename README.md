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

The existing vocabulary and corpus work is documented in [RESEARCH.md](RESEARCH.md). The new
Reading/Listening extension follows a pinned, rights-aware review of
[`ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS`][practice-source]: see
[the detailed audit](docs/UPSTREAM-REVIEW.md) and the [technical-report draft](paper/practice-metadata.md).
Publicly accessible source material is **not necessarily openly licensed**; content rights remain separate.

## Quick start

```bash
git clone https://github.com/johnlikescarrot/IELTS-API.git
cd IELTS-API
npm ci
npm run build
npm start
# listening on http://0.0.0.0:3000
```

```bash
# 4,174 headwords from Cambridge IELTS volumes 1-22
curl -s "http://localhost:3000/v1/vocabulary?q=environment&limit=3"

# Overall band score, with the IELTS rounding rule applied
curl -s "http://localhost:3000/v1/scores/overall?listening=7&reading=6.5&writing=6&speaking=7"

# One headword, with phonetics, senses and morpheme hints
curl -s "http://localhost:3000/v1/vocabulary/atmosphere"
```

Use Node.js 22 or 24 for a supported runtime (compatibility is also tested on 20.19.0).
Open <http://localhost:3000/docs> for documentation and examples, `/openapi.json` for the
validated OpenAPI 3.1 contract, and `/research` for the freely readable technical-report draft.
The source install is authoritative; an npm publication has not been verified.

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

The practice extension adds **1,852 units / 4,606 file-metadata records** from eight collections,
plus **11 Academic Reading and 6 Listening task-family guides**. This is a metadata inventory,
not a mirrored or validated exercise bank. Reading full-test 105 and audio for Listening tests
83, 85 and 88 are absent from the source snapshot. Its content licence is unknown.

## Endpoints

All endpoints are `GET` (with `HEAD` and `OPTIONS` support), CORS-open and authentication-free.
Domain JSON responses use `{ "status": 200, "data": ..., "meta": ... }`. Errors use that same
envelope with `data: null` and `meta.error`. `/openapi.json`, HTML pages, JSON Lines exports and
BibTeX are raw representations, not enveloped JSON.

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

### Reading/Listening and research endpoints

| Path                  | Description                                                                    |
| --------------------- | ------------------------------------------------------------------------------ |
| `/v1/practice`        | Search metadata with `q`, `skill`, `mode`, `level`, `asset`, `limit`, `offset` |
| `/v1/practice/stats`  | Measured counts, declared counts, missing sequences and audio availability     |
| `/v1/practice/sample` | Sample without replacement; required `seed`, optional `count` and filters      |
| `/v1/practice/export` | Export the entire filtered population as provenance-bearing JSON Lines         |
| `/v1/practice/:id`    | Stable unit identity and allowlisted Git file metadata                         |
| `/v1/tasks/reading`   | Original guidance for 11 Academic Reading families (`q`, `type`)               |
| `/v1/tasks/listening` | Original guidance for 6 Listening families (`q`, `type`)                       |
| `/research`           | Full HTML technical-report draft with abstract, references and citation tags   |
| `/citation.bib`       | Consistent software citation, without an unverified DOI                        |

```bash
# Original metadata, not exercise text or audio
curl -s "http://localhost:3000/v1/practice?skill=listening&mode=full-test&asset=audio&limit=3"

# Reproduce a selection using the same checksum, filters, seed and count
curl -s "http://localhost:3000/v1/practice/sample?level=a1-a2&seed=study-2026&count=5"

# All matching records, not just the first page
curl -s "http://localhost:3000/v1/practice/export?level=a1-a2" -o practice.jsonl

# Independent guidance distinguishing contradiction from absence of evidence
curl -s "http://localhost:3000/v1/tasks/reading?type=reading-identifying-information"
```

Practice filters use **AND semantics**. `q` is a case-insensitive substring over IDs, generated
labels and file paths, not exercise contents. Levels are directory labels, not certified CEFR
or IELTS equivalences. `seed` is required for sampling; a request for more units than exist returns
all matches, in canonical ID order. Unknown or repeated controls are rejected rather than ignored.
See [reproduction and parameter limits](docs/REPRODUCIBILITY.md).

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

The legacy datasets are regenerated with standard-library-only Python:

```bash
python3 scripts/extract_vocabulary.py 1-22yas.xlsx data/vocabulary.json
python3 scripts/extract_corpus.py tree.json data/corpus.json
```

The new practice inventory is compiled in TypeScript from the **Git tree only**:

```bash
curl -fsSL "https://api.github.com/repos/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS/git/trees/ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c?recursive=1" -o /tmp/practice-tree.json
npm run data:practice -- /tmp/practice-tree.json /tmp/practice.json
cmp data/practice.json /tmp/practice.json
npm run docs:check
```

CI re-derives the vocabulary and practice inventories, validates the actual CFF schema, and detects
contract/report drift. Runtime requests are offline: no upstream scraping, database or model API is used.

## Quality

- **100% coverage** — statements, branches, functions and lines, enforced per file by the test
  runner (`npm test` fails below 100%), including the new TypeScript metadata compiler and artifact
  generators. Zero runtime dependencies; validation libraries are development-only.
- **super-linter** runs on pushes, pull requests, weekly, and on demand. It lints TypeScript,
  JavaScript, JSON, YAML, Markdown and infrastructure, with persisted diagnostics. Two Checkov
  auth-required OpenAPI rules are explicitly inapplicable to this public no-auth API; other
  security rules remain enabled. See [the scoped policy](.checkov.yaml).
- **Typechecked** with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and
  `noUnusedLocals`.
- **Reproducible metadata** — pinned source commits, SHA-256 fingerprints, stable IDs, bounded
  filters and required-seed practice sampling. Archive the code revision and index checksum as
  well as request parameters; live health and unseeded vocabulary sampling are not immutable.
- **Contract tests** — a real OpenAPI 3.1 validator and strict JSON Schema validation of live
  success/error responses and every practice unit.

```bash
npm ci
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

If you use the API or its original metadata, please cite the software and the upstream source
whose metadata you analysed. Access is free regardless of whether you cite it. For unreleased
work, also record the exact code commit.

```bibtex
@software{ielts_api,
  title   = {IELTS API: a free, no-authentication TypeScript API for IELTS preparation research},
  author  = {{The IELTS API contributors}},
  year    = {2026},
  version = {1.0.0},
  url     = {https://github.com/johnlikescarrot/IELTS-API},
  license = {MIT; CC-BY-4.0 for original metadata and guidance}
}
```

Machine-readable citation metadata: [`CITATION.cff`](CITATION.cff), [`codemeta.json`](codemeta.json),
[`.zenodo.json`](.zenodo.json), and generated [`docs/citation.bib`](docs/citation.bib).
**No Zenodo archive, DOI, peer review, Google Scholar inclusion or citation count is claimed.**
The `/research` page serves the full report with bibliographic tags; publication on a stable public
host and any archival deposit still require maintainer action. See the
[scholarly publication checklist](docs/SCHOLARLY-PUBLICATION.md).

For legacy vocabulary analyses, also cite the original source:

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
- **Original metadata and guidance:** [CC BY 4.0](DATA-LICENSE), with attribution.
- **Upstream content:** rights remain separate and may be unknown. In particular, the provenance
  and rights of legacy vocabulary glosses are unresolved; transformation does not clear them.
- **Band descriptors:** original condensed paraphrases, _not_ the official IELTS wording. Cite the
  published descriptors from <https://www.ielts.org/for-organisations/ielts-scoring-in-detail> when
  you need the authoritative text.
- **Score concordances:** indicative values compiled from the providers' own published comparison
  tables. Receiving institutions apply their own rules.
- **Indexed files:** `/v1/corpus` and `/v1/practice` publish metadata only, never upstream binaries.
  The practice extension does not import exercise text, answer keys, recordings, source code or learner data.

IELTS is a jointly owned trademark of the British Council, IDP: IELTS Australia and Cambridge
Assessment English. This project is not affiliated with, endorsed by, or connected to the IELTS
partners.

[corpus]: https://github.com/zhengyishiming/IELTS
[practice-source]: https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS
