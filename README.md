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

Everything here is built on open corpora: [`zhengyishiming/IELTS`][corpus] for the material dump and
[`ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS`][practice-corpus] for the graded practice corpus. See
[RESEARCH.md](RESEARCH.md) for the corpus analyses and the dataset construction methodology, and
[paper/paper.md](paper/paper.md) for the short research paper.

## Quick start

```bash
npx ielts-api                 # or: npm install -g ielts-api
# ielts-api 1.1.0 listening on http://0.0.0.0:3000
```

```bash
# 4,174 headwords from Cambridge IELTS volumes 1-22
curl -s "http://localhost:3000/v1/vocabulary?q=environment&limit=3"

# Overall band score, with the IELTS rounding rule applied
curl -s "http://localhost:3000/v1/scores/overall?listening=7&reading=6.5&writing=6&speaking=7"

# One headword, with phonetics, senses and morpheme hints
curl -s "http://localhost:3000/v1/vocabulary/atmosphere"

# The open practice corpus: 1,804 indexed lessons and full tests
curl -s "http://localhost:3000/v1/practice"
curl -s "http://localhost:3000/v1/practice/lessons?series=reading-1232&level=A1-A2&sort=words&order=desc&limit=5"
```

Open <http://localhost:3000/docs> for the interactive documentation and
`/openapi.json` for the OpenAPI 3.1 document.

```js
import { startApiServer, searchVocabulary, searchPractice, calculateOverall } from 'ielts-api';

const server = await startApiServer('0.0.0.0', 3000);
// ...or use the library without a server:
const page = searchVocabulary({ query: 'sustainab', limit: 10, offset: 0 });
const lessons = searchPractice({ series: ['reading-1232'], levels: ['C1-C2'], limit: 5, offset: 0 });
```

## Datasets

| Dataset                         |                                            Size | Endpoint                | Provenance                                                                |
| ------------------------------- | ----------------------------------------------: | ----------------------- | ------------------------------------------------------------------------- |
| Cambridge IELTS 1-22 vocabulary |             4,174 headwords / 4,310 occurrences | `/v1/vocabulary`        | Derived from `1-22yas.xlsx` in [the upstream corpus][corpus]              |
| Analytic band descriptors       |      120 rows (3 sets x 4 criteria x bands 0-9) | `/v1/bands/descriptors` | Original condensed paraphrases (see [DATA-LICENSE](DATA-LICENSE))         |
| Band scale with CEFR levels     |                                         19 rows | `/v1/bands`             | Original compilation                                                      |
| Score concordances              |                             5 scales x 11 bands | `/v1/scores/convert`    | Providers' published comparison tables                                    |
| Writing Task 2 prompts          | 111 prompts, 15 categories, 5 question families | `/v1/topics/writing`    | Original items modelled on recurring IELTS question families              |
| Speaking items                  |        80 items across Parts 1-3 (26 / 30 / 24) | `/v1/topics/speaking`   | Original items                                                            |
| Writing Task 1 families         |                                10 task families | `/v1/tasks/writing`     | Original compilation                                                      |
| Free resources                  |                                    28 resources | `/v1/resources`         | Original catalogue (free + no login only)                                 |
| Research corpus index           |                        76 of 404 upstream files | `/v1/corpus`            | Metadata index of [the upstream corpus][corpus]                           |
| Practice corpus index           |       1,804 items / 15,558 questions / 4 series | `/v1/practice`          | Derived metadata index of [the upstream practice corpus][practice-corpus] |

## Endpoints

All endpoints are `GET`, CORS-open, ETag-cached and authentication-free. Every JSON response uses the
same envelope: `{ "status": 200, "data": ..., "meta": ... }`.

