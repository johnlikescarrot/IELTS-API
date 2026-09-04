# Contributing

Thank you for considering a contribution. This project optimises for one thing
above all: **a reader in five years must be able to reproduce exactly what this
code does today.** Every rule below follows from that.

## Ground rules

1. **No runtime dependencies.** `dependencies` in `package.json` stays empty. If
   a task genuinely needs a third-party library at runtime, open an issue first
   and make the case.
2. **No authentication.** This API is free and unauthenticated. Pull requests
   adding API keys, tokens, accounts, quotas or telemetry will be declined.
3. **Determinism.** No request path may read the clock, the filesystem, the
   network, the environment or unseeded randomness. New sampling endpoints must
   take a `seed` parameter and echo it in `meta.seed`.
4. **Coverage stays at 100%.** Lines, branches, functions and statements. If a
   branch cannot be reached, either remove it or annotate it with `c8 ignore` and
   an inline justification.
5. **Provenance for data.** Any new datum arrives with an entry in
   `docs/data-provenance.md` giving its origin, licence status and any
   transformation applied.
6. **Super-linter must pass.** It runs over the whole code base on every push.

## Getting set up

```bash
npm ci
npm run verify     # typecheck, lint, format check, tests with coverage, build
```

Useful individual commands:

| Command                 | What it does                             |
| ----------------------- | ---------------------------------------- |
| `npm run dev`           | Runs the server from TypeScript sources  |
| `npm run test:watch`    | Vitest in watch mode                     |
| `npm run test:coverage` | Tests with the 100% thresholds enforced  |
| `npm run lint:fix`      | Applies ESLint fixes                     |
| `npm run format`        | Applies Prettier                         |
| `npm run openapi:emit`  | Regenerates the committed `openapi.json` |
| `npm run determinism`   | Asserts byte-identical responses         |

## Adding an endpoint

Endpoints are declared as `RouteDefinition` records, which carry both the handler
and its documentation. Because the OpenAPI document is generated from the same
records, documenting an endpoint is not a separate step.

1. Add the record to the appropriate module under `src/http/routes/`.
2. Order matters: register literal paths such as `/v1/vocabulary/random` before
   parameterised ones such as `/v1/vocabulary/:word`.
3. Add tests covering the success path and **every** validation failure.
4. Run `npm run openapi:emit` and commit the regenerated `openapi.json`.
5. Add the endpoint to the table in `README.md`.

## Adding a detection rule

Rules live in `src/data/mistakes.ts` and are pure data. Each rule needs an `id`,
a `category`, a `severity`, a `pattern`, a `message`, a `suggestion` and an
`example` that the pattern matches — the test suite asserts that every rule
matches its own example. Patterns must not be able to backtrack catastrophically.

## Commit and pull request conventions

- Write commit subjects in the imperative mood, under 72 characters.
- One logical change per pull request.
- Describe user-visible behaviour changes and note whether the change is
  breaking under the versioning policy in `docs/reproducibility.md`.
- CI must be green: `Verify` and `Super-Linter`.

## Code of conduct

Participation is governed by [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).
