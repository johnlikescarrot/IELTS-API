# Data card: UPGRADE-YOUR-IELTS-SKILLS practice inventory

## Purpose and scope

This is a **metadata-only structural audit**, not a redistribution of a question bank, a claim of
open licensing, or a benchmark of IELTS learning outcomes. It adds reproducible Reading/Listening
resource discovery to IELTS API without copying the source's authentication, payments, score
reporting, exercises or media. The API itself remains free, no-auth and offline-capable.

- Source: [`ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS`][source].
- Commit: `ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c`, committed **2026-07-03T02:16:52Z**.
- Git tree object: `52e6e832d6b3243205ebe3bb7fe901bbeca7f504`.
- Audit date: **2026-09-05**. The analysis applies to this snapshot, not future `main`.
- Schema version: `1.0.0`; generator: `ielts-api/extract-practice-v1`.
- Output: [`data/practice.json`](../data/practice.json), 1,644,958 UTF-8 bytes.
- Implementation: [`src/data/practice-extract.ts`](../src/data/practice-extract.ts).
- Full report: [`docs/research.html`](research.html), also served at `/research`.

## What was examined

The complete recursive Git tree is **not truncated**: 6,309 entries, of which 5,545 are blobs,
with 3,876,514,725 bytes summed over file paths. The latter is not a unique-content or compressed
repository size. No bulk clone of the 3.88 GB source, media download or execution of upstream code
is needed to reproduce the inventory.

| Top-level area           | Blobs | Interpretation                                                                       |
| ------------------------ | ----: | ------------------------------------------------------------------------------------ |
| `Reading_1232_Basic`     | 2,492 | SPA data, paired JSON/JavaScript lesson representations, plans, templates            |
| `Reading_315_FullTest`   | 1,128 | Per-test DOCX/HTML/JSON and supporting images/strategies                             |
| `Listening_204_FullTest` | 1,014 | Per-test HTML/JSON/audio; some generated representations are absent                  |
| `Listening_102_Basic`    |   240 | Three source-labelled levels, static lesson pages and audio, shared tooling          |
| `node_modules`           |   171 | Vendored browser-automation dependencies, not exercises                              |
| `Reading_docx`           |   165 | Conversion inputs/intermediate files; excluded to avoid counting them as extra tests |
| `Tools`                  |   156 | Conversion, scraping, authentication and maintenance tooling                         |
| `Listening_docx`         |   152 | Conversion inputs/intermediate files; excluded                                       |
| Other                    |    27 | Assets, debug files, root workbook, dashboards and maintenance files                 |

Alongside the complete tree census, these files were inspected at the pinned commit:

- [`Docs/PROJECT_SUMMARY.md`][summary]: architecture, shared login, Google Apps Script score/login
  integration and a stated paid-access model. This is the source's description, not a live purchase
  or accessibility test.
- [`Assets/js/app.js`][app]: client authentication, local storage, score reporting and answer
  comparison. This API does **not** reuse that code or contact its backend.
- [`Reading_1232_Basic/IELTS-Reading-1232-Plan.md`][plan], the three level-planning documents,
  the topic plan and development logs: intended counts and question families. Plans are not evidence
  that a generated lesson has the intended level, quality, or learning effect.
- One basic listening HTML lesson and full-test Reading/Listening schema examples; Listening raw,
  processed and strategy JSON; one reading JSON lesson in each level group. These establish
  representative format differences only, not correctness of all source content. No source text is
  included in fixtures or the published dataset.

There is **no repository-level README or licence** in this snapshot. Licence files inside vendored
`node_modules` do not license the lesson content. Public GitHub visibility is not a redistribution
licence. Sensitive/configuration/session/workbook contents are not part of this audit or dataset.

## Findings: expected is not observed

| Collection           | Expected units | Observed units | Required asset roles       | Structurally incomplete |
| -------------------- | -------------: | -------------: | -------------------------- | ----------------------: |
| Basic listening      |            102 |            102 | page, audio                |                       0 |
| Listening full tests |            204 |            204 | page, questions, audio     |                       6 |
| Basic reading        |          1,232 |          1,232 | questions                  |                       0 |
| Reading full tests   |            315 |            314 | page, questions            |                      45 |
| **Total**            |      **1,853** |      **1,852** | Collection-specific policy |                  **51** |

Expected counts are taken from the source's collection names and project summary. Observed counts
come from allowlisted assets, **not those names**. A missing directory and an existing unit with a
missing representation are different conditions:

- Reading full test **105** has no observed directory/assets, and therefore no catalogue item.
- Listening full tests **3, 34, 51** lack canonical question JSON.
- Listening full tests **83, 85, 88** lack the canonical audio path.
- **45** observed Reading full tests lack canonical question JSON. HTML or DOCX can still exist;
  this is not a claim that those tests are unusable.
