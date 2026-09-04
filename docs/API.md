# IELTS-API Reference

Base URL of a local instance: `http://localhost:3000`.
**No authentication. No API key. CORS is open.**

Machine-readable contract: [`GET /openapi.json`](../src/openapi.ts) (OpenAPI 3.0).

## Conventions

- List endpoints accept `search`, `limit` (default 20, max 100) and `offset` (default 0)
  and return `{ total, limit, offset, items }`.
- Static collections (tips, question types, practice sets, study plans) return
  `{ count, items }`.
- Errors return `{ error }` with HTTP 400 (bad parameter) or 404 (unknown id/route).

## Endpoints

| Method | Path                               | Description                                                                       |
| ------ | ---------------------------------- | --------------------------------------------------------------------------------- |
| GET    | `/`                                | Welcome payload + endpoint index                                                  |
| GET    | `/health`                          | Health check (`status: ok`)                                                       |
| GET    | `/openapi.json`                    | OpenAPI 3.0 document                                                              |
| GET    | `/api/v1/meta`                     | Dataset counts                                                                    |
| GET    | `/api/v1/vocabulary`               | Vocabulary; filters: `level` (A2–C2), `category`, `pos`, `sort` (`word`\|`level`) |
| GET    | `/api/v1/vocabulary/random`        | Random items; `count` 1–20                                                        |
| GET    | `/api/v1/vocabulary/:id`           | One entry                                                                         |
| GET    | `/api/v1/writing/task1`            | Task 1 prompts; filter `category`                                                 |
| GET    | `/api/v1/writing/task2`            | Task 2 prompts; filter `category`                                                 |
| GET    | `/api/v1/writing/samples`          | Band-scored samples; filter `task` (1\|2)                                         |
| GET    | `/api/v1/writing/tips`             | Writing tips                                                                      |
| GET    | `/api/v1/writing/common-mistakes`  | Mistakes with corrections                                                         |
| GET    | `/api/v1/speaking/part1`           | Part 1 topics                                                                     |
| GET    | `/api/v1/speaking/part2`           | Part 2 cue cards                                                                  |
| GET    | `/api/v1/speaking/part3`           | Part 3 topics                                                                     |
| GET    | `/api/v1/speaking/tips`            | Speaking tips                                                                     |
| GET    | `/api/v1/reading/question-types`   | Reading question taxonomy                                                         |
| GET    | `/api/v1/reading/tips`             | Reading tips                                                                      |
| GET    | `/api/v1/reading/practice`         | Reading practice sets                                                             |
| GET    | `/api/v1/listening/question-types` | Listening question taxonomy                                                       |
| GET    | `/api/v1/listening/tips`           | Listening tips                                                                    |
| GET    | `/api/v1/listening/practice`       | Listening practice sets                                                           |
| GET    | `/api/v1/grammar`                  | Grammar rules                                                                     |
| GET    | `/api/v1/grammar/:id`              | One rule                                                                          |
| GET    | `/api/v1/collocations`             | Collocations; filter `formality`                                                  |
| GET    | `/api/v1/idioms`                   | Idioms                                                                            |
| GET    | `/api/v1/phrasal-verbs`            | Phrasal verbs                                                                     |
| GET    | `/api/v1/study-plans`              | Study plans                                                                       |
| GET    | `/api/v1/study-plans/:id`          | One plan                                                                          |
| GET    | `/api/v1/calculators/overall`      | Overall band from `listening`, `reading`, `writing`, `speaking` (0–9, 0.5 steps)  |
| GET    | `/api/v1/calculators/listening`    | Listening `raw` (0–40) → band                                                     |
| GET    | `/api/v1/calculators/reading`      | Reading `raw` (0–40) + `type` (`academic`\|`general`) → band                      |

## Examples

```bash
# B2 environment vocabulary, sorted by word
curl "http://localhost:3000/api/v1/vocabulary?level=B2&category=environment&sort=word"

# Three random words for a warm-up
curl "http://localhost:3000/api/v1/vocabulary/random?count=3"

# Overall band for L7.0 R7.5 W6.5 S7.0
curl "http://localhost:3000/api/v1/calculators/overall?listening=7&reading=7.5&writing=6.5&speaking=7"
# -> {"listening":7,"reading":7.5,"writing":6.5,"speaking":7,"mean":7,"overall":7}

# General Training reading: 30/40
curl "http://localhost:3000/api/v1/calculators/reading?raw=30&type=general"
# -> {"raw":30,"type":"general","band":6}
```

## Band conversion notes

Listening/Reading converters use widely published approximate raw-to-band tables
(see `src/utils/bands.ts`). Real test boundaries vary slightly per paper; the
overall-band rounding implements the official rule (x.25 → next half band,
x.75 → next whole band).
