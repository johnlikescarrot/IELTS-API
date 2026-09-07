# Dataset reference

This directory holds the archived artefacts of the API contract.

| File           | What it is                                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `openapi.json` | The OpenAPI 3.1 document, regenerated on every release from the live route table. Always current at `/openapi.json` on a running instance. |

| Dataset (in [`data/`](../data)) | What it is                                                                                                                                                                                                |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vocabulary.json`               | 4,174 Cambridge IELTS 1-22 headwords with phonetics, sense-split glosses, morpheme hints and volume provenance.                                                                                           |
| `corpus.json`                   | Metadata index of the 76 IELTS-relevant files of the 404-file open research corpus.                                                                                                                       |
| `practice-tests.json`           | Structure, question-type normalisation, provenance and readability statistics for 1,702 practice items.                                                                                                   |
| `materials.json`                | Metadata index of a 2,385-file self-study collection: recall banks, question banks, templates, vocabulary.                                                                                                |
| `archive.json`                  | Grey-literature archive index: 555 files of the Cambridge 1-18 listening audio archive, the twelve official sample tasks and 24 marked learner essays, with derived structure and readability statistics. |
| `testcenter.json`               | Mock-exam test-centre index: 377 self-marking papers, a Cambridge 4-21 holdings matrix, 1,099 hand-tagged question groups over 5,408 questions, and the production score calibration.                     |

The datasets themselves live in [`data/`](../data) and are documented in
[RESEARCH.md](../RESEARCH.md), which records the extraction methodology and the threats to validity
that apply to each of them. Endpoint-level documentation is served by the API itself at `/docs`.

The retention data has no file in [`data/`](../data) because it is not extracted from anything: the
28 forgetting-curve observations and the five review schedulers are transcribed from their
publications into [`src/data/retention.ts`](../src/data/retention.ts), each record carrying its own
citation, and asserted against the published figures by the test suite. See
[RESEARCH.md](../RESEARCH.md) Part VIII.

## Machine-readable citation

- [`CITATION.cff`](../CITATION.cff) — Citation File Format 1.2.0.
- [`codemeta.json`](../codemeta.json) — CodeMeta 2.0.
- [`.zenodo.json`](../.zenodo.json) — Zenodo release metadata (DOI minted on first release).
