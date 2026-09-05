# Reading and Listening practice metadata

The `/v1/practice` endpoints are **free, no-authentication, metadata-only** APIs. They add
Reading and Listening discovery to the existing vocabulary, Writing and Speaking API without
copying unlicensed exercises, answer keys, audio, student records, or authentication code.

## Source review

Reviewed on **5 September 2026**:

- Repository: [ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS][upstream].
- Commit: `ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c` (3 July 2026).
- Root Git tree: `52e6e832d6b3243205ebe3bb7fe901bbeca7f504`.
- Complete recursive tree: **5,545 blobs**, `truncated: false`.
- No project licence file was found outside vendored dependencies. Public availability is **not**
  permission to redistribute the content.

The review inspected the repository tree and these pinned documents/tools, not their deployed
services or student accounts:

| Evidence                      | Observation                                                                                       | Design consequence                                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| [Project summary][summary]    | Describes four collections, injected login, Apps Script authentication and paid access            | Keep metadata access separate from upstream exercise access; do not label this repository a free/no-login resource    |
| [Reading plan][plan]          | Proposes six CEFR levels, 11 question families and a progression towards band 9                   | Preserve the three actual directory buckets; do not infer individual CEFR levels, question types or learning efficacy |
| [Plan generator][generator]   | Groups Reading lessons into level-based quotas and writes a learner-specific spreadsheet schedule | Offer stateless, reproducible filtering/sampling, not learner tracking or a promised band-score plan                  |
| [Index generator][indexes]    | Chooses between `index.html` and `Test_N.html` for a single test directory                        | Select one canonical artefact per lesson/test rather than counting HTML aliases as separate exercises                 |
| [Integrity script][integrity] | Checks injected submission/login integration markers                                              | Add independent metadata integrity tests; these markers do not validate question quality or test completeness         |

Environment files, browser sessions, debug captures, student spreadsheets, media and exercise
payloads were not downloaded. Only the derived, original metadata index is shipped.

## Measured catalogue

| Collection        | Declared items | Indexed items | Preserved source levels                         | Companion audio files |
| ----------------- | -------------: | ------------: | ----------------------------------------------- | --------------------: |
| `listening-basic` |            102 |           102 | `basic`: 34, `intermediate`: 34, `advanced`: 34 |                   102 |
| `listening-full`  |            204 |           204 | `unspecified`: 204                              |                   201 |
| `reading-basic`   |          1,232 |         1,232 | `a1-a2`: 198, `b1-b2`: 374, `c1-c2`: 660        |        Not applicable |
| `reading-full`    |            315 |           314 | `unspecified`: 314                              |        Not applicable |
| **Total**         |      **1,853** |     **1,852** | **306 Listening / 1,546 Reading**               |               **303** |

**Reading Test 105 is absent** at this commit. Listening Tests **83, 85 and 88** lack the canonical
companion `audio_N.mp3` file. Both observations come from paths in the tree, not from running the
upstream UI. A present file is not evidence that it is playable, complete, correctly labelled,
licensed, or available without login. Counts describe artefacts, **not questions or unique passages**.

### Selection rules

The TypeScript extractor accepts only these canonical, regular-file paths:

```text
Listening_102_Basic/{Basic,Intermediate,Advanced}/Lesson_N/index.html
Listening_204_FullTest/Test_N/Test_N.html
Reading_1232_Basic/frontend/data/{A1-A2,B1-B2,C1-C2}/lesson_NNN.json
Reading_315_FullTest/Test_N/Test_N.html
```

Matching folder/file test numbers must agree. Reading exercise numbers are three digits. JSON/JS
copies, `index.html` aliases of full tests, processed variants, strategies, DOCX files, assets and
all other paths are excluded. Companion audio is detected only as a regular blob at
`Lesson_N/audio.mp3` or `Test_N/audio_N.mp3`; the extractor never opens it.

Each record has a generic, original title and keeps the canonical path, byte size, blob SHA-1 and
commit-pinned GitHub provenance URL. IDs incorporate collection, source level and number:
`reading-basic-a1-a2-001`, `listening-basic-basic-001`, `reading-full-001`. Adding another record does
not renumber existing IDs; an upstream rename or relabelling can change an ID. Aliases are
structurally deduplicated, but semantic duplicates across different lessons are **not** detected.

## HTTP contract

All routes support `GET`, `HEAD`, open CORS and conditional ETag requests. No API key or account is
required. The existing `/v1/corpus` dataset and contract remain unchanged.

| Endpoint                   | Result                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| `/v1/practice`             | Manifest: source revision, rights, SHA-256, collection counts and statistics; no item array |
| `/v1/practice/collections` | Four collections, with declared and observed counts                                         |
| `/v1/practice/items`       | Filtered, paginated metadata in ascending ID order                                          |
| `/v1/practice/items/:id`   | One item, or `404` if the canonical source record is absent                                 |
| `/v1/practice/sample`      | Explicit-seed sample without replacement, in ascending ID order                             |

Search and sampling share these **intersecting, single-valued** filters:

