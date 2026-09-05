# Dataset reference

This directory holds the archived artefacts of the API contract.

| File           | What it is                                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `openapi.json` | The OpenAPI 3.1 document, regenerated on every release from the live route table. Always current at `/openapi.json` on a running instance. |

| Dataset (in [`data/`](../data)) | What it is                                                                                                      |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `vocabulary.json`               | 4,174 Cambridge IELTS 1-22 headwords with phonetics, sense-split glosses, morpheme hints and volume provenance. |
| `corpus.json`                   | Metadata index of the 76 IELTS-relevant files of the 404-file open research corpus.                             |
| `practice-tests.json`           | Structure, question-type normalisation, provenance and readability statistics for 1,702 practice items.         |
| `study-notes.json`              | Metadata index of 2,353 files of the self-study collection, with derived speaking-bank counts.                  |
| `collocations.json`             | 245 Speaking argumentative collocations and frames across 14 dimensions, with glosses and polarity tags.        |

The datasets themselves live in [`data/`](../data) and are documented in
[RESEARCH.md](../RESEARCH.md), which records the extraction methodology and the threats to validity
that apply to each of them. Endpoint-level documentation is served by the API itself at `/docs`.

## Machine-readable citation

- [`CITATION.cff`](../CITATION.cff) — Citation File Format 1.2.0.
- [`codemeta.json`](../codemeta.json) — CodeMeta 2.0.
- [`.zenodo.json`](../.zenodo.json) — Zenodo release metadata (DOI minted on first release).
