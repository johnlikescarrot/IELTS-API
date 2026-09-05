# Dataset reference

This directory holds the archived artefacts of the API contract.

| File           | What it is                                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `openapi.json` | The OpenAPI 3.1 document, regenerated on every release from the live route table. Always current at `/openapi.json` on a running instance. |

The datasets themselves live in [`data/`](../data) and are documented in
[RESEARCH.md](../RESEARCH.md), which records the extraction methodology and the threats to validity
that apply to each of them. Endpoint-level documentation is served by the API itself at `/docs`.

## Machine-readable citation

- [`CITATION.cff`](../CITATION.cff) — Citation File Format 1.2.0.
- [`codemeta.json`](../codemeta.json) — CodeMeta 2.0.
- [`.zenodo.json`](../.zenodo.json) — metadata prepared for archiving; no DOI is claimed until a public record is verified.

## Original reading practice

The source collection is [`src/data/reading-content.ts`](../src/data/reading-content.ts): six
fictional, AI-assisted original passages, 36 questions and paragraph-grounded solutions under
CC BY 4.0. Normal API views omit solutions, while grading and offline library exports include them.
Every reading response identifies the dataset version and SHA-256. The labels are editorial, not
validated CEFR levels or IELTS bands.

- [Upstream structural review](UPSTREAM-REVIEW.md): pinned evidence, observed counts and rights boundaries.
- [Research reuse](RESEARCH-REUSE.md): offline JSONL export, evaluation limitations and citation guidance.

The original reading collection is maintained as typed source, not extracted from upstream JSON.
Changes must preserve IDs, update the dataset version when content changes, and pass key/evidence,
schema, HTTP and grading tests. `docs/openapi.json` is compared with the live generated contract in CI.
