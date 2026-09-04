# API reference (v1)

Base URL: any running instance (self-hosted default
`http://localhost:3000`). All endpoints accept GET unless noted. No
authentication, no rate limits, CORS open to every origin.

## Conventions

- Successful single-item responses: `{ "data": { ... } }`.
- List responses: `{ "meta": { "total", "page", "limit", "pages" }, "data":
[ ... ] }`.
- Errors: `{ "error": { "code", "message", "details?" } }` with status codes
  `400` (bad request), `404` (unknown route or id), `405` (method not
  allowed, plus an `Allow` header), `413` (body too large), `500`
  (unexpected error; details are logged server-side only).
- Common query parameters on list endpoints:
  - `page` (>= 1, default 1)
  - `limit` (1-100, default 20)
  - `q` — case-insensitive substring search across the resource's text
    fields
- Trailing slashes are ignored (`/v1/words/` equals `/v1/words`).

## Service discovery

| Endpoint            | Description                                                                   |
| ------------------- | ----------------------------------------------------------------------------- |
| `GET /`             | Full directory: name, version, license, citation strings, endpoint list       |
| `GET /health`       | `{ "status": "ok", ... }` liveness probe                                      |
| `GET /v1`           | Endpoints under the current major version                                     |
| `GET /v1/meta`      | Dataset counts, release date, citation (APA + BibTeX), provenance, disclaimer |
| `GET /openapi.json` | OpenAPI 3.1 document generated from the live route table                      |
| `GET /docs`         | HTML reference page                                                           |

## Vocabulary — `/v1/words`

Filters: `topic` (see `/v1/words/topics`), `pos`
(`noun|verb|adjective|adverb|phrase`), `band` (5-9), `q` (searches word,
meaning, example, synonyms, collocations). Sorting: `sort`
(`id|word|band|topic`, default `word`) and `order` (`asc|desc`).

```bash
curl "http://localhost:3000/v1/words?topic=environment&band=8&sort=word&order=desc"
curl "http://localhost:3000/v1/words/w011"
```

Word shape: `{ id, word, ipa, partOfSpeech, band, topic, meaning, example,
synonyms[], collocations[] }`.

## Practice tests — `/v1/practice/tests`

Filters: `skill` (`reading|listening`), `module`
(`academic|general_training`; listening tests match both), `q` (title and
id). Each test contains `sections`; reading sections carry `passage` and
optionally a `headings` bank, listening sections carry `scenario` and
`transcript`.

```bash
curl "http://localhost:3000/v1/practice/tests?skill=reading"
curl "http://localhost:3000/v1/practice/tests/rt-001"
curl "http://localhost:3000/v1/practice/sections/lt-001-s1"
```

## Question bank — `/v1/practice/questions`

Every question from every test, flattened with `testId`, `sectionId`, and
`skill`. Filters: `testId`, `sectionId`, `skill`, `type`
(`multiple_choice|true_false_not_given|sentence_completion|short_answer|matching_headings|note_completion`),
`band` (5-9), `q` (searches prompts and explanations). Answers and
explanations are always included.

```bash
curl "http://localhost:3000/v1/practice/questions?type=multiple_choice&band=7"
```

## Writing — `/v1/writing/tasks` and `/v1/writing/mistakes`

Task filters: `task` (`1|2`), `format` (`report|letter|essay`), `module`,
`topic`, `q`. Mistake filters: `category`
(`grammar|word_choice|spelling|punctuation|style|cohesion`), `q`.

```bash
curl "http://localhost:3000/v1/writing/tasks?task=2&format=essay"
curl "http://localhost:3000/v1/writing/mistakes?category=grammar"
```

## Speaking — `/v1/speaking`

Filters: `part` (`1|2|3`), `topic`, `q` (searches Part 1/3 questions and
Part 2 prompts/model answers). Part 2 items include a cue card
(`prompt`, `points`), a `sampleAnswer`, and `keyVocabulary` with
definitions.

```bash
curl "http://localhost:3000/v1/speaking?part=2"
```

## Tips — `/v1/tips`

Filters: `skill` (`listening|reading|writing|speaking|general`).

```bash
curl "http://localhost:3000/v1/tips?skill=writing"
```

## Band tools — `/v1/bands`

- `GET /v1/bands/tables` — indicative raw-to-band brackets for
  `listening`, `academic_reading`, `general_training_reading`.
- `GET /v1/bands/calculator?skill=listening&raw=30` or
  `POST /v1/bands/calculator` with `{"skill": "...", "raw": 0-40}` —
  converts one raw score to a band.
- `POST /v1/bands/overall` with four component bands (0-9 in half steps) —
  returns the overall band using the published rounding rule (mean of the
  four skills, nearest half band, `.25` rounds up).

```bash
curl -X POST "http://localhost:3000/v1/bands/overall" \
  -H 'content-type: application/json' \
  -d '{"listening":7.5,"reading":7,"writing":6,"speaking":6.5}'
# => { "data": { "overall": 7, ... } }
```

Boundaries are indicative, commonly published values; exact cut-offs vary
between test versions.
