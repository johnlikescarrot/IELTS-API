# Dataset reference

This directory holds the archived artefacts of the API contract.

| File           | What it is                                                                                                                                 | Source                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| `openapi.json` | The OpenAPI 3.1 document, regenerated on every release from the live route table. Always current at `/openapi.json` on a running instance. | Generated from the route table by `src/lib/openapi.ts`. |

The datasets themselves live in [`data/`](../data) and are documented in
[RESEARCH.md](../RESEARCH.md), which records the extraction methodology and the threats to validity
that apply to each of them. Endpoint-level documentation is served by the API itself at `/docs`.

## Machine-readable citation

- [`CITATION.cff`](../CITATION.cff) — Citation File Format 1.2.0.
- [`codemeta.json`](../codemeta.json) — CodeMeta 2.0.
- [`.zenodo.json`](../.zenodo.json) — Zenodo release metadata (DOI minted on first release).

## Datasets

| File              | What it is                                                                      | Reproducible from                                                   |
| ----------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `vocabulary.json` | 4,174 headwords from the Cambridge IELTS volumes 1-22 word lists.               | `scripts/extract_vocabulary.py` on the upstream workbook.           |
| `reading.json`    | Original, CEFR-levelled Reading passages and Academic Reading questions.        | Authored content (schema validated in CI).                          |
| `practice.json`   | Metadata index of a large, CEFR-levelled IELTS practice corpus (metadata only). | `scripts/extract_practice.py` on the upstream tree + reading index. |
| `corpus.json`     | Metadata index of the IELTS-relevant subset of a noisy open corpus.             | `scripts/extract_corpus.py` on the upstream tree.                   |
