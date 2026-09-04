# IELTS API

A free, no-authentication REST API for IELTS (International English Language
Testing System) data, written in optimized TypeScript.

The API exposes band-score descriptors, raw-score to band conversions for the
objectively marked sections, the assessment criteria used by examiners for
Writing and Speaking, curated vocabulary, common writing mistakes, and a
catalogue of free study resources.

## Features

- **Free & unauthenticated** — no keys, no sign-up, no rate limits.
- **100% code coverage** — the full surface is unit and integration tested.
- **Optimized TypeScript** — strict typing, ESM output, tree-shaken build.
- **Self-contained** — no database; all data ships with the server.
- **Typed & documented** — TypeScript declarations and OpenAPI-ready route
  descriptions are included.

## Quick Start

Requirements: Node.js 18+.

```bash
npm install        # install dependencies
npm run dev        # start the dev server on http://localhost:3000
```

For production:

```bash
npm run build      # emit ./dist
npm start          # run the built server
```

Environment variables (optional):

| Variable | Default   | Description                                   |
| -------- | --------- | --------------------------------------------- |
| `PORT`   | `3000`    | Port the HTTP server listens on.              |
| `HOST`   | `0.0.0.0` | Interface to bind (use `0.0.0.0` for Docker). |

## Endpoints

| Method | Path                         | Description                                     |
| ------ | ---------------------------- | ----------------------------------------------- |
| GET    | `/`                          | API index and endpoint listing.                 |
| GET    | `/health`                    | Health check with version and uptime.           |
| GET    | `/api/band-scores`           | All overall band descriptors (0–9).             |
| GET    | `/api/band-scores/:band`     | One overall band descriptor.                    |
| GET    | `/api/score/listening`       | Convert a raw Listening score (0–40).           |
| GET    | `/api/score/reading`         | Convert a raw Reading score (0–40).             |
| GET    | `/api/score/overall`         | Compute an overall band from four components.   |
| POST   | `/api/score/overall`         | Compute an overall band (JSON body).            |
| GET    | `/api/writing/criteria`      | Writing criteria and descriptors.               |
| GET    | `/api/writing/criteria/:id`  | One writing criterion.                          |
| GET    | `/api/speaking/criteria`     | Speaking criteria and descriptors.              |
| GET    | `/api/speaking/criteria/:id` | One speaking criterion.                         |
| GET    | `/api/vocabulary`            | Vocabulary list, searchable with `?q=`.         |
| GET    | `/api/vocabulary/:id`        | One vocabulary entry.                           |
| GET    | `/api/mistakes`              | Common writing mistakes, searchable with `?q=`. |
| GET    | `/api/resources`             | Free study resources, filterable by `skill`.    |

## Examples

Listening conversion:

```bash
curl "http://localhost:3000/api/score/listening?correct=32"
```

```json
{ "section": "listening", "correct": 32, "total": 40, "band": 7.5, "nextBand": 8 }
```

Overall band from component scores:

```bash
curl -X POST "http://localhost:3000/api/score/overall" \
  -H "content-type: application/json" \
  -d '{"listening":7.5,"reading":6.5,"writing":6.5,"speaking":7}'
```

```json
{
  "overall": 7,
  "average": 6.875,
  "components": { "listening": 7.5, "reading": 6.5, "writing": 6.5, "speaking": 7 },
  "assessment": "Good user: suitable for most academic and visa purposes."
}
```

Search resources by a skill and a term:

```bash
curl "http://localhost:3000/api/resources?skill=writing&q=grammar"
```

## Development

```bash
npm run lint            # eslint
npm run format          # prettier
npm run typecheck       # strict TypeScript check
npm run test            # run the test suite
npm run test:coverage   # run tests and enforce 100% coverage
npm run build           # bundle to ./dist
```

The test suite uses Vitest and enforces a 100% coverage threshold on
statements, branches, functions, and lines. Every change must keep coverage at
100% and pass the linters.

## Data and Disclaimer

The conversion tables and band descriptors are based on commonly published IELTS
material. They are provided as a free learning aid and are not an official
IELTS product. Candidates should always confirm scores and interpretations
against official IELTS practice materials and the British Council, IDP, or
Cambridge examiner guidance.

## Contributing

Contributions are welcome. Ensure `npm run lint`, `npm run format:check`,
`npm run typecheck`, and `npm run test:coverage` all pass before submitting a
pull request. Every pull request is validated by continuous integration,
including [Super-Linter](https://github.com/super-linter/super-linter).

## License

[MIT](./LICENSE)
