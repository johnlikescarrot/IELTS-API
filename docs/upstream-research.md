# Upstream repository research

Snapshot audited: **4 September 2026 UTC**

Repository: [`zhengyishiming/IELTS`](https://github.com/zhengyishiming/IELTS)

Snapshot commit: `a9e2d6c9a070eecea6ffaa6f15b2a00c1c7b938c`

## Findings

The upstream project is not an application repository. It has no README, package manifest, source tree, test suite, API contract, or licence file in the `main` snapshot. It is a personal, mixed-file archive with 404 blobs totalling approximately 6.42 GB:

| Category      | Files |         Bytes |
| ------------- | ----: | ------------: |
| RAR parts     |   244 | 5,463,372,145 |
| PDFs          |    52 |   441,773,980 |
| EPUBs         |    54 |   302,638,231 |
| Audio/video   |    22 |   129,560,068 |
| MOBI/AZW/AZW3 |    15 |    51,873,356 |
| Other files   |    17 |    12,236,655 |

The exact machine-readable inventory, including every current path, blob SHA, and byte size, is checked in at [`upstream-inventory.json`](./upstream-inventory.json). The final `Other files` total is intentionally available from that inventory rather than being hand-maintained in this table.

A filename-based audit found:

- **30** files explicitly named for IELTS or 雅思, totalling **128,907,922 bytes**. They are mostly books and sample material in PDF, EPUB, MOBI, AZW3, and one small text file.
- **44** files broadly related to English learning, totalling **329,476,486 bytes**. This includes the 30 explicit IELTS files and general English, grammar, pronunciation, vocabulary, and writing material.
- **6** small structured-looking text blobs. `Ielts.txt` contains a candidate writing response, an examiner comment, and the task prompt. `speaking` is a transcript from _This American Life_, not an IELTS speaking dataset. `20221203` and `20230510` are lists of IPFS links to books. `aa.txt` is a list of Ontario colleges, and `aiya.txt` is a two-line social handle.
- The remaining files are unrelated books, music, video, engineering/science archives, playlists, spreadsheets, and other personal files.

## Scope decision

This API does **not** copy, serve, transform, or repackage upstream binaries or the upstream transcript. The repository does not establish an individual licence for the binary files, and many filenames identify commercial books, music, and other third-party works. Adding them would make a supposedly free API a copyright and redistribution risk.

Instead, the implementation uses:

1. original, small practice prompts and passages written for this project;
2. project-maintained vocabulary and practice fixtures that are kept separate from the upstream payload;
3. links to current official IELTS pages rather than reproducing protected or version-sensitive material; and
4. this inventory as an auditable provenance record, without pulling the upstream payload into the package.

The project-maintained fixtures should not be confused with official IELTS material. Content that came from the audited archive was removed or replaced with project-created material, and the resource directory now links to lawful public pages rather than upstream binary URLs.

This preserves the useful insight from the upstream archive—learners need material for all four skills—without treating an unstructured archive as a data licence or as an API specification.

## Design implications

- The public API is deterministic and works without authentication, API keys, network calls, or a database.
- Practice answer keys are withheld from normal practice responses and are returned only after a client submits answers to the scoring endpoint.
- Raw-score conversion is labelled **indicative**, because the official conversion can vary slightly between test versions.
- Writing feedback is a transparent checklist, not an automated official band score. A deterministic local API cannot validly assess pronunciation or replace a certified examiner.

## Sources consulted

- [IELTS test format](https://takeielts.britishcouncil.org/take-ielts/test-format)
- [IELTS scoring in detail](https://www.ielts.org/for-organisations/ielts-scoring-in-detail)
- [IELTS Writing band descriptors](https://ielts.org/cdn/Guides/ielts-writing-band-descriptors.pdf)
- [IELTS Speaking band descriptors](https://ielts.org/cdn/ielts-guides/ielts-speaking-band-descriptors.pdf)
- [Upstream repository](https://github.com/zhengyishiming/IELTS)

The official pages are references for the API's format metadata and scoring terminology; the original practice content is not presented as official IELTS material.
