# Dataset reference

This directory holds the archived artefacts of the API contract.

| File           | What it is                                                                                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `openapi.json` | The OpenAPI 3.1 document, generated with `npm run openapi:generate` and checked for drift by tests. Always current at `/openapi.json` on a running instance. |

The datasets themselves live in [`data/`](../data) and are documented in
[RESEARCH.md](../RESEARCH.md), which records the extraction methodology and the threats to validity
that apply to each of them. Endpoint-level documentation is served by the API itself at `/docs`.

## Reading and Listening metadata

[`data/practice.json`](../data/practice.json) contains 1,852 canonical metadata records across four
collections. [PRACTICE.md](PRACTICE.md) records the upstream review, extraction rules, exact digest
serialisation, rights caveats and replay protocol. [RESEARCH-WORKFLOW.md](RESEARCH-WORKFLOW.md)
provides an experiment/archival checklist. Neither document claims a publication or guarantees
Google Scholar indexing.

## Machine-readable citation

- [`CITATION.cff`](../CITATION.cff) — Citation File Format 1.2.0.
- [`codemeta.json`](../codemeta.json) — CodeMeta 2.0.
- [`.zenodo.json`](../.zenodo.json) — Zenodo metadata template; a DOI must be issued and verified before it is cited.