| Parameter    | Values                                                                        |
| ------------ | ----------------------------------------------------------------------------- |
| `q`          | Case-insensitive substring of ID, generic title or source path                |
| `skill`      | `listening`, `reading`                                                        |
| `collection` | `listening-basic`, `listening-full`, `reading-basic`, `reading-full`          |
| `level`      | `basic`, `intermediate`, `advanced`, `a1-a2`, `b1-b2`, `c1-c2`, `unspecified` |
| `mode`       | `exercise`, `full-test` (upstream packaging, not official test certification) |
| `audio`      | `present`, `missing`, `not-applicable` (canonical file presence only)         |

- Search: `limit` 1–100 (default 20), `offset` 0–9,007,199,254,740,991 (default 0).
- Sampling: **required** `seed`, 1–256 Unicode code points after trimming; `count` 1–50 (default 5).
- Repeated, unknown and invalid parameters return the standard `400` envelope. Empty optional
  filters are treated as absent. Valid but incompatible filters return an empty population.
- Sampling returns `min(count, population)` items. Metadata explicitly reports `requested`,
  `returned`, `population`, effective `filters`, `seed`, `samplingAlgorithm`, `sourceCommit` and
  `datasetSha256`; it never fabricates extra items.
- Seeds are public GET parameters. Use non-identifying study labels, not personal/student data.

```bash
curl -fsS 'http://localhost:3000/v1/practice'
curl -fsS 'http://localhost:3000/v1/practice/items?skill=reading&level=c1-c2&limit=3'
curl -fsS 'http://localhost:3000/v1/practice/items?audio=missing'
curl -fsS 'http://localhost:3000/v1/practice/sample?seed=paper-example-v1&skill=listening&mode=full-test&count=5'
```

The last request selects `listening-full-018`, `listening-full-090`, `listening-full-095`,
`listening-full-126` and `listening-full-163` from a population of 204. This is a versioned golden
fixture in the test suite, not a claim that these are representative or pedagogically optimal tests.

The library is also usable offline after building the repository:

```js
import { practiceManifest, samplePractice } from './dist/index.js';

const manifest = practiceManifest();
const sample = samplePractice({
  seed: 'paper-example-v1',
  skill: 'listening',
  mode: 'full-test',
  count: 5,
});
console.log(
  manifest.integrity,
  sample.items.map((item) => item.id),
);
```

## Reproduce the index

Fetch the **pinned tree**, never a moving branch or a blob payload. This metadata API is public;
GitHub may apply its own unauthenticated API rate limit, independently of this API.

```bash
curl --fail --silent --show-error --location \
  'https://api.github.com/repos/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS/git/trees/52e6e832d6b3243205ebe3bb7fe901bbeca7f504?recursive=1' \
  --output /tmp/practice-tree.json
npm ci
npm run data:practice -- /tmp/practice-tree.json /tmp/practice.json
cmp data/practice.json /tmp/practice.json
npm run validate
```

The extractor rejects wrong-snapshot or truncated trees, duplicate paths, malformed canonical blob
metadata, symlinks and invalid lesson numbers. It uses no network calls and has no wall-clock or
locale dependency. CI repeats the pinned-tree extraction and byte comparison. The original raw tree
is not committed; fixtures use synthetic metadata without upstream payloads or secrets.

### Fingerprint and sampling protocol

`integrity.value` is the SHA-256 of the **UTF-8 encoding of `JSON.stringify(items)`**, with items in
ascending ID order and fields in the generator's insertion order. This is an explicitly defined
serialisation, **not** RFC 8785 canonical JSON and **not** the hash of the pretty-printed JSON file.
Metadata-only changes outside `items` are not covered by this digest; archive the complete manifest,
source commit and software commit too.

```bash
node --input-type=module -e '
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const index = JSON.parse(readFileSync("data/practice.json", "utf8"));
const digest = createHash("sha256").update(JSON.stringify(index.items)).digest("hex");
if (digest !== index.integrity.value) throw new Error("Checksum mismatch");
console.log(digest);
'
```

The API verifies the digest on first load and freezes the shared records. Clearing the dataset cache
forces a fresh load and verification. Sampling uses the existing FNV-1a hash over JavaScript UTF-16
code units, mulberry32, partial Fisher–Yates and ascending selected indices, identified as
`fnv1a32-mulberry32-partial-fisher-yates-v1`. It is a deterministic convenience sampler, not a
cryptographic randomisation service, an adaptive tutor or a validated assessment instrument.

## Rights and limitations

The project's CC BY 4.0 licence covers its original metadata compilation only. It does **not**
relicense the upstream code, exercises, dictionary material or media. Provenance URLs are audit
references, not a mechanism to bypass upstream access controls. Obtain permission independently
before using source exercises in teaching, a study or model training. This catalogue is deliberately
not added to the legacy `/v1/resources` list of free/no-login preparation resources.

For research reporting, release archiving and honest scholarly discoverability, see
[the research workflow](RESEARCH-WORKFLOW.md). This feature supplies reproducible metadata, not
experimental evidence of IELTS band improvement or a promise of Google Scholar indexing/citations.

[upstream]: https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS/tree/ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c
[summary]: https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS/blob/ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c/Docs/PROJECT_SUMMARY.md
[plan]: https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS/blob/ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c/Reading_1232_Basic/IELTS-Reading-1232-Plan.md
[generator]: https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS/blob/ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c/Tools/generate_plan.py
[indexes]: https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS/blob/ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c/Tools/generate_indexes.py
[integrity]: https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS/blob/ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c/Tools/verify_integrity.py