| Method | Path                       | Description                                                                                       |
| ------ | -------------------------- | ------------------------------------------------------------------------------------------------- |
| GET    | `/`                        | Service index, dataset sizes, citation links                                                      |
| GET    | `/v1`                      | List every versioned endpoint                                                                     |
| GET    | `/health`                  | Liveness and dataset availability                                                                 |
| GET    | `/docs`                    | Human-readable documentation                                                                      |
| GET    | `/openapi.json`            | OpenAPI 3.1 document generated from the live route table                                          |
| GET    | `/v1/vocabulary`           | Search the vocabulary dataset (`q`, `match`, `volume`, `pos`, `sort`, `order`, `limit`, `offset`) |
| GET    | `/v1/vocabulary/stats`     | Dataset statistics                                                                                |
| GET    | `/v1/vocabulary/random`    | Seeded random sample (`count`, `seed`)                                                            |
| GET    | `/v1/vocabulary/daily`     | Deterministic entry for a date (`date`, `count`)                                                  |
| GET    | `/v1/vocabulary/:word`     | Look up one headword                                                                              |
| GET    | `/v1/bands`                | The band scale with indicative CEFR levels                                                        |
| GET    | `/v1/bands/descriptors`    | Band descriptors (`set`, `criterion`, `band`)                                                     |
| GET    | `/v1/bands/:band`          | One band, with the descriptors that bracket it                                                    |
| GET    | `/v1/scores/overall`       | Overall band from the four components                                                             |
| GET    | `/v1/scores/convert`       | IELTS band to CEFR / TOEFL iBT / Cambridge / PTE / DET                                            |
| GET    | `/v1/scores/interpret`     | Another scale back to an indicative IELTS band                                                    |
| GET    | `/v1/topics/writing`       | Writing Task 2 prompts (`category`, `type`, `q`)                                                  |
| GET    | `/v1/topics/speaking`      | Speaking Parts 1-3 (`part`, `q`)                                                                  |
| GET    | `/v1/tasks/writing`        | Writing Task 1 families (`module`)                                                                |
| GET    | `/v1/corpus`               | Corpus metadata, statistics and facets                                                            |
| GET    | `/v1/corpus/stats`         | Corpus statistics                                                                                 |
| GET    | `/v1/corpus/items`         | Search the corpus index                                                                           |
| GET    | `/v1/practice`             | Practice-corpus index, series facts and statistics                                                |
| GET    | `/v1/practice/stats`       | Practice-corpus statistics only                                                                   |
| GET    | `/v1/practice/types`       | Item-type taxonomy with occurrences across the corpus                                             |
| GET    | `/v1/practice/lessons`     | Search the practice index (`series`, `level`, `type`, `skill`, `kind`, `q`, `sort`, `order`)      |
| GET    | `/v1/practice/lessons/:id` | Look up one indexed practice item                                                                 |
| GET    | `/v1/resources`            | Free preparation resources (`type`, `q`)                                                          |

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

**Practice corpus.** A row of the CEFR-graded reading index — identifiers and measures only; the
passages themselves stay upstream.

```jsonc
GET /v1/practice/lessons/reading_a1_a2_001
{
  "status": 200,
  "data": {
    "id": "reading_a1_a2_001", "series": "reading-1232", "skill": "reading", "kind": "lesson",
    "level": "A1-A2", "number": 1, "words": 321, "questions": 12,
    "types": ["multiple_choice", "sentence_completion", "true_false_not_given"],
    "flags": { "audio": false, "processed": false, "strategies": false },
    "upstreamPath": "Reading_1232_Basic/frontend/data/A1-A2/lesson_001.json",
    "sourceUrl": "https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS/blob/main/..."
  }
}
```

## Reproducible data pipeline

All generated datasets are regenerated from source with standard-library-only Python:

```bash
python3 scripts/extract_vocabulary.py 1-22yas.xlsx data/vocabulary.json
python3 scripts/extract_corpus.py tree.json data/corpus.json

# Practice corpus: needs the upstream tree JSON plus a blobless sparse clone
git clone --filter=blob:none --no-checkout https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS.git /tmp/practice
git -C /tmp/practice sparse-checkout init --no-cone
git -C /tmp/practice sparse-checkout set 'Reading_1232_Basic/frontend/data/**/*.json' \
  'Listening_204_FullTest/Test_*/Test_*.json' 'Reading_315_FullTest/Test_*/Test_*.json'
git -C /tmp/practice checkout "$(python3 - <<'PY'
import json; print(json.load(open('data/practice.json'))['meta']['commit'])
PY
)"
python3 scripts/extract_practice.py tree.json /tmp/practice data/practice.json
```

CI re-derives `data/vocabulary.json` and `data/practice.json` from the upstream workbook on every push and fails if the
committed dataset has drifted.

## Quality

- **100% coverage** — statements, branches, functions and lines, enforced per file by the test
  runner (`npm test` fails below 100%). 322 tests, zero runtime dependencies.
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
  version = {1.1.0},
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

@misc{ielts_open_practice_corpus,
  title  = {UPGRADE YOUR IELTS SKILLS: an open corpus of graded IELTS listening and reading practice},
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
- **Upstream files:** never redistributed. `/v1/corpus` and `/v1/practice` publish metadata only —
  including for the practice corpus, whose passages, questions and audio stay upstream; the learner
  workbook that ships with it (student names, device identifiers) is excluded from the index.

IELTS is a jointly owned trademark of the British Council, IDP: IELTS Australia and Cambridge
Assessment English. This project is not affiliated with, endorsed by, or connected to the IELTS
partners.

[corpus]: https://github.com/zhengyishiming/IELTS
[practice-corpus]: https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS
