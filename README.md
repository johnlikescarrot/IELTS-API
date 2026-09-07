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

Everything here is derived from five open collections — [`zhengyishiming/IELTS`][corpus] for the
vocabulary and the corpus index, [`ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS`][practice] for the
question-type taxonomy and the practice-test structure and readability index,
[`Oxidaner/ielts`][materials] for the study-materials index, [`msneloy/IELTS`][archive] for the
grey-literature archive index, and [`wanli4473/yysd-testcenter`][testcenter] for the mock-exam
test-centre index. None is redistributed: the API publishes derived, non-substitutive
metadata and statistics, plus original guidance datasets written for this project. See
[RESEARCH.md](RESEARCH.md) for the analysis and the construction methodology of every dataset, and
[paper/paper.md](paper/paper.md) for the short research paper.

The API also analyses text, not just publishes it: `/v1/tools/readability` scores any passage with
the Flesch formulas and places it next to the corpus group means, `/v1/tools/essay-profile` turns a
writing sample into lexical, structural and theme measurements with descriptor-aligned hints, and
`/v1/study/plan` composes every dataset into a deterministic week-by-week study schedule. And it
indexes what preparation material looks like before anyone curates it: `/v1/archive` catalogues a
5.4 GB grey-literature archive — the Cambridge IELTS 1-18 listening audio with a per-volume
naming-scheme and completeness table, the twelve official sample tasks measured for readability, and
24 marked learner essays summarised statistically. And it indexes what an operational test centre
looks like from the inside: `/v1/testcenter` opens up a live online mock-exam centre — its paper
catalogue, its Cambridge holdings, the hand-tagged question-type, scene and difficulty taxonomy its
teachers maintain across Cambridge 5-21, its exam-shell timing budgets, and the production
raw-score-to-band calibration its exam pages are graded with.

And it closes the gap between a mark sheet and a band: `/v1/scores/raw` converts a Listening or
Reading raw score out of 40 into a band on the right table — Academic and General Training Reading
are scored differently, and conflating them is worth a whole band at four raw scores — then reports
how many marks the next band needs and how the band would move if one answer went the other way.
IELTS publishes no official conversion table, only the average marks scored at whole bands, so
`/v1/scores/raw/tables` publishes the reconstructed tables together with the exact raw scores at
which widely-cited sources disagree. See [RESEARCH.md](RESEARCH.md) Part VI.

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

# 29 correct out of 40: the band, how far the next one is, and how safe the score is
curl -s "http://localhost:3000/v1/scores/raw?module=reading-academic&correct=29&target=7"

# One headword, with phonetics, senses and morpheme hints
curl -s "http://localhost:3000/v1/vocabulary/atmosphere"

# Flesch readability of any text, placed against the corpus groups
curl -s "http://localhost:3000/v1/tools/readability?text=Dogs%20run%20fast.%20Cats%20sleep%20a%20lot."

# A deterministic eight-week study plan towards band 7
curl -s "http://localhost:3000/v1/study/plan?target=7&writing=6&speaking=6.5"

# The 13 IELTS question types, ranked by how often they occur in 27,225 practice questions
curl -s "http://localhost:3000/v1/question-types?skill=listening"

# Graded reading passages between Flesch Reading Ease 60 and 80
curl -s "http://localhost:3000/v1/tests/items?level=b1-b2&minReadingEase=60&maxReadingEase=80"

# The concession-rebuttal essay plan, with stages, cue language and pitfalls
curl -s "http://localhost:3000/v1/frameworks/w2-concession-rebuttal"

# What a self-study collection looks like: 2,354 preparation files by category and skill
curl -s "http://localhost:3000/v1/materials/items?category=past-paper-recall"

# The Cambridge 1-18 listening archive, volume by volume: naming era, tests, completeness
curl -s "http://localhost:3000/v1/archive/volumes"

# Five published review schedulers over a year, scored on one retention model
curl 'http://localhost:3000/v1/retention/compare?horizonDays=365&quality=5'
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

| Dataset                         |                                                     Size | Endpoint                | Provenance                                                                     |
| ------------------------------- | -------------------------------------------------------: | ----------------------- | ------------------------------------------------------------------------------ |
| Cambridge IELTS 1-22 vocabulary |                      4,174 headwords / 4,310 occurrences | `/v1/vocabulary`        | Derived from `1-22yas.xlsx` in [the upstream corpus][corpus]                   |
| Analytic band descriptors       |               120 rows (3 sets x 4 criteria x bands 0-9) | `/v1/bands/descriptors` | Original condensed paraphrases (see [DATA-LICENSE](DATA-LICENSE))              |
| Band scale with CEFR levels     |                                                  19 rows | `/v1/bands`             | Original compilation                                                           |
| Score concordances              |                                      5 scales x 11 bands | `/v1/scores/convert`    | Providers' published comparison tables                                         |
| Raw-score conversion tables     |            3 papers x 41 raw scores, 12 official anchors | `/v1/scores/raw`        | Reconstructed consensus, validated against ielts.org published averages        |
| Writing Task 2 prompts          |          111 prompts, 15 categories, 5 question families | `/v1/topics/writing`    | Original items modelled on recurring IELTS question families                   |
| Speaking items                  |                 80 items across Parts 1-3 (26 / 30 / 24) | `/v1/topics/speaking`   | Original items                                                                 |
| Writing Task 1 families         |                                         10 task families | `/v1/tasks/writing`     | Original compilation                                                           |
| Free resources                  |                                             27 resources | `/v1/resources`         | Original catalogue (free + no login only)                                      |
| Research corpus index           |                                 76 of 404 upstream files | `/v1/corpus`            | Metadata index of [the upstream corpus][corpus]                                |
| Question-type taxonomy          |                  13 types, 65 upstream labels normalised | `/v1/question-types`    | Original taxonomy and guidance; frequencies from the practice corpus           |
| Practice-test index             | 1,702 items / 27,225 questions / 1,501 measured passages | `/v1/tests`             | Derived structure and readability index of [the practice collection][practice] |
| Recurring exam themes           |                                     50 themes, 11 groups | `/v1/topics/themes`     | Original compilation with keyword sets                                         |
| Analysis toolkit                |      2 analysers over any text (Flesch, lexical, themes) | `/v1/tools/*`           | Original heuristics ([RESEARCH.md](RESEARCH.md) Part III)                      |
| Study planner                   |               Deterministic schedules from 1 to 52 weeks | `/v1/study/plan`        | Composition of the datasets above                                              |
| Response frameworks             |                                12 frameworks, 3 sections | `/v1/frameworks`        | Original taxonomy with stages, cue language and pitfalls                       |
| Study-materials index           |                            2,354 of 2,385 upstream files | `/v1/materials`         | Metadata index of [the self-study collection][materials]                       |
| Grey-literature archive         |         555 files / 509 audio tracks / 24 learner essays | `/v1/archive`           | Derived index of [the grey-literature archive][archive]                        |
| Mock-exam test-centre index     |    377 papers / 222 Cambridge 4-21 / 1,099 tagged groups | `/v1/testcenter`        | Derived index of [the YYSD mock-exam test centre][testcenter]                  |
| Forgetting curve and schedulers | 4 savings series / 28 observations / 5 review schedulers | `/v1/retention`         | Published data and algorithms, transcribed with per-record citations           |

## Endpoints

All endpoints are `GET`, CORS-open, ETag-cached and authentication-free. Every JSON response uses the
same envelope: `{ "status": 200, "data": ..., "meta": ... }`.

| Method | Path                           | Description                                                                                             |
| ------ | ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| GET    | `/`                            | Service index, dataset sizes, citation links                                                            |
| GET    | `/v1`                          | List every versioned endpoint                                                                           |
| GET    | `/health`                      | Liveness and dataset availability                                                                       |
| GET    | `/docs`                        | Human-readable documentation                                                                            |
| GET    | `/openapi.json`                | OpenAPI 3.1 document generated from the live route table                                                |
| GET    | `/v1/vocabulary`               | Search the vocabulary dataset (`q`, `match`, `volume`, `pos`, `sort`, `order`, `limit`, `offset`)       |
| GET    | `/v1/vocabulary/stats`         | Dataset statistics                                                                                      |
| GET    | `/v1/vocabulary/random`        | Seeded random sample (`count`, `seed`)                                                                  |
| GET    | `/v1/vocabulary/daily`         | Deterministic entry for a date (`date`, `count`)                                                        |
| GET    | `/v1/vocabulary/:word`         | Look up one headword                                                                                    |
| GET    | `/v1/bands`                    | The band scale with indicative CEFR levels                                                              |
| GET    | `/v1/bands/descriptors`        | Band descriptors (`set`, `criterion`, `band`)                                                           |
| GET    | `/v1/bands/:band`              | One band, with the descriptors that bracket it                                                          |
| GET    | `/v1/scores/overall`           | Overall band from the four components                                                                   |
| GET    | `/v1/scores/raw`               | Raw score out of 40 to a band (`module`, `correct`, `outOf`, `target`)                                  |
| GET    | `/v1/scores/raw/tables`        | The three conversion tables, with measured disagreement between published sources                       |
| GET    | `/v1/scores/convert`           | IELTS band to CEFR / TOEFL iBT / Cambridge / PTE / DET                                                  |
| GET    | `/v1/scores/interpret`         | Another scale back to an indicative IELTS band                                                          |
| GET    | `/v1/topics/writing`           | Writing Task 2 prompts (`category`, `type`, `q`)                                                        |
| GET    | `/v1/topics/speaking`          | Speaking Parts 1-3 (`part`, `q`)                                                                        |
| GET    | `/v1/topics/themes`            | Recurring exam themes (`group`, `skill`, `q`)                                                           |
| GET    | `/v1/tasks/writing`            | Writing Task 1 families (`module`)                                                                      |
| GET    | `/v1/question-types`           | Question-type taxonomy with strategies and observed frequencies (`skill`, `family`, `q`)                |
| GET    | `/v1/question-types/:id`       | One question type, with its traps and upstream label variants                                           |
| GET    | `/v1/frameworks`               | Response frameworks for Writing Task 2 and Speaking Parts 2-3 (`section`, `skill`, `type`, `part`, `q`) |
| GET    | `/v1/frameworks/:id`           | One framework, with its ordered stages, cue language and pitfalls                                       |
| GET    | `/v1/tests`                    | Practice-test index: provenance, statistics, facets                                                     |
| GET    | `/v1/tests/stats`              | Question-type and readability statistics                                                                |
| GET    | `/v1/tests/items`              | Search the index (`collection`, `skill`, `level`, `type`, `minReadingEase`, `sort`, ...)                |
| GET    | `/v1/tests/:id`                | One indexed practice test or graded reading lesson                                                      |
| GET    | `/v1/corpus`                   | Corpus metadata, statistics and facets                                                                  |
| GET    | `/v1/corpus/stats`             | Corpus statistics                                                                                       |
| GET    | `/v1/corpus/items`             | Search the corpus index                                                                                 |
| GET    | `/v1/materials`                | Study-materials metadata, statistics and facets                                                         |
| GET    | `/v1/materials/stats`          | Study-materials statistics                                                                              |
| GET    | `/v1/materials/items`          | Search the materials index (`category`, `skill`, `format`, `q`)                                         |
| GET    | `/v1/archive`                  | Archive provenance, statistics and the Cambridge volume table                                           |
| GET    | `/v1/archive/stats`            | Archive statistics only                                                                                 |
| GET    | `/v1/archive/volumes`          | Cambridge IELTS 1-18 volume table: naming scheme, media era, tracks, tests, completeness                |
| GET    | `/v1/archive/volumes/:id`      | One Cambridge volume row                                                                                |
| GET    | `/v1/archive/items`            | Search the archive index (`collection`, `format`, `media`, `skill`, `volume`, `q`)                      |
| GET    | `/v1/archive/:id`              | One indexed archive item                                                                                |
| GET    | `/v1/testcenter`               | Test-centre provenance, statistics, timing budgets and facets                                           |
| GET    | `/v1/testcenter/stats`         | Test-centre statistics: catalogue, taxonomies, raw-label mappings                                       |
| GET    | `/v1/testcenter/catalog`       | Search the self-marking paper catalogue (`zone`, `subject`, `paper`, `volume`, `q`, `sort`)             |
| GET    | `/v1/testcenter/catalog/:id`   | One catalogue paper, with its tagged question groups when it has any                                    |
| GET    | `/v1/testcenter/volumes`       | The Cambridge holdings matrix: one row per volume hosted by the centre                                  |
| GET    | `/v1/testcenter/volumes/:id`   | One Cambridge holdings row                                                                              |
| GET    | `/v1/testcenter/groups`        | Search the hand-tagged question groups (`paper`, `type`, `scene`, `difficulty`, `volume`, `test`)       |
| GET    | `/v1/testcenter/scenes`        | The teaching-scene vocabulary of both tagged papers, crosswalked to the themes                          |
| GET    | `/v1/testcenter/scoring`       | The production raw-score-to-band calibration, with optional band lookup (`paper`, `raw`)                |
| GET    | `/v1/testcenter/drill`         | Compose a deterministic timed drill from tagged groups (`paper` required, `questions`, `minutes`, ...)  |
| GET    | `/v1/retention`                | Retention overview: the forgetting-curve studies, the schedulers and their sources                      |
| GET    | `/v1/retention/curve`          | Ebbinghaus savings data, three replications and the residuals of the 1885 fit (`study`, `minutes`)      |
| GET    | `/v1/retention/schedulers`     | The five published review schedulers, their ladders, variants and disagreements                         |
| GET    | `/v1/retention/schedulers/:id` | One scheduler, with its full published ladder and provenance                                            |
| GET    | `/v1/retention/schedule`       | Project a review schedule for one item (`scheduler`, `repetitions`, `quality`, `horizonDays`, ...)      |
| GET    | `/v1/retention/grade`          | Grade one review and return the next interval and state (`scheduler`, `quality`, `repetitions`, ...)    |
| GET    | `/v1/retention/compare`        | All five schedulers over one horizon, scored on a shared retention model (`horizonDays`, `quality`)     |
| GET    | `/v1/retention/workload`       | Daily review load for a vocabulary programme (`wordsPerDay`, `scheduler`, `horizonDays`)                |
| GET    | `/v1/tools/readability`        | Flesch Reading Ease, Flesch-Kincaid grade and corpus context for any text (`text`)                      |
| GET    | `/v1/tools/essay-profile`      | Lexical diversity, headword coverage, themes and hints for a writing sample (`text`, `task`)            |
| GET    | `/v1/study/plan`               | Deterministic week-by-week study plan (`target`, `listening`..., `weeks`, `hoursPerWeek`)               |
| GET    | `/v1/resources`                | Free preparation resources (`type`, `q`)                                                                |

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

**Essay profiling.** The profiler measures surface features only and maps them onto the four
Writing criteria; every hint names its numbers, and `meta` repeats that hints are heuristics, not
scores.

```jsonc
GET /v1/tools/essay-profile?text=Governments%20should%20invest%20in%20public%20transport.%20For%20example%2C%20...
{
  "status": 200,
  "data": {
    "task": "task2",
    "length": { "words": 17, "minimumWords": 250, "meetsMinimum": false, ... },
    "lexical": { "tokens": 17, "types": 17, "typeTokenRatio": 1, "rootTtr": 4.12,
                 "headwordTokens": 2, "headwordCoverage": 0.12, ... },
    "sentences": { "count": 2, "avgLength": 8.5, "stdDev": 2.5, "shortest": 6, "longest": 11 },
    "themes": [{ "id": "th-06", "group": "environment",
                 "name": "Climate change and global warming",
                 "matchedKeywords": ["carbon footprint"], "occurrences": 1 }],
    "hints": [
      { "criterion": "task-response", "level": "watch",
        "message": "17 words is under the 250-word minimum for task2; ..." },
      ...
    ],
    "strengths": 0, "watches": 4
  }
}
```

**Study planning.** The planner weights the gaps into weekly hours, splits the weeks into
foundation, practice and polish phases, and links every week to the endpoints that supply its
material. Identical inputs always produce the identical schedule.