- Basic reading has 198 A1–A2, 374 B1–B2 and 660 C1–C2 lesson identities, each with a JSON and JS
  representation. Counting file representations as separate lessons doubles the count incorrectly.
- Basic listening has 34 units in each of Basic, Intermediate and Advanced. These labels are not
  mapped to IELTS bands or validated CEFR levels.
- 100 placeholder-named `Test_{idx_num}.html` files are excluded, not treated as canonical pages.

### Indexed asset roles

| Role                               |    Assets |
| ---------------------------------- | --------: |
| Question JSON                      |     1,702 |
| Reading data-script representation |     1,232 |
| HTML page                          |       720 |
| DOCX document                      |       314 |
| Audio                              |       303 |
| Processed question JSON            |       295 |
| Image                              |       101 |
| Strategies                         |        40 |
| **Total**                          | **4,707** |

The selected assets account for 3,823,735,950 bytes. The other 838 repository files are excluded.
There are 68 Git-blob groups referenced more than once, each appearing twice (68 extra references).
This is **byte-identity metadata**, not a semantic-duplicate detector. It does not establish that
lessons are independent, that answer keys are correct, or that train/test leakage is absent.

## Extraction and identity rules

1. Accept only the pinned commit or tree identifier and `truncated: false`. Validate blob paths,
   modes, sizes and 40-character hexadecimal object IDs. Reject duplicate paths; do not silently
   overwrite provenance. This validates input structure, not cryptographic authenticity of an
   arbitrary user-supplied GitHub response; CI retrieves it from GitHub over HTTPS.
2. Ignore trees/submodules and do not follow symlinks. Count blob bytes independently of whether
   their paths are later included. No `.env`, session, login, debug, workbook or vendored content is
   read. The generator accepts **metadata JSON only** and has no HTTP client.
3. Match explicit canonical paths under the four collection roots. Only expected asset names are
   included; a file under `Test_1` named `Test_2.json` is not silently attached. Canonical images,
   including the source's trailing-space `.png ` filenames, retain their exact paths.
4. Group Basic Reading by level plus extensionless lesson path. Group other assets by their lesson
   or test directory. Derive IDs from collection, level where present and zero-padded sequence:
   `reading-basic-a1-a2-0001`, `listening-basic-basic-0001`, `reading-tests-0001`.
   IDs are stable when other units are inserted; moving/renaming a source unit changes its ID.
5. Sort assets by exact path and units by ID, using JavaScript string comparisons rather than
   locale-dependent collation. Preserve original paths, Git blob SHA-1 and file byte sizes.
6. Compute `missingRoles` against the table above. `structurallyComplete` means required **paths
   exist**, not that their contents parse, play, match one another or are available without login.
   Zero-byte paths still count as present. Optional processed JSON does not replace missing
   canonical question JSON.
7. Compute counts and a payload checksum; add fixed provenance and rights caveats. Never inject
   current timestamps. Runtime data queries return detached copies, so a library consumer cannot
   mutate the cached snapshot used by other consumers.

Git blob SHA-1 includes Git's object header and is **not** a checksum of the bare file bytes.
The payload SHA-256 is separate:

```text
aa3d43627d0a1264292ff14a019e03ffcb9a4a0c63b748e3d213259da0588b2b
```

## Reproduce and verify

Node.js 20.19+ and the locked development dependencies are needed to run the TypeScript extractor.
Downloading this public tree does not require authentication, subject to GitHub's anonymous API
limits. The running IELTS API needs no GitHub connection, credentials or upstream fetches.

```bash
npm ci
curl --fail --location \
  'https://api.github.com/repos/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS/git/trees/ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c?recursive=1' \
  --output /tmp/ielts-practice-tree.json
npm run data:practice -- /tmp/ielts-practice-tree.json /tmp/ielts-practice.json
cmp data/practice.json /tmp/ielts-practice.json
npm run validate
npm run docs:generate
```

The GitHub Actions job repeats the pinned fetch/extraction/comparison. Local tests require no
network: synthetic metadata tests exercise the extractor, and dataset tests reconcile all units,
asset counts, bytes, structural gaps and the payload checksum. Coverage includes **all executable
TypeScript in `src/` and `scripts/`**; type-only declarations and the pre-existing Python utilities
are not instrumented by Vitest. No thresholds or ignore pragmas were weakened for this change.

Verify an exported snapshot independently with Node's standard library:

```js
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const catalog = JSON.parse(readFileSync('data/practice.json', 'utf8'));
const payload = JSON.stringify([catalog.collections, catalog.stats, catalog.items]);
const digest = createHash('sha256').update(payload, 'utf8').digest('hex');
assert.equal(digest, catalog.meta.contentSha256);
```

The algorithm hashes the **parsed, ordered payload**, not the indented file, the self-referential
metadata or the HTTP envelope. Preserve array/object order; this is a documented serialization,
not an implementation of RFC 8785. Metadata provenance is pinned and reviewed separately.

