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
| `materials.json`                | Metadata index of a 2,385-file self-study collection: recall banks, question banks, templates, vocabulary.      |

Every dataset — including the ones defined in TypeScript rather than shipped as JSON — is also
described by the API itself at `/v1/datasets`, which reports the upstream source, the derivation, the
licence, the live record count, the serving endpoints, the regenerating script and the SHA-256 digest
of the file the running process loaded. Use it to verify that a cited response was produced by the
same bytes archived here.

The datasets themselves live in [`data/`](../data) and are documented in
[RESEARCH.md](../RESEARCH.md), which records the extraction methodology and the threats to validity
that apply to each of them. Endpoint-level documentation is served by the API itself at `/docs`.

## Machine-readable citation

- [`CITATION.cff`](../CITATION.cff) — Citation File Format 1.2.0.
- [`codemeta.json`](../codemeta.json) — CodeMeta 2.0.
- [`.zenodo.json`](../.zenodo.json) — Zenodo release metadata (DOI minted on first release).
- `GET /v1/cite` — the same metadata rendered as BibTeX, APA 7, MLA 9, Chicago author-date and RIS.
  Add `?format=bibtex` for a single plain-text citation, `?accessed=YYYY-MM-DD` to pin the access
  date.