````jsonc
GET /v1/study/plan?target=7&writing=6&speaking=6.5&weeks=8&hoursPerWeek=10
{
  "status": 200,
  "data": {
    "inputs": { "target": 7, "weeks": 8, "hoursPerWeek": 10, "wordsPerDay": 10,
                "providedComponents": ["writing", "speaking"],
                "defaultedComponents": ["listening", "reading"] },
    "current": { "components": { "listening": 5.5, "reading": 5.5, "writing": 6, "speaking": 6.5 },
                 "overall": 6, "cefr": "B2" },
    "target": { "band": 7, "cefr": "C1" },
    "gaps": [
      { "skill": "listening", "from": 5.5, "to": 7, "gap": 1.5, "share": 0.33, "hoursPerWeek": 3.3 },
      ...
    ],
    "phases": [
      { "name": "foundation", "fromWeek": 1, "toWeek": 4, "emphasis": "Technique and language building: ..." },
      { "name": "practice", "fromWeek": 5, "toWeek": 7, "emphasis": "Timed practice: ..." },
      { "name": "polish", "fromWeek": 8, "toWeek": 8, "emphasis": "Peak and polish: ..." }
    ],
    "weekly": [
      { "week": 1, "phase": "foundation", "focus": "listening",
        "hours": { "listening": 3.3, "reading": 3.3, "writing": 2.2, "speaking": 1.1 },
        "themes": [{ "id": "th-07", "group": "environment", "name": "Air, water and plastic pollution" }, ...],
        "practice": [
          { "kind": "question-type", "name": "Drill: Multiple choice (more than one answer)",
            "url": "/v1/question-types/multiple-choice-multiple-answer" },
          ...
        ],
        "vocabulary": { "newWords": 50, "reviewWords": 20 },
        "checkpoint": null },
      ...
    ],
    "vocabulary": { "headwordsAvailable": 4174, "wordsPerDay": 10, "wordsPerWeek": 70, "headwordsOverPlan": 560 },
    "notes": ["Components not supplied default to 5.5 (target − 1.5 bands); ...", ...]

**Response framework for an opinion prompt.**

```jsonc
GET /v1/frameworks?type=opinion
{
  "status": 200,
  "data": [
    {
      "id": "w2-thesis-led", "section": "writing-task-2", "name": "Thesis-led essay", "...": "...",
      "stages": [
        { "position": "Introduction", "purpose": "Frame the debate and commit to a position.",
          "moves": ["...", "..."], "language": ["It is often argued that …", "..."] },
        { "position": "Body paragraph 1", "...": "..." }
      ],
      "pitfalls": ["A position that shifts between paragraphs reads as no position at all.", "..."]
    },
    { "id": "w2-concession-rebuttal", "name": "Concession–rebuttal essay", "...": "..." }
  ],
  "meta": { "total": 2, "type": "opinion", "crossLinks": { "writingPrompts": "/v1/topics/writing" } }
}
````

**Study-materials index.** What 2,354 collected preparation files are, by category and skill —
metadata only, never the files.

```jsonc
GET /v1/materials/stats
{
  "status": 200,
  "data": {
    "filesInRepository": 2385, "excludedFiles": 31, "indexedFiles": 2354,
    "byCategory": { "answer-key": 71, "audio": 292, "idea-bank": 3, "...": "...",
                    "practice-material": 1823, "question-bank": 64, "template": 15 },
    "bySkill": { "general": 5, "listening": 722, "reading": 1593, "speaking": 7, "writing": 27 },
    "byFormat": { "pdf": 1282, "mp3": 370, "html": 336, "...": "..." }
  }
}
```

**The grey-literature archive.** One row per Cambridge IELTS volume: how its listening audio is
named, which media era that implies, how many tests the names still encode, and whether the volume
is complete — with watermark provenance flagged where a vendor or channel left a trace.

```jsonc
GET /v1/archive/volumes
{
  "status": 200,
  "data": [
    { "volume": 1,  "namingScheme": "cassette-side", "media": "cassette",
      "audioTracks": 4, "bytes": 110227957, "testsInferred": null, "testNumbers": null,
      "complete": false, "watermarked": false },
    { "volume": 12, "namingScheme": "test-section", "media": "download",
      "audioTracks": 16, "bytes": 181577243, "testsInferred": 4, "testNumbers": [5, 6, 7, 8],
      "complete": true, "watermarked": false },
    { "volume": 16, "namingScheme": "test-section", "media": "download",
      "audioTracks": 16, "bytes": 228728749, "testsInferred": 4, "testNumbers": [1, 2, 3, 4],
      "complete": true, "watermarked": true },
    { "volume": 18, "namingScheme": "none", "media": "none",
      "audioTracks": 0, "bytes": 2396810, "testsInferred": null, "testNumbers": null,
      "complete": false, "watermarked": false },
    ...
  ],
  "meta": { "count": 18, "note": "Naming scheme, media era and recoverable test structure are derived from the file names; see RESEARCH.md Part V." }
}
```

The twelve official sample tasks sit at full-test difficulty (median Flesch Reading Ease 41.5 against
the corpus mean of 43.5), and the 24 marked learner essays are published as per-file statistics
only — eleven aggregates per essay, never the text.

### What the test-centre index measures

The fifth collection is not a data dump but an operational platform: the repository behind the YYSD
IELTS online mock-exam test center, whose self-marking HTML papers are served behind a timed exam
shell and rebuilt into a content manifest on every upload. The index opens that platform up as
research data:

```json
{
  "data": {
    "volume": 10,
    "listening": { "papers": 4, "tests": [1, 2, 3, 4] },
    "reading": { "papers": 4, "tests": [1, 2, 3, 4] },
    "writing": { "papers": 4, "tests": [1, 2, 3, 4] },
    "papersTotal": 12,
    "taggedGroups": 63,
    "taggedQuestions": 316,
    "complete": true
  },
  "meta": { "endpoint": "/v1/testcenter/volumes/:id", "note": "..." }
}
```

Three results fall out of the aggregate. First, the centre hosts an **unbroken Cambridge 4-21** —
all three papers, all four tests, 220 volume-bearing papers plus two teacher-made "secret set"
reading mocks — alongside 140 vocabulary books and three full three-hour CDT-style mock exams. Second, its teachers maintain a hand-curated taxonomy over
almost all of Cambridge 5-21: 1,099 question groups covering 5,408 questions, each labelled with a
canonical question type, one of 24 teaching scenes and one of three difficulty judgements — the
first per-section difficulty map of the Cambridge corpus in this API. Third, the exam pages are
graded with the centre's own production calibration: two raw-score-to-band tables (0-40 to 2.0-9.0)
that the platform injects into every self-marking page, published here with their level labels and
an explicit indicative caveat.

The drill composer turns the tags back into teaching: `/v1/testcenter/drill?paper=listening&scene=tourism&difficulty=hard&questions=10`
assembles a deterministic ten-question listening drill on hard tourism sections, times it with the
centre's own 0.8 min/question budget and attaches the scoring sheet — stateless, seeded by nothing,
byte-identical on every request.

### What the practice-test index measures

The 1,232 CEFR-graded lessons and the 470 machine-readable full tests are indexed by structure and by
passage readability — never by content. Two results fall out of the aggregate:

| Group                  | Items | Mean words | Mean Flesch Reading Ease | Mean Flesch-Kincaid grade |
| ---------------------- | ----: | ---------: | -----------------------: | ------------------------: |
| Graded lessons `A1-A2` |   198 |        253 |                     70.2 |                       5.8 |
| Graded lessons `B1-B2` |   374 |        242 |                     26.0 |                      13.9 |
| Graded lessons `C1-C2` |   660 |        275 |                      5.0 |                      17.8 |
| Full reading tests     |   269 |      2,642 |                     43.5 |                      12.6 |

The CEFR tiers are ordered correctly but calibrated far too hard — the `C1-C2` tier is denser than
the real papers it prepares candidates for — and completion tasks account for 58.5% of listening
questions against 14.3% of reading questions. [RESEARCH.md](RESEARCH.md) works through both findings.

### What the retention layer measures

Vocabulary trainers routinely ship a review ladder under the name of a paper it does not come from.
Ebbinghaus (1885) measured _savings_ — the share of relearning time spared — at seven intervals from
19 minutes to 31 days, and fit them with `b = 100k / ((log10 t)^c + k)`. He never proposed a review
schedule. `/v1/retention/curve` publishes the measurement (his four-series data, including three
independent replications) and `/v1/retention/schedulers` publishes the algorithms, each attributed to
the source that actually contains it — including the folk ladder in wide deployment, flagged
`claimsEbbinghaus: true`.

Scored on one shared retention model over a 365-day horizon of perfect recall:

| Scheduler        | Reviews / year | Terminal interval | Mean predicted recall |
| ---------------- | -------------: | ----------------: | --------------------: |
| `sm2-1990`       |              5 |           131.5 d |                 0.179 |
| `pimsleur-1967`  |             10 |                 — |                 0.781 |
| `folk-ladder`    |             19 |    30 d (its cap) |                 0.490 |
| `leitner-1972`   |             25 |              16 d |                 0.515 |
| `half-life-2016` |             49 |            13.7 d |                 0.900 |

A 9.8-fold spread in study cost between algorithms treated as interchangeable. At 20 new words a day
the folk ladder peaks at **380 reviews a day** against SM-2's 100, and it is the only one of the five
whose schedule _advances on a failed review_. Fitting Ebbinghaus's 1885 equation to his own data
leaves a mean absolute residual of 0.013, with the maximum falling exactly on the 24-hour point with
a positive sign — the sleep-consolidation bump. [RESEARCH.md](RESEARCH.md) Part VIII works through
the provenance, including where the secondary sources on Leitner contradict each other.

## Reproducible data pipeline

Every dataset is regenerated from source with standard-library Python (plus one pinned dependency,
`pypdf`, for the twelve sample PDFs):

```bash
python3 scripts/extract_vocabulary.py 1-22yas.xlsx data/vocabulary.json
python3 scripts/extract_corpus.py tree.json data/corpus.json
python3 scripts/extract_practice_tests.py tree.json ./upstream data/practice-tests.json
python3 scripts/extract_archive.py tree.json ./upstream data/archive.json
python3 scripts/extract_testcenter.py manifest.json listening-taxonomy.json reading-taxonomy.json cambridge_scoring.py tree.json data/testcenter.json
```

CI re-derives the vocabulary, study-materials, archive and test-centre datasets from upstream on
every push — the archive derivation downloads the 38 document blobs it needs by blob SHA, the
test-centre derivation the four content blobs the platform generates — and fails if any committed
dataset has drifted. The practice-test and test-centre indexes are validated for internal
consistency on the same run.

## Quality

- **100% coverage** — statements, branches, functions and lines, enforced per file by the test
  runner (`npm test` fails below 100%). 640 tests, zero runtime dependencies.
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
  version = {1.5.0},
  url     = {https://github.com/johnlikescarrot/IELTS-API},
  license = {MIT, CC-BY-4.0}
}
```

Machine-readable citation metadata: [`CITATION.cff`](CITATION.cff), [`codemeta.json`](codemeta.json),
[`.zenodo.json`](.zenodo.json). Tagged releases are archived on Zenodo, which mints a versioned DOI.

Please also cite the upstream collections the datasets were derived from:

```bibtex
@misc{ielts_open_corpus,
  title  = {IELTS: an open corpus of IELTS preparation materials},
  author = {zhengyishiming},
  year   = {2024},
  url    = {https://github.com/zhengyishiming/IELTS}
}

@misc{ielts_practice_collection,
  title  = {UPGRADE YOUR IELTS SKILLS: a practice-test collection},
  author = {ngoclong1209},
  year   = {2026},
  url    = {https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS}
}

@misc{ielts_grey_literature_archive,
  title  = {IELTS: a grey-literature archive of Cambridge listening audio, official sample tasks and marked assignments},
  author = {msneloy},
  year   = {2022},
  url    = {https://github.com/msneloy/IELTS}
}

@misc{yysd_test_center,
  title  = {yysd-testcenter: the YYSD IELTS online mock-exam test center},
  author = {wanli4473},
  year   = {2026},
  url    = {https://github.com/wanli4473/yysd-testcenter}
}

@misc{ielts_vocab_system,
  title  = {ielts-vocab-system: an IELTS vocabulary learning system},
  author = {Iamdacai},
  year   = {2025},
  url    = {https://github.com/Iamdacai/ielts-vocab-system}
}
```

The retention layer transcribes published research rather than a repository. If you use
`/v1/retention`, cite the primary sources it publishes — they are carried in every response and
listed in [`CITATION.cff`](CITATION.cff):

```bibtex
@book{ebbinghaus1885,
  title     = {{\"U}ber das Ged{\"a}chtnis: Untersuchungen zur experimentellen Psychologie},
  author    = {Ebbinghaus, Hermann},
  year      = {1885},
  publisher = {Duncker \& Humblot}
}

@article{murre2015,
  title   = {Replication and Analysis of Ebbinghaus' Forgetting Curve},
  author  = {Murre, Jaap M. J. and Dros, Joeri},
  journal = {PLOS ONE},
  volume  = {10},
  number  = {7},
  pages   = {e0120644},
  year    = {2015},
  doi     = {10.1371/journal.pone.0120644}
}

@inproceedings{settles2016,
  title     = {A Trainable Spaced Repetition Model for Language Learning},
  author    = {Settles, Burr and Meeder, Brendan},
  booktitle = {Proceedings of the 54th Annual Meeting of the Association for Computational Linguistics},
  pages     = {1848--1858},
  year      = {2016},
  doi       = {10.18653/v1/P16-1174}
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
- **Score calibration:** the `/v1/testcenter/scoring` tables are the conversion charts a production
  mock-exam platform embeds in its own exam pages; they are community-published charts, indicative
  rather than official, and carry that caveat in every response.
- **Upstream files:** never redistributed. `/v1/corpus`, `/v1/tests`, `/v1/archive` and
  `/v1/testcenter` publish derived metadata and statistics only — no passage, question, answer key,
  transcript, recording, PDF content, essay text, exam page or vocabulary entry.
- **Question-type strategies:** original wording. The task families follow the partners' public task
  descriptions; the observed frequencies describe the indexed practice corpus, not the live exam.

IELTS is a jointly owned trademark of the British Council, IDP: IELTS Australia and Cambridge
Assessment English. This project is not affiliated with, endorsed by, or connected to the IELTS
partners.

[corpus]: https://github.com/zhengyishiming/IELTS
[practice]: https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS
[materials]: https://github.com/Oxidaner/ielts
[archive]: https://github.com/msneloy/IELTS
[testcenter]: https://github.com/wanli4473/yysd-testcenter
