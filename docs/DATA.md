# Dataset reference

This directory holds the archived artefacts of the API contract.

| File           | What it is                                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `openapi.json` | The OpenAPI 3.1 document, regenerated on every release from the live route table. Always current at `/openapi.json` on a running instance. |

The datasets themselves live in [`data/`](../data) and are documented in
[RESEARCH.md](../RESEARCH.md), which records the extraction methodology and the threats to validity
that apply to each of them. The datasets that are small enough to be type-checked are embedded in the
source tree instead (`src/data/`): the band scale, descriptors, concordances, task and topic banks,
the graded reading passages and the strategy bank. [RESEARCH.md §7](../RESEARCH.md) documents their
construction; the quiz and study-plan endpoints are pure generators over those datasets, so they
carry no stored content at all. Endpoint-level documentation is served by the API itself at `/docs`.

## Machine-readable citation

- [`CITATION.cff`](../CITATION.cff) — Citation File Format 1.2.0.
- [`codemeta.json`](../codemeta.json) — CodeMeta 2.0.
- [`.zenodo.json`](../.zenodo.json) — Zenodo release metadata (DOI minted on first release).
