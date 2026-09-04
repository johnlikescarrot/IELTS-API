# IELTS API

A free, open-source, **no-authentication** REST API for IELTS study, written in
TypeScript. It provides band-score calculation, reference material about the
exam structure, original writing prompts, speaking cue cards, an academic
vocabulary bank and reading question-type guides — all behind a simple JSON
interface with no keys, no sign-ups and no rate-limiting at the application
layer.

> **Status:** v0.1.0 — early, intentionally small and fully covered. Every
> feature ships with tests; coverage is held at **100%** and the codebase is
> kept green under [super-linter](https://github.com/super-linter/super-linter).

## Highlights

- **Free & open** — no authentication, no API keys, permissive MIT licence.
- **Deterministic practice generators** — pass a `seed` and always get the same
  prompt back, so results are reproducible and cacheable.
- **100% code coverage** enforced by thresholds (statements, branches,
  functions and lines).
- **No runtime dependencies** — the HTTP layer is built directly on Node's
  `http` module.
- **Batteries included for CI** — Prettier, ESLint (TypeScript) and
  super-linter workflows.

## Why this project?

The IELTS band scale, exam structure, task types and scoring logic are public
facts, and every examiner teaches against the same official descriptors. This
project packages that knowledge plus **original** practice material (written
from scratch for this repo, not copied from any test publisher) into a clean,
machine-readable API so that student tools, chatbots and study apps can be
built on top of it for free.

All descriptive content about the test structure is general, factual
information. Any practice prompts, cue cards, vocabulary entries and examples
in this repository are original works created for this project.

## Getting started

```bash
npm install
npm run build      # compile TypeScript to dist/
npm start          # serve the API on 0.0.0.0:3000 (override with PORT/HOST)
```

Development:

```bash
npm run dev        # tsx watch
npm test           # run tests
npm run test:coverage   # run tests and assert 100% coverage
npm run lint       # ESLint
npm run format     # Prettier (write)
npm run check      # format:check + lint + build + test:coverage
```

## API reference

Base URL (self-hosted): `http://localhost:3000`

Every success response uses a JSON envelope:

```json
{ "data": { "...": "..." } }
```

Paginated collections add a `meta` object with `total`, `offset`, `limit` and
`count`. Errors always look like:

```json
{ "error": { "code": "bad_request", "message": "...", "details": {} } }
```

| Method | Path                                            | Description                                                                  |
| ------ | ----------------------------------------------- | ---------------------------------------------------------------------------- |
| GET    | `/`                                             | Service information and a self-describing endpoint list                      |
| GET    | `/health`                                       | Health/uptime probe                                                          |
| GET    | `/v1/exam/overview`                             | Full exam structure and scoring note                                         |
| GET    | `/v1/exam/papers/:id`                           | One paper: `listening`, `reading`, `writing`, `speaking`                     |
| GET    | `/v1/bands/overall`                             | Overall band from `listening`, `reading`, `writing`, `speaking` query params |
| POST   | `/v1/bands/overall`                             | Same as above with a JSON body                                               |
| GET    | `/v1/bands/listening?raw=35`                    | Convert a raw Listening mark to a band                                       |
| GET    | `/v1/bands/reading?raw=30&module=academic`      | Convert a raw Reading mark to a band (`module=academic\|general`)            |
| GET    | `/v1/bands/tables`                              | The raw-to-band conversion tables                                            |
| GET    | `/v1/writing/tasks`                             | Guidance for Task 1 and Task 2                                               |
| GET    | `/v1/writing/categories`                        | Writing prompt categories                                                    |
| GET    | `/v1/writing/prompts`                           | List/filter prompts (`task`, `module`, `category`, paging)                   |
| GET    | `/v1/writing/prompts/generate?count=3&seed=abc` | Deterministic generated essay prompts                                        |
| GET    | `/v1/writing/prompts/random?seed=5`             | One deterministic random prompt                                              |
| GET    | `/v1/writing/prompts/:id`                       | A single writing prompt by id                                                |
| GET    | `/v1/speaking/parts`                            | Speaking Part 1–3 guide                                                      |
| GET    | `/v1/speaking/cue-cards`                        | List cue cards (optional `category`, paging)                                 |
| GET    | `/v1/speaking/cue-cards/random?seed=1`          | One deterministic random cue card                                            |
| GET    | `/v1/speaking/cue-cards/:id`                    | A single cue card by id                                                      |
| GET    | `/v1/vocabulary/categories`                     | Vocabulary categories with word counts                                       |
| GET    | `/v1/vocabulary/words?category=environment`     | Words (optional `category`, paging)                                          |
| GET    | `/v1/reading/question-types`                    | Reading question-type reference                                              |
| GET    | `/v1/reading/question-types/:id`                | A single question type                                                       |

### Examples

```bash
# Overall band from query parameters
curl "http://localhost:3000/v1/bands/overall?listening=6.5&reading=7&writing=6.5&speaking=7"

# Overall band from a JSON body
curl -X POST http://localhost:3000/v1/bands/overall \
  -H "content-type: application/json" \
  -d '{"listening":8,"reading":8,"writing":7,"speaking":7.5}'

# Convert a raw mark to a band
curl "http://localhost:3000/v1/bands/reading?raw=30&module=academic"

# Reproducible practice prompts
curl "http://localhost:3000/v1/writing/prompts/generate?count=3&seed=day-1"
```

Pagination query parameters: `limit` (default `20`, max `100`) and `offset`
(default `0`).

## Scoring notes

The raw-to-band tables follow the widely published practice conversions; exact
thresholds can vary slightly between test sittings. Writing and Speaking are
assessed directly on the nine-band scale. The overall band is the mean of the
four components rounded to the nearest half band — see `/v1/exam/overview`
for the precise rule and examples.

## Project layout

```
src/
  config.ts            # Service metadata shared by the entrypoint and tests
  index.ts             # HTTP bootstrap (entrypoint, excluded from coverage)
  data/                # Original content banks (writing, speaking, vocab, ...)
  lib/
    api/routes.ts      # Endpoint definitions and request handling
    bands.ts           # Band-score domain logic
    essayGenerator.ts  # Deterministic essay-prompt generator
    errors.ts          # ApiError and helpers
    http.ts            # Node http adapter
    params.ts          # Query parsing/validation
    paginate.ts        # Pagination envelope helper
    random.ts          # Seeded PRNG helpers
    server/            # App container, Router, responses
test/                  # Unit + endpoint tests (100% coverage)
```

## Deployment

The server is plain Node with zero runtime dependencies, so it runs anywhere
Node runs. Set `PORT` (default `3000`) and `HOST` (default `0.0.0.0`). A
Dockerfile and hosting instructions for free tiers (e.g. Fly.io) can be added
in a later milestone.

## Roadmap

See [`docs/tasks.md`](docs/tasks.md) for the implemented milestone and the
planned direction of the project.

## Contributing

Contributions are welcome. Please keep changes to **original** content only,
maintain the **100% coverage** threshold, and ensure `npm run check` and the
super-linter workflow pass. See the issue tracker for open work.

## License

[MIT](LICENSE). IELTS is a registered trademark of the IELTS partners
(British Council, IDP: IELTS Australia and Cambridge Assessment English); this
project is an independent, unofficial resource and is not endorsed by or
affiliated with them.