## API contract and examples

| Endpoint                 | Result                                                          |
| ------------------------ | --------------------------------------------------------------- |
| `/v1/practice`           | Collections, observed statistics, provenance and rights caveats |
| `/v1/practice/stats`     | Statistics with the same snapshot metadata                      |
| `/v1/practice/items`     | Filtered page in stable ID order                                |
| `/v1/practice/items/:id` | One unit; 404 if absent                                         |
| `/v1/practice/sample`    | Seeded, without-replacement selection of metadata               |
| `/v1/practice/export`    | Complete raw JSON, byte-identical to the committed snapshot     |

```bash
# Source-labelled beginner reading metadata, not exercise content
curl 'http://localhost:3000/v1/practice/items?skill=reading&level=a1-a2&limit=3'

# Audit gaps in observed full listening tests
curl 'http://localhost:3000/v1/practice/items?collection=listening-tests&complete=false'

# Reproducible selection; preserve seed, filters, count and contentSha256
curl 'http://localhost:3000/v1/practice/sample?seed=study-2026&count=10&skill=reading'

# Archival export has no status/data/meta HTTP envelope
curl 'http://localhost:3000/v1/practice/export' --output practice-snapshot.json
```

`collection`, `skill`, `level`, `complete=true|false` and `q` are shared search/sample filters;
filters combine with AND. Invalid enumeration values and repeated supported parameters return 400.
Pagination defaults to `limit=20`, `offset=0`; bounds are 1–100 and 0–100000 respectively. An empty
match or offset beyond the population returns an empty page, not a 404.

Sampling requires a nonblank `seed`; `count` is 1–50 (default 5), capped at the matching population.
The algorithm is FNV-1a + mulberry32 + partial Fisher–Yates, reusing the API's existing seeded-index
implementation. There are no duplicate indices; results are sorted by ID. Record the **dataset
digest as well as the seed**: a changed population can change a sample. This is not cryptographic
randomness, stratified sampling or a deduplicated evaluation split.

## Licensing, privacy and research limitations

The original metadata compilation is CC BY 4.0, scoped as explained in [DATA-LICENSE](../DATA-LICENSE).
It grants no rights in the source exercises, prose, definitions, media or source code. Per-item raw,
download and hosted-exercise URLs are intentionally absent; the source repository and immutable
commit are provided for attribution and inspection, not access-control bypassing.

No student identifiers, sessions, grades, dashboard records, credentials or workbook contents are
collected. No upstream API calls are made by the service. The source's described login/payment
requirements are not relabelled as free/no-auth resources in `/v1/resources`.

This single-repository inventory cannot estimate IELTS score improvement, establish question
validity, assign CEFR levels or support a general claim about all IELTS repositories. Question
content was not exhaustively audited. Source labels and documentation can themselves be wrong.
The pre-existing vocabulary dataset has unresolved gloss-origin questions, documented separately
in [RESEARCH.md](../RESEARCH.md); this new inventory does not resolve or broaden those rights.

## Citation and publication readiness

Cite both the API version/commit actually used and the upstream snapshot. Preserve the digest and
queries in your methods or supplementary materials. The report is a **draft, not peer-reviewed**.
No DOI or venue is invented; `CITATION.cff` is schema-validated and contains no placeholder DOI.

[Google Scholar's inclusion guidelines][scholar] require scholarly content with a freely visible
abstract/full text, crawlable HTML or searchable PDF, accurate bibliographic information and stable
hosting. CFF, CodeMeta, a DOI or HTML meta tags alone **do not guarantee indexing or citations**.
The generated report provides a full abstract, methods, results, limitations, references and
Highwire citation tags; `/docs` links to it without JavaScript or authentication.

Before a research release:

1. Review actual authorship, methods, rights and limitations; do not assign fabricated affiliations.
2. Archive a versioned release after enabling [Zenodo's GitHub integration][zenodo], verify that the
   deposit succeeded, and then add the real version DOI to citation metadata. This repository's
   configuration alone does not prove a deposit exists.
3. Host the full report at a stable public URL or an appropriate institutional/preprint repository;
   a temporary development preview is not permanent publication infrastructure.
4. Evaluate usefulness with independent users or research baselines, disclose limitations and submit
   to an appropriate venue only when its requirements are met. Do not claim acceptance in advance.

[source]: https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS/tree/ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c
[summary]: https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS/blob/ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c/Docs/PROJECT_SUMMARY.md
[app]: https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS/blob/ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c/Assets/js/app.js
[plan]: https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS/blob/ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c/Reading_1232_Basic/IELTS-Reading-1232-Plan.md
[scholar]: https://scholar.google.com/intl/en/scholar/inclusion.html
[zenodo]: https://help.zenodo.org/docs/github/archive-software/github-upload/
