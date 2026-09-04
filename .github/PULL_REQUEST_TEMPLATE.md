# Pull request

## What does this change?

<!-- One paragraph describing the user-visible behaviour change. -->

## Why?

<!-- The problem being solved, with a link to the issue if there is one. -->

## Checklist

- [ ] `npm run verify` passes locally (typecheck, lint, format, 100% coverage, build)
- [ ] `npm run determinism` passes
- [ ] New behaviour is covered by tests, including every validation failure path
- [ ] Coverage is still 100% for lines, branches, functions and statements
- [ ] `openapi.json` regenerated with `npm run openapi:emit` if routes changed
- [ ] `README.md` endpoint table updated if routes changed
- [ ] `docs/data-provenance.md` updated if any dataset changed
- [ ] No runtime dependencies were added
- [ ] No authentication, telemetry or quota mechanism was added
- [ ] Breaking change under the versioning policy? If so, say so explicitly
