# Contributing

Thanks for helping. The project is small on purpose: **zero runtime dependencies, 100% coverage,
everything through a pull request**.

## Ground rules

1. **Never push to `main`.** All work lands through a pull request, including work by maintainers.
2. **Coverage stays at 100%.** Statements, branches, functions and lines, per file. The test command
   fails below the threshold; if you add a branch, add the test that exercises it.
3. **No runtime dependencies.** Dev dependencies are fine. A `dependencies` entry requires a very
   good argument in the pull request.
4. **super-linter must stay green.** It runs on every push, every pull request and weekly.
5. **Never ask the user for a decision that a test, a linter or a type can make.**

## Setup

```bash
npm ci
npm run validate   # typecheck + lint + format check + tests with coverage
npm run dev        # hot-reloading server on http://localhost:3000
```

Useful commands:

| Command             | What it does                       |
| ------------------- | ---------------------------------- |
| `npm run typecheck` | `tsc --noEmit` under `strict`      |
| `npm run lint`      | ESLint, zero warnings allowed      |
| `npm run format`    | Prettier write                     |
| `npm test`          | Vitest with the 100% coverage gate |
| `npm run build`     | Compile to `dist/`                 |

## Adding an endpoint

1. Write the handler in `src/routes/<area>.ts` and register it in `src/routes/index.ts`. **Literal
   paths must be registered before parameterised ones** (`/v1/vocabulary/stats` before
   `/v1/vocabulary/:word`) — the router returns the first match.
2. Add query parameters to `PARAMETERS` in `src/lib/openapi.ts` so the OpenAPI document stays
   complete; it is generated from the live route table, so the route appears automatically but its
   parameters do not. Declare a complete success schema and content type via `route.response`
   for new endpoints. Path templates become OpenAPI brace parameters automatically. Add a live
   response/schema test; raw exports must not be documented as JSON envelopes.
3. Add tests: the happy path, every filter, every default, and every error branch.
4. Update `README.md` (endpoint table, dataset table if the data changed), run
   `npm run docs:update`, and verify the generated artifacts are included in the pull request.

## Adding data

Datasets live in `data/` as JSON. Legacy datasets use the standard-library Python utilities in
`scripts/`; the practice inventory uses the tested TypeScript compiler `src/lib/practice-index.ts`. If you change a dataset:

- regenerate it with the script, never by hand;
- keep the pipeline deterministic — no timestamps, no hash-order dependence, sorted output;
- update the numbers in `README.md`, `RESEARCH.md` and, if the dataset changed shape,
  `paper/paper.md`;
- CI re-derives `data/vocabulary.json` from the upstream workbook, so the committed file must match
  the pipeline output exactly.

## Data ethics

The upstream corpus is third-party material. Publish **metadata only**; never commit an upstream
binary, an excerpt of a copyrighted book, or a link that exists only to circumvent a paywall. Band
descriptor text must remain an original paraphrase, never the official wording.

## Style

- Prettier and ESLint decide formatting; do not argue with them.
- Every exported symbol carries a TSDoc comment.
- Comments and documentation are English; the code base has no other language convention.

## Pull request checklist

- [ ] Branch off `main`, one logical change per pull request.
- [ ] `npm run validate` passes locally.
- [ ] Coverage is still 100%, per file.
- [ ] `README.md` updated if behaviour or data changed.
- [ ] No new runtime dependency.

## Practice metadata and scholarly integrity

- Read [the upstream review](docs/UPSTREAM-REVIEW.md) before changing selection rules. Never infer
  question types, individual CEFR levels or content validity from filenames. Do not import
  exercises, media, credentials, student data or upstream application code without appropriate rights.
- Regenerate practice metadata from its pinned, complete Git tree with `npm run data:practice`.
  Update golden fixtures and provenance deliberately; CI compares the result byte-for-byte.
- `npm run docs:check` verifies OpenAPI, BibTeX and the generated report. Edit the report source in
  `src/lib/research.ts`, not `paper/practice-metadata.md`.
- Citation identity must remain consistent across CFF, CodeMeta and BibTeX. CFF schema validation
  runs in CI. Never add a placeholder DOI, imaginary affiliation, journal claim or citation count.
- Super-Linter uses the same ESLint configuration as local checks, including real JSON validation.
  Markdown indentation follows Prettier/markdownlint; other EditorConfig checks remain enabled.
  `.checkov.yaml` exempts only authentication-required OpenAPI policies that contradict the
  intentionally public API. Do not weaken coverage or disable security checks to obtain a green run.
