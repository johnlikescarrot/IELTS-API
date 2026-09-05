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
| `msneloy-tree.json`             | Complete pinned recursive tree metadata: 557 blobs and 70 directories, no source contents.                      |
| `msneloy-audit.json`            | Reproducible all-file/byte accounting and SHA-256 of the normalised manifest.                                   |

The original Task 1 stimuli and answer keys live in [`src/data/writingExercises.ts`](../src/data/writingExercises.ts),
not in the upstream manifest. Their SVGs are deterministically rendered at request time. See the
[source-review and reproducibility guide](research/MSNELOY.md) for rights, scope and limitations.

The datasets themselves live in [`data/`](../data) and are documented in
[RESEARCH.md](../RESEARCH.md), which records the extraction methodology and the threats to validity
that apply to each of them. Endpoint-level documentation is served by the API itself at `/docs`.

## Machine-readable citation

- [`CITATION.cff`](../CITATION.cff) — Citation File Format 1.2.0.
- [`codemeta.json`](../codemeta.json) — CodeMeta 2.0.
- [`.zenodo.json`](../.zenodo.json) — Zenodo release metadata (configuration for a future verified archive deposit; not a DOI claim).
