# Dataset reference

This directory holds the archived artefacts of the API contract and research audit.

| File                           | What it is                                                                                                 |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `openapi.json`                 | OpenAPI 3.1 generated from the route table, with actual practice/error schemas and relative server URLs.   |
| `research.html`                | Self-contained, unreviewed technical report draft, also served at `/research`.                             |
| `UPGRADE-YOUR-IELTS-SKILLS.md` | Practice data card: pinned source audit, counts, methodology, rights, reproduction and citation checklist. |

Run `npm run docs:generate` to regenerate the HTML and OpenAPI snapshots. Tests compare the archived
files byte for byte with the live generators, and CI validates the OpenAPI specification itself.

The datasets live in [`data/`](../data). The original corpus/vocabulary methods and limitations are
in [RESEARCH.md](../RESEARCH.md); the new practice inventory has its own
[data card](UPGRADE-YOUR-IELTS-SKILLS.md). The running API serves endpoint documentation at `/docs`.
`/v1/practice/export` returns exactly `data/practice.json`, without the normal HTTP JSON envelope.

## Machine-readable citation

- [`CITATION.cff`](../CITATION.cff) — validated Citation File Format 1.2.0.
- [`codemeta.json`](../codemeta.json) — CodeMeta 2.0 metadata.
- [`.zenodo.json`](../.zenodo.json) — metadata prepared for a future verified archive deposit.

No placeholder DOI, deposit, venue acceptance or Google Scholar indexing is claimed. Record the
version/commit actually used and, for practice metadata, the payload digest. See the data card's
publication checklist before releasing or submitting a manuscript.
