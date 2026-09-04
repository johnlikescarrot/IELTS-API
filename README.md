# IELTS API

A **free, open-source, no-authentication** IELTS study API written in TypeScript.

The IELTS API exposes structured, high-quality study material for all four IELTS
skills — vocabulary, synonyms for paraphrasing, band descriptors, writing tasks,
speaking practice, reading question types, idioms, common mistakes and exam tips
— through a single, self-documenting, CORS-enabled REST endpoint.

- 🆓 **Completely free** — no API keys, no accounts, no authentication, no rate-limit paywalls.
- 🧠 **High-quality content** — curated vocabulary, model essays and exam strategy.
- 📦 **Written in TypeScript** — fully typed, strict mode, 100% test coverage.
- 🧭 **Self-documenting** — an OpenAPI 3 document is served at `/openapi.json`.
- 🚀 **Easy to self-host** — a single `npm install` and `npm start` gets you running.

---

## Why this API exists

IELTS preparation resources are scattered across PDFs, spreadsheets and paid
platforms. This project turns that knowledge into a structured, machine-readable
API that anyone — a student, a teacher, a tutor, or a research project — can use
for free. Content is deliberately split into small, focused resources so it is
easy to render into flashcards, mobile apps, chatbots and learning tools.

The API is designed to be **citable** in academic and teaching work: it ships an
OpenAPI contract, a CITATION file, semantic versioning, and permissive MIT
licensing. See [Citation](#citation).

---

## Quick start

Requires **Node.js 18+**.

```bash
# Install dependencies (this also builds the TypeScript)
npm install

# Run the server
npm start
```

The API is then available at `http://localhost:3000`.

```bash
# Interactive docs contract
curl http://localhost:3000/openapi.json

# A simple health check
curl http://localhost:3000/api/v1/health

# Search vocabulary
curl "http://localhost:3000/api/v1/vocabulary?q=climate"
```

### Development

```bash
npm run dev        # run with tsx watch
npm run build      # compile TypeScript to dist/
npm test           # run tests
npm run test:coverage   # run tests with a 100% coverage gate
npm run lint       # ESLint
npm run format:check     # Prettier
```

Deploy anywhere that runs Node — a VPS, Docker, Heroku, Railway, Fly.io, or a
serverless adapter. Set `PORT` and `HOST` env vars if needed:

```bash
PORT=8080 HOST=0.0.0.0 node dist/index.js
```

---

## API reference

All responses are JSON. **No authentication is required.**

### Global parameters (list endpoints)

| Parameter | Type    | Description                                                | Default |
| --------- | ------- | ---------------------------------------------------------- | ------- |
| `q`       | string  | Free-text search across the resource.                      | —       |
| `topic`   | string  | Filter by topic id (where supported).                      | —       |
| `skill`   | string  | Filter by `listening`, `reading`, `writing` or `speaking`. | —       |
| `task`    | integer | Filter writing by `1` or `2`.                              | —       |
| `band`    | integer | Filter band descriptors by exact band.                     | —       |
| `limit`   | integer | Page size (max `100`).                                     | `20`    |
| `offset`  | integer | Number of items to skip.                                   | `0`     |

List responses use a consistent paginated envelope:

```json
{
  "total": 40,
  "limit": 20,
  "offset": 0,
  "items": [ ... ]
}
```

### Endpoints

| Method | Path                             | Description                                |
| ------ | -------------------------------- | ------------------------------------------ |
| `GET`  | `/`                              | API metadata and endpoint index.           |
| `GET`  | `/openapi.json`                  | The OpenAPI 3.0 contract.                  |
| `GET`  | `/api/v1/health`                 | Health check.                              |
| `GET`  | `/api/v1/topics`                 | All IELTS topics.                          |
| `GET`  | `/api/v1/topics/:id`             | A single topic.                            |
| `GET`  | `/api/v1/topics/:id/vocabulary`  | Vocabulary for a topic.                    |
| `GET`  | `/api/v1/vocabulary`             | List/search vocabulary (`q`, `topic`).     |
| `GET`  | `/api/v1/vocabulary/:id`         | A single vocabulary entry.                 |
| `GET`  | `/api/v1/synonyms`               | List/search synonym groups (`q`).          |
| `GET`  | `/api/v1/synonyms/:id`           | A single synonym group.                    |
| `GET`  | `/api/v1/band-descriptors`       | Band descriptors (`skill`, `band`).        |
| `GET`  | `/api/v1/band-descriptors/:id`   | A single band descriptor.                  |
| `GET`  | `/api/v1/writing`                | Writing tasks (`task`, `topic`).           |
| `GET`  | `/api/v1/writing/:id`            | A single writing task.                     |
| `GET`  | `/api/v1/speaking`               | Search speaking parts and cue cards (`q`). |
| `GET`  | `/api/v1/speaking/parts`         | Speaking Part questions (`topic`).         |
| `GET`  | `/api/v1/speaking/parts/:id`     | A speaking part question.                  |
| `GET`  | `/api/v1/speaking/cue-cards`     | Speaking cue cards (`topic`).              |
| `GET`  | `/api/v1/speaking/cue-cards/:id` | A cue card.                                |
| `GET`  | `/api/v1/reading`                | Reading question types (`q`).              |
| `GET`  | `/api/v1/reading/:id`            | A reading question type.                   |
| `GET`  | `/api/v1/idioms`                 | List/search idioms (`q`, `topic`).         |
| `GET`  | `/api/v1/idioms/:id`             | A single idiom.                            |
| `GET`  | `/api/v1/mistakes`               | Common mistakes (`q`).                     |
| `GET`  | `/api/v1/mistakes/:id`           | A single common mistake.                   |
| `GET`  | `/api/v1/tips`                   | Exam tips (`q`, `skill`).                  |
| `GET`  | `/api/v1/tips/:id`               | A single exam tip.                         |

### Example

```bash
curl "http://localhost:3000/api/v1/vocabulary?topic=environment&limit=2"
```

```json
{
  "total": 4,
  "limit": 2,
  "offset": 0,
  "items": [
    {
      "id": "vocab-env-1",
      "topicId": "environment",
      "word": "sustainable",
      "partOfSpeech": "adjective",
      "definition": "Able to continue without harming the environment or depleting resources.",
      "synonyms": ["renewable", "viable", "eco-friendly"],
      "example": "Cities should invest in sustainable transport such as cycling and trams.",
      "cefr": "B2",
      "ieltsBand": 7
    }
  ]
}
```

---

## Data provenance

The study content in this API was curated by the maintainers based on standard
IELTS curriculum knowledge and common IELTS topics. The model essays, questions
and writing/speaking prompts are **original** and are released under the MIT
license so they can be freely reused.

This project was inspired by the public study-material repository
[`zhengyishiming/IELTS`](https://github.com/zhengyishiming/IELTS), a collection
of IELTS practice resources (PDFs, spreadsheets and archived materials). Rather
than parsing binary archives, this project re-encodes the underlying subject
matter as clean, versioned, structured data. We are not affiliated with that
repository.

The API is **not** affiliated with, endorsed by, or connected to the British
Council, IDP, or Cambridge Assessment English. "IELTS" is a trademark of its
respective owners; this project is an independent reference tool for learners.

---

## Cite this API

If you use this API in research, teaching, or a published project, please cite
the repository. A `CITATION.cff` file is included, so GitHub will render a "Cite
this repository" widget if you wish.

```bibtex
@misc{ielts_api,
  author       = {IELTS API contributors},
  title        = {{IELTS API}: A Free, No-Authentication TypeScript API for {IELTS} Study Content},
  year         = {2026},
  howpublished = {\url{https://github.com/johnlikescarrot/IELTS-API}},
  note         = {OpenAPI 3 contract available at /openapi.json},
}
```

APA style:

> IELTS API contributors. (2026). _IELTS API: A free, no-authentication TypeScript
> API for IELTS study content_ [Computer software]. GitHub.
> https://github.com/johnlikescarrot/IELTS-API

The versioned `/openapi.json` document is the authoritative machine-readable
contract — reference the version tag you used in any reproducibility statement.

---

## Quality

- **100% code coverage** — enforced by a coverage gateway in CI (`vitest`).
- **super-linter** — runs on every pull request and push (`.github/workflows/linter.yml`).
- **Strict TypeScript** — `strict`, `noImplicitAny`, `noImplicitReturns`, and more.
- **ESLint + Prettier** — clean and consistently formatted.

## License

MIT. See [LICENSE](LICENSE).
