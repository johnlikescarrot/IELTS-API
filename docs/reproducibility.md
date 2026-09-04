# Reproducibility

This project treats reproducibility as a functional requirement, not a
documentation exercise. This note states exactly what is guaranteed, how it is
enforced, and how to verify it yourself.

## The guarantee

For a fixed released version, a given request produces a **byte-identical**
response body on every machine, in every process, at every point in time.

## How the guarantee is achieved

1. **The request path is pure.** `createApp().handle(request)` reads no clock, no
   environment variable, no filesystem and no network. It performs no I/O at all.
   Node's `http` module appears in exactly one file, `src/http/server.ts`, which
   is an adapter around the pure function.
2. **No unseeded randomness.** Endpoints that sample (`/v1/vocabulary/random`,
   `/v1/writing/tasks/random`, `/v1/speaking/mock-test`) use the mulberry32
   generator in `src/core/random.ts` with an explicit integer seed. The seed
   defaults to `0` and is always echoed back in `meta.seed`, so any published
   example can be regenerated exactly.
3. **No timestamps in payloads.** Even `/health` omits a timestamp, precisely so
   that its response is stable.
4. **Stable ordering.** Every collection has a defined order: datasets are served
   in their declared order, detected issues are ordered by character offset,
   cohesive devices by descending count then alphabetically, and sublist
   breakdowns by ascending sublist number. No result depends on object key
   iteration order or on `Array.prototype.sort` stability assumptions beyond the
   guarantees of the ECMAScript specification.
5. **No runtime dependencies.** `dependencies` is empty, so no transitive upgrade
   can change behaviour between installs of the same version.

## How the guarantee is enforced

- `scripts/check-determinism.mjs` dispatches a representative set of requests
  against two independently constructed applications and fails if any pair of
  bodies differs. It runs in the `Verify` workflow on every push and pull request.
- `openapi.json` is committed and regenerated in CI; the workflow fails if the
  committed document differs from the generated one, so the specification cannot
  drift from the implementation.
- The unit tests assert determinism directly for the analysis path
  (`analyseWriting` on the same input must deep-equal itself) and for the seeded
  sampling endpoints.

## Verifying it yourself

```bash
npm ci
npm run build
npm run determinism

# Compare two independent runs of the same request byte for byte.
node -e '
import("./dist/index.js").then(({ createApp }) => {
  const call = (app) => app.handle({
    method: "GET",
    path: "/v1/vocabulary/random",
    query: new URLSearchParams("seed=7&count=25"),
    headers: {},
    body: null,
  }).body;
  console.log(call(createApp()) === call(createApp()));
});'
```

## Exhaustive verification, not sampled verification

Two properties are checked over their entire input space rather than at sampled
points, because both are small enough to enumerate and both are historically
error-prone:

| Property                    | Input space                                | Size    |
| --------------------------- | ------------------------------------------ | ------- |
| Overall Band Score rounding | every combination of four reportable bands | 130 321 |
| Raw-score conversion        | every raw score, every paper               | 123     |

The conversion tables are additionally checked to be total (every raw score in
`[0, 40]` maps to exactly one row), non-overlapping, and monotonically
non-decreasing in the raw score.

## Coverage

Coverage thresholds are 100% for lines, branches, functions and statements, and
CI fails below them. One file is excluded from the report,
`src/http/route.ts`, which declares types only and contains no executable
statements. Two short blocks carry `c8 ignore` annotations with an inline
justification: a defensive guard against zero-width regular expressions, and the
non-`AddressInfo` branch of `Server.address()` which is unreachable for a
listening TCP server.

## Versioning

The package follows semantic versioning. Any change that could alter a response
body for an unchanged request — including a change to a dataset, a threshold or
a descriptor — is a breaking change and requires a major version bump. This is
what makes "cite the version you used" a meaningful instruction.
