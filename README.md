# IELTS-API 🎓

**The free, no-auth, open IELTS practice API — in TypeScript.**

[![CI](https://github.com/johnlikescarrot/IELTS-API/actions/workflows/ci.yml/badge.svg)](https://github.com/johnlikescarrot/IELTS-API/actions/workflows/ci.yml)
[![Super-Linter](https://github.com/johnlikescarrot/IELTS-API/actions/workflows/linter.yml/badge.svg)](https://github.com/johnlikescarrot/IELTS-API/actions/workflows/linter.yml)
[![Coverage 100%](https://img.shields.io/badge/coverage-100%25-brightgreen)](./vitest.config.ts)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![No auth](https://img.shields.io/badge/auth-none-required-orange)](#quickstart)

No API key. No account. No paywall. Query CEFR-graded **vocabulary**, **Writing**
Task 1/2 prompts with band-scored samples, **Speaking** Parts 1–3 topics,
**Reading/Listening** question taxonomies and practice sets, **grammar**,
**collocations**, **idioms**, **phrasal verbs**, **study plans**, and
deterministic **band-score calculators** — all as clean JSON.

> Thematic inspiration: the community study collection
> [`zhengyishiming/IELTS`](https://github.com/zhengyishiming/IELTS) (a static
> file dump of textbooks). IELTS-API turns that _idea_ — free IELTS material
> for everyone — into a real queryable API. **All content here is original and
> MIT-licensed; nothing is copied from that repo or any textbook.**

## Quickstart

```bash
npm ci
npm run dev        # http://localhost:3000 (PORT env supported)
```

```bash
curl http://localhost:3000/health
# {"status":"ok","version":"1.0.0","uptimeSeconds":12}

curl "http://localhost:3000/api/v1/vocabulary?level=C1&limit=3"
curl "http://localhost:3000/api/v1/vocabulary/random?count=3"
curl "http://localhost:3000/api/v1/calculators/overall?listening=7&reading=7.5&writing=6.5&speaking=7"
# {"listening":7,"reading":7.5,"writing":6.5,"speaking":7,"mean":7,"overall":7}
```

Docker:

```bash
docker build -t ielts-api .
docker run -p 3000:3000 ielts-api
```

Full endpoint table, parameters and examples: [`docs/API.md`](./docs/API.md).
Machine-readable contract: `GET /openapi.json`.

## Why this API?

| Goal                      | How                                                                            |
| ------------------------- | ------------------------------------------------------------------------------ |
| Free & frictionless       | No auth, open CORS, MIT-licensed data + code                                   |
| Citable research artifact | `CITATION.cff`, JOSS-style [`docs/paper.md`](./docs/paper.md), stable item ids |
| Correct scoring           | Auditable band tables + official overall rounding, boundary-tested             |
| Production quality        | Strict TS, 100% coverage gate, CI on Node 20/22, Super-Linter on every push/PR |

## Development

```bash
npm run dev             # watch-mode server (tsx)
npm run test:coverage   # Vitest + 100% gate (lines/branches/functions/statements)
npm run typecheck       # tsc --noEmit
npm run lint            # eslint
npm run format:check    # prettier
npm run build && npm start
```

## Cite this work

Using IELTS-API in research, teaching or an app? Please cite it — citations keep
open infrastructure alive. GitHub's **“Cite this repository”** button (driven by
[`CITATION.cff`](./CITATION.cff)) exports APA/BibTeX automatically.

```bibtex
@software{ielts-api2026,
  title  = {IELTS-API: A Free, No-Auth, Open IELTS Practice API in TypeScript},
  author = {{IELTS-API contributors}},
  year   = {2026},
  url    = {https://github.com/johnlikescarrot/IELTS-API},
  license = {MIT},
  version = {1.0.0}
}
```

APA: _IELTS-API contributors. (2026). IELTS-API: A free, no-auth, open IELTS
practice API in TypeScript (Version 1.0.0) [Computer software].
https://github.com/johnlikescarrot/IELTS-API_

## License

[MIT](./LICENSE). Band conversions are approximate public tables; official
boundaries vary slightly per test form.
