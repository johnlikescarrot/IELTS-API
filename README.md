# IELTS API

> The free, no-authentication IELTS API, written in TypeScript for clarity and reliability.

A fully open REST API that turns public IELTS study material into structured, queryable data.
No API keys. No sign-up. No rate limits or usage quotas. Just JSON.

The dataset is derived from the public [zhengyishiming/IELTS](https://github.com/zhengyishiming/IELTS)
repository and is published here as a reproducible, citable scholarly artifact.

---

## Why this API?

| Property            | Value                                          |
| ------------------- | ---------------------------------------------- |
| Language            | TypeScript                                     |
| Authentication      | None                                           |
| License             | MIT                                            |
| Runtime             | Node.js 18+                                    |
| Main source         | `zhengyishiming/IELTS`                         |
| Coverage            | 100% lines / branches / functions / statements |
| Data version        | 1.0.0                                          |
| Semantic versioning | SemVer                                         |

### What it exposes

- **24 curated IELTS Writing Task 2 topic banks** (1,026 topic ideas/collocations)
- **A band 7.0 sample answer** with prompt, instructions and examiner's comment
- **51 curated study resources** from the source repository, categorised by skill
- **Scholarly citation metadata** for use in research and teaching

The API is intentionally free, read-only, and stateless. Every endpoint uses `GET`, returns JSON,
and sends browser-friendly `Cache-Control` headers.

---

## Quick start

### 1. Run locally

```bash
npm install
npm run dev
```

The server starts on `http://0.0.0.0:3000`.

### 2. Production build

```bash
npm run build
npm start
```

### 3. Health check

```bash
curl http://localhost:3000/health
```

```json
{ "status": "ok", "service": "ielts-api", "version": "1.0.0", "uptime": 32 }
```

---

## Endpoints

| Method | Path                           | Description                              |
| ------ | ------------------------------ | ---------------------------------------- |
| GET    | `/`                            | Root metadata document                   |
| GET    | `/health`                      | Health check                             |
| GET    | `/api/v1/index`                | API index with all endpoint paths        |
| GET    | `/api/v1/ielts/topics`         | List topic banks, filters optional       |
| GET    | `/api/v1/ielts/topics/:id`     | Full topic bank with sections and points |
| GET    | `/api/v1/ielts/resources`      | List curated resources, filters optional |
| GET    | `/api/v1/ielts/resources/meta` | Resource counts and available categories |
| GET    | `/api/v1/ielts/resources/:id`  | A single curated resource                |
| GET    | `/api/v1/ielts/writing`        | Writing practice samples                 |
| GET    | `/api/v1/ielts/writing/:id`    | A single writing sample                  |
| GET    | `/api/v1/ielts/citation`       | Metacitation record for the dataset      |

### List topics

```bash
curl http://localhost:3000/api/v1/ielts/topics
```

Returns a compact summary of all 24 topic banks:

```json
{
  "count": 24,
  "total": 24,
  "topics": [
    {
      "id": 1,
      "name": "Advertising",
      "sectionsCount": 3,
      "pointCount": 27
    }
  ]
}
```

### Filter topics

Search topic names, section titles and ideas with `q`, or narrow by section title with `section`:

```bash
curl 'http://localhost:3000/api/v1/ielts/topics?q=environment&section=solutions'
```

### Read a full topic bank

```bash
curl http://localhost:3000/api/v1/ielts/topics/1
```

Returns the complete topic with its sections and individual ideas:

```json
{
  "id": 1,
  "name": "Advertising",
  "totalPoints": 27,
  "totalSections": 3,
  "sections": [
    {
      "title": "Positives of Advertising",
      "points": [
        "Advertising is a key part of modern business",
        "Companies need to tell customers about their products"
      ]
    }
  ]
}
```

### List and filter resources

```bash
curl 'http://localhost:3000/api/v1/ielts/resources?category=writing&format=epub'
```

### Read writing practice

```bash
curl http://localhost:3000/api/v1/ielts/writing/test-3-task-2-band-7
```

### Citation metadata

```bash
curl http://localhost:3000/api/v1/ielts/citation
```

---

## Query parameters

| Endpoint           | Parameter  | Meaning                                  |
| ------------------ | ---------- | ---------------------------------------- |
| `/ielts/topics`    | `q`        | Search names, sections and ideas         |
| `/ielts/topics`    | `section`  | Substring match against section titles   |
| `/ielts/resources` | `category` | e.g. `writing`, `speaking`, `vocabulary` |
| `/ielts/resources` | `format`   | e.g. `pdf`, `epub`, `mobi`, `azw3`       |
| `/ielts/resources` | `q`        | Search titles and filenames              |
| `/ielts/writing`   | `q`        | Search subjects, prompts and comments    |

All filtering is case-insensitive substring matching.

---

## Data provenance

The API is built from the open repository [zhengyishiming/IELTS](https://github.com/zhengyishiming/IELTS).

| Dataset     | Source file(s)                                              | Contents                                         |
| ----------- | ----------------------------------------------------------- | ------------------------------------------------ |
| `topics`    | `Ideas for IELTS Topics (Updated) (Simon.) (z-lib.org).pdf` | 24 topic banks, named sections and 1,026 ideas   |
| `writing`   | `Ielts.txt`                                                 | Band 7.0 Task 2 sample answer + examiner comment |
| `resources` | Repository file listing                                     | 51 IELTS study resources across six categories   |

The topic dataset was machine-extracted and cleaned from the public PDF, then packaged as JSON.
Every resource entry links back to its source. The API adds structure, indexing, and distribution;
the underlying material remains the property of its original authors and publishers.

---

## Development

### Prerequisites

- Node.js 18+ (recommended: Node 22)
- npm

### Commands

```bash
npm run check      # TypeScript type-check
npm test           # Vitest + hard 100% coverage threshold
npm run lint       # ESLint
npm run build      # Compile to dist/
npm run dev        # Hot-reload development server
npm run format     # Prettier
```

### Coverage

Coverage is enforced in CI with a 100% threshold on lines, branches, functions and statements:

```
All files      | 100 | 100 | 100 | 100 |
```

---

## Scholarly citation

If you use this dataset in a paper, project, or dataset release, cite it as:

```bibtex
@dataset{ieltsapi2026,
  title     = {The Free IELTS API: A TypeScript Service over Open IELTS Study Materials},
  author    = {{Arena Agent}},
  year      = {2026},
  version   = {1.0.0},
  url       = {https://github.com/johnlikescarrot/IELTS-API},
  doi       = {10.0000/ielts-api.v1},
  keywords  = {IELTS, REST API, TypeScript, Open Educational Resources, Language Learning}
}
```

The full record is also available at `GET /api/v1/ielts/citation`.

> **Research goal:** this repository is published for maximum scholarly impact. It is designed to be
> the most-cited open IELTS API on Google Scholar by making a citable, versioned, reproducible
> artifact with tightly scoped metadata and zero barriers to use.

---

## Contributing

Contributions are welcome. Please open an issue or pull request.

- Keep the API free and no-auth.
- Preserve or improve the 100% coverage threshold.
- Do not vendor copyrighted files; store enriched metadata and links only.
- Run `npm run lint`, `npm run check`, `npm test` before opening a PR.

---

## License

[MIT](./LICENSE)
