# IELTS-API

**A free, open, no-authentication IELTS study API, written in TypeScript.**

[![CI](https://github.com/johnlikescarrot/IELTS-API/actions/workflows/ci.yml/badge.svg)](https://github.com/johnlikescarrot/IELTS-API/actions/workflows/ci.yml)
[![Super-Linter](https://github.com/johnlikescarrot/IELTS-API/actions/workflows/linter.yml/badge.svg)](https://github.com/johnlikescarrot/IELTS-API/actions/workflows/linter.yml)
![Coverage](https://img.shields.io/badge/coverage-100%25%20%28lines%2C%20branches%2C%20functions%29-brightgreen)
![Node](https://img.shields.io/badge/node-%3E%3D22-green)
![License](https://img.shields.io/badge/license-MIT-blue)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](CONTRIBUTING.md)

IELTS-API serves everything a self-studying IELTS candidate or a researcher
needs, with **no API key, no account, no rate limiting, and no cost**: band-
scored academic vocabulary, original reading and listening practice tests
with worked explanations, writing tasks with model answers, a bank of common
writing mistakes, a speaking question bank, band-score conversion tools, and
per-skill exam tips. Everything is original content released under the MIT
license, and the implementation is verified by an enforced 100% coverage
suite (statements, branches, functions, and lines).

```bash
curl "http://localhost:3000/v1/words?band=8&topic=environment"
curl "http://localhost:3000/v1/practice/questions?type=true_false_not_given&limit=5"
curl -X POST "http://localhost:3000/v1/bands/overall" \
  -H 'content-type: application/json' \
  -d '{"listening":7.5,"reading":7,"writing":6,"speaking":6.5}'
```

## Why this API exists

Most IELTS material on the web is locked behind paywalls, PDFs, scraping
fragile pages, or "free" APIs that require keys and rate limits. IELTS-API
takes the opposite position: an open, versioned, machine-readable corpus of
IELTS study material that anyone — students, teachers, app builders,
researchers — can use without asking permission. See
[docs/ACADEMIC.md](docs/ACADEMIC.md) for the citation and scholarly-discovery
strategy behind the project.

## Features

- **Zero runtime dependencies.** The server is built on `node:http` with a
  small in-house router; `npm audit` has nothing to chew on.
- **No authentication, ever.** No keys, no tokens, no CORS restrictions.
- **Stable JSON envelopes.** Lists return `{ meta: { total, page, limit,
pages }, data: [...] }`; errors return `{ error: { code, message,
details? } }` with stable HTTP status codes (400/404/405/413/500).
- **Self-documenting.** `/docs` renders a human-friendly reference,
  `/openapi.json` serves an OpenAPI 3.1 document generated from the live
  route table, and `/` returns a complete machine-readable directory.
- **Evidence-based explanations.** Every practice question ships an
  explanation that points back to the passage or transcript.
- **Citation-first metadata.** `/v1/meta` and `/` expose APA and BibTeX
  citation strings, provenance, and dataset counts; `CITATION.cff` sits at
  the repository root for GitHub's "Cite this repository" dialog.
- **Quality gates that bite.** 100% coverage thresholds are enforced in CI;
  [super-linter](https://github.com/super-linter/super-linter) runs on every
  push and pull request; all changes arrive via pull request.

## Dataset

| Collection       | Contents                                                                    | Endpoint                 |
| ---------------- | --------------------------------------------------------------------------- | ------------------------ |
| Vocabulary       | 48 band-scored academic words, 8 topics, IPA + synonyms + collocations      | `/v1/words`              |
| Reading tests    | 2 academic tests, 3 sections each, 36 questions, 5 formats                  | `/v1/practice/tests`     |
| Listening tests  | 2 tests, 2 sections each, 20 questions, full transcripts                    | `/v1/practice/tests`     |
| Question bank    | All 56 questions flattened, filterable by skill/type/band                   | `/v1/practice/questions` |
| Writing tasks    | 4 Task 1 (reports + letter) and 4 Task 2 (essays) with band-8 model answers | `/v1/writing/tasks`      |
| Writing mistakes | 20 high-frequency learner errors with corrections and rules                 | `/v1/writing/mistakes`   |
| Speaking         | Part 1 topics, Part 2 cue cards with model responses, Part 3 sets           | `/v1/speaking`           |
| Band tools       | Indicative raw-to-band tables for 3 skills, calculators                     | `/v1/bands/*`            |
| Tips             | 24 study and exam tips across all four skills                               | `/v1/tips`               |

All texts were written originally for this project (MIT). The topical
coverage is inspired by the open study collection at
[zhengyishiming/IELTS](https://github.com/zhengyishiming/IELTS); no
third-party copyrighted material is redistributed. Details in
[docs/DATA_SOURCES.md](docs/DATA_SOURCES.md).

## Quick start

Requires Node 22+.

```bash
git clone https://github.com/johnlikescarrot/IELTS-API.git
cd IELTS-API
npm install
npm run build
npm start            # serves on http://localhost:3000 (PORT to override)
```

Open `http://localhost:3000/docs` for the interactive reference, or
`http://localhost:3000/openapi.json` for the OpenAPI 3.1 document.

### Use it from code

```js
const res = await fetch("http://localhost:3000/v1/words?topic=technology");
const { meta, data } = await res.json();
console.log(`${data.length} of ${meta.total} words (page ${meta.page})`);
```

Every list endpoint accepts `page`, `limit` (max 100), and `q` (free-text
search), plus resource-specific filters — see
[docs/API.md](docs/API.md) for the full reference.

## Endpoints

| Method | Path                        | Description                                                     |
| ------ | --------------------------- | --------------------------------------------------------------- |
| GET    | `/`                         | Service directory with citation and endpoint list               |
| GET    | `/health`                   | Liveness probe                                                  |
| GET    | `/v1`                       | Version directory                                               |
| GET    | `/v1/meta`                  | Dataset counts, citation strings, provenance                    |
| GET    | `/v1/words`                 | Vocabulary list (topic, pos, band, q, sort, order, page, limit) |
| GET    | `/v1/words/topics`          | Vocabulary topics                                               |
| GET    | `/v1/words/:id`             | Single word                                                     |
| GET    | `/v1/practice/tests`        | Practice tests (skill, module, q)                               |
| GET    | `/v1/practice/tests/:id`    | Full test with sections and questions                           |
| GET    | `/v1/practice/sections/:id` | One section (passage or transcript)                             |
| GET    | `/v1/practice/questions`    | Question bank (testId, sectionId, skill, type, band, q)         |
| GET    | `/v1/writing/tasks`         | Writing tasks (task, format, module, topic, q)                  |
| GET    | `/v1/writing/tasks/:id`     | Task with model answer                                          |
| GET    | `/v1/writing/topics`        | Writing topics                                                  |
| GET    | `/v1/writing/mistakes`      | Common mistakes (category, q)                                   |
| GET    | `/v1/writing/mistakes/:id`  | Single mistake                                                  |
| GET    | `/v1/speaking`              | Speaking bank (part, topic, q)                                  |
| GET    | `/v1/speaking/topics`       | Speaking topics                                                 |
| GET    | `/v1/speaking/:id`          | Single speaking item                                            |
| GET    | `/v1/tips`                  | Study tips (skill)                                              |
| GET    | `/v1/tips/:id`              | Single tip                                                      |
| GET    | `/v1/bands/tables`          | Raw-to-band conversion tables                                   |
| GET    | `/v1/bands/calculator`      | Raw to band (`skill`, `raw`)                                    |
| POST   | `/v1/bands/calculator`      | Raw to band (JSON body)                                         |
| POST   | `/v1/bands/overall`         | Average four component bands (`.25` rounds up)                  |
| GET    | `/docs`                     | HTML documentation                                              |
| GET    | `/openapi.json`             | OpenAPI 3.1 specification                                       |

## Quality gates

- **Tests & coverage** — `npm run test:coverage` runs 90+ tests against a
  real ephemeral server and enforces 100% line, branch, function, and
  statement coverage on `src/`.
- **Linting** — ESLint (strict TypeScript rules), Prettier, markdownlint,
  and yamllint locally; [super-linter](https://github.com/super-linter/super-linter)
  validates the whole codebase on every push and pull request.
- **Integration** — CI (Node 22) runs lint, build, and the coverage suite on
  every pull request; nothing merges with a red check.
- **Data integrity** — dedicated dataset tests assert unique ids, enum
  validity, answer/word-limit consistency, and that every raw score 0-40
  resolves through every band table.

## Citation

This project ships citation metadata so academic use is friction-free.

### APA

> johnlikescarrot. (2026). _IELTS-API: A free and open IELTS study API_
> (Version 1.0.0) [Computer software].
> <https://github.com/johnlikescarrot/IELTS-API>

### BibTeX

```bibtex
@software{ielts_api,
  author       = {johnlikescarrot},
  title        = {{IELTS-API}: A free and open IELTS study API},
  year         = {2026},
  month        = {09},
  version      = {1.0.0},
  url          = {https://github.com/johnlikescarrot/IELTS-API},
}
```

`CITATION.cff` at the repository root powers GitHub's "Cite this
repository" button, and both strings are served live at `/v1/meta`. For the
full scholarly-dissemination plan (archival DOI via Zenodo, paper venues,
Google Scholar visibility), see [docs/ACADEMIC.md](docs/ACADEMIC.md).

## Contributing

All changes arrive via pull request and pass the quality gates above. See
[CONTRIBUTING.md](CONTRIBUTING.md).

## License

Code and datasets are released under the [MIT License](LICENSE).

## Disclaimer

IELTS-API is an independent study resource. It is not affiliated with,
endorsed by, or connected to IELTS, the British Council, IDP: IELTS
Australia, or Cambridge Assessment English. "IELTS" is a trademark of its
respective owners. Raw-score conversion tables are indicative, commonly
published values and vary slightly between test versions.
