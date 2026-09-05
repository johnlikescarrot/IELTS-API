# Dataset reference

This directory holds the archived artefacts of the API contract and data provenance.

| File                 | What it is                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `openapi.json`       | The OpenAPI 3.1 document, regenerated on every release from the live route table. Always current at `/openapi.json` on a running instance. |
| `manifest.json`      | The deterministic SHA-256 research provenance manifest, mirrored at `/manifest.json` on a running instance.                                |
| `UPSTREAM-REVIEW.md` | Pinned review and audit notes for the upstream `UPGRADE-YOUR-IELTS-SKILLS` repository snapshot.                                            |

The datasets themselves live in [`data/`](../data) and [`src/data/`](../src/data) and are documented in
[RESEARCH.md](../RESEARCH.md), which records the extraction methodology and the threats to validity
that apply to each of them. Endpoint-level documentation is served by the API itself at `/docs`.

## Machine-readable citation

- [`CITATION.cff`](../CITATION.cff) — Citation File Format 1.2.0.
- [`codemeta.json`](../codemeta.json) — CodeMeta 2.0.
- [`.zenodo.json`](../.zenodo.json) — Zenodo release metadata (DOI minted on first release).
