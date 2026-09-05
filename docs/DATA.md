# Dataset and artifact reference

| File                         | Purpose                                                                                             |
| ---------------------------- | --------------------------------------------------------------------------------------------------- |
| `data/vocabulary.json`       | Legacy workbook-derived vocabulary; see its unresolved gloss-provenance limits in RESEARCH.md       |
| `data/corpus.json`           | Legacy research corpus file metadata, not source binaries                                           |
| `data/practice.json`         | 1,852 Reading/Listening units, 4,606 file-metadata records, explicit source pin and rights boundary |
| `docs/openapi.json`          | Validated OpenAPI 3.1 snapshot with brace parameters, typed practice schemas and raw media types    |
| `docs/citation.bib`          | Generated software citation, also served at `/citation.bib`                                         |
| `paper/practice-metadata.md` | Generated technical-report draft, served in full HTML at `/research`                                |

The paths above are relative to the repository root. `npm run docs:update` regenerates the last
three files; `npm run docs:check` fails on committed snapshot drift. The practice compiler is
`npm run data:practice -- <pinned-tree.json> <output.json>` and is tested under the same per-file
100% TypeScript coverage gate as the API.

See [the upstream audit](UPSTREAM-REVIEW.md), [reproduction protocol](REPRODUCIBILITY.md),
[legacy provenance analysis](../RESEARCH.md), and [DATA-LICENSE](../DATA-LICENSE). Runtime API
requests make no calls to the source repositories or to a database/model service.

## Citation metadata

- [`CITATION.cff`](../CITATION.cff) — schema-validated Citation File Format 1.2.0.
- [`codemeta.json`](../codemeta.json) — CodeMeta software metadata.
- [`.zenodo.json`](../.zenodo.json) — prepared archive metadata, not evidence of a minted DOI.
- [Publication checklist](SCHOLARLY-PUBLICATION.md) — truthful authorship, hosting and archival steps.
