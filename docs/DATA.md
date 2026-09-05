# Dataset reference

This directory holds the archived artefacts of the API contract.

| File           | What it is                                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `openapi.json` | The OpenAPI 3.1 document, regenerated on every release from the live route table. Always current at `/openapi.json` on a running instance. |

## The datasets

Two datasets are extracted from upstream sources and committed as JSON under
[`data/`](../data); the rest are authored in TypeScript under `src/data/` and served as JSON. Each
one is licensed CC BY 4.0 and carries provenance in its own responses.

| Dataset            | Where it lives            | Size                                   | Served at                             | Provenance                                               |
| ------------------ | ------------------------- | -------------------------------------- | ------------------------------------- | -------------------------------------------------------- |
| Vocabulary         | `data/vocabulary.json`    | 4,174 headwords / 4,310 occurrences    | `/v1/vocabulary`                      | Extracted from the upstream `1-22yas.xlsx` workbook      |
| Corpus index       | `data/corpus.json`        | 76 relevant files of 404               | `/v1/corpus`                          | Metadata only; no upstream binary is mirrored            |
| Band descriptors   | `src/data/bands.ts`       | 120 rows, bands 0–9                    | `/v1/bands`                           | Original condensed paraphrases, not the official wording |
| Score concordances | `src/data/conversions.ts` | 5 target scales                        | `/v1/scores/convert`                  | Providers' published comparison tables; indicative       |
| Raw-score tables   | `src/data/rawscores.ts`   | 3 tables, exhaustive 0–40              | `/v1/scores/raw`, `/v1/scores/tables` | Per-boundary `published` or `extrapolated`; indicative   |
| Question types     | `src/data/questions.ts`   | 17 types (6 listening, 11 reading)     | `/v1/questions`                       | Original descriptions of the published task types        |
| Format blueprints  | `src/data/format.ts`      | 6 papers, 20 parts                     | `/v1/format`                          | Original summaries of the published test structure       |
| Task banks         | `src/data/tasks.ts`       | 111 Writing Task 2, 80 Speaking, 10 T1 | `/v1/topics`                          | Original prompts                                         |
| Resources          | `src/data/resources.ts`   | Curated open links                     | `/v1/resources`                       | Third-party, each with its licence                       |

Two caveats travel with the data and are repeated in every relevant response:

- The **raw-score tables are not official.** The IELTS partners re-equate boundaries for each test
  version and publish no definitive table. Rows where public sources disagree carry the competing
  boundary in a `disagreement` field — Listening is contested at five boundaries between bands 5.0
  and 7.5. Cite the table you used.
- The **band descriptors are paraphrases.** Work needing the authoritative wording must cite the
  published descriptors directly.

Extraction methodology, reproduction instructions and the threats to validity that apply to each
dataset are recorded in [RESEARCH.md](../RESEARCH.md). Endpoint-level documentation is served by the
API itself at `/docs`, and the paper describing the whole artefact is served at `/paper` and
`/paper.pdf`.

## Machine-readable citation

One bibliographic record is defined in `src/data/citation.ts`; every surface below is rendered from
it, so they cannot disagree.

- [`CITATION.cff`](../CITATION.cff) — Citation File Format 1.2.0.
- [`codemeta.json`](../codemeta.json) — CodeMeta 2.0.
- [`.zenodo.json`](../.zenodo.json) — Zenodo release metadata (DOI minted on first release).
- `/v1/citation?format=…` — BibTeX, RIS, CSL-JSON, APA, MLA, Chicago, Harvard, EndNote, plain text.
- `/paper` — landing page carrying Highwire Press `citation_*` tags, Dublin Core and schema.org
  JSON-LD; `/paper.pdf` is the same text as a reproducible PDF.
