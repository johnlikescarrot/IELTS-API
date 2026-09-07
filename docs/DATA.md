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
| `testcenter.json`               | Mock-exam test-centre index: 377 self-marking papers, the Cambridge 4-21 holdings matrix, 1,099 hand-tagged question groups and the production raw-score-to-band calibration.                             |

Two families are curated tables rather than extractions and therefore live in TypeScript, not in
[`data/`](../data): the raw-score conversion tables (`src/data/rawScores.ts`, validated against the
official average marks by the test suite) and the retention layer (`src/data/retention.ts`: seven
spaced-repetition review schedules, Ebbinghaus's retention equation with his seven observations, the
deployed mastery rule and three vocabulary-library sizes, verified against their upstream sources by
CI and refitted by the test suite).

The datasets themselves live in [`data/`](../data) and are documented in
[RESEARCH.md](../RESEARCH.md), which records the extraction methodology and the threats to validity
that apply to each of them. Endpoint-level documentation is served by the API itself at `/docs`.

## Machine-readable citation

- [`CITATION.cff`](../CITATION.cff) — Citation File Format 1.2.0.
- [`codemeta.json`](../codemeta.json) — CodeMeta 2.0.
- [`.zenodo.json`](../.zenodo.json) — Zenodo release metadata (DOI minted on first release).
