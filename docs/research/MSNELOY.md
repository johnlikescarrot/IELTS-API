# Source review: msneloy/IELTS and original Task 1 data practice

Reviewed on **5 September 2026**. This is a repository case study and design rationale, not an
IELTS validation study, a licensed learner corpus, or a claim about learning gains.

## Snapshot and review boundary

- Repository: [msneloy/IELTS](https://github.com/msneloy/IELTS).
- Commit: [`db1064c36b6435b8a23adaf8e74c858476c38812`](https://github.com/msneloy/IELTS/commit/db1064c36b6435b8a23adaf8e74c858476c38812), dated 1 October 2022.
- Corresponding **tree object**: `1a4de7132e4e0a7e63908f322bbb177393841d63`. Commit and tree IDs
  are deliberately recorded separately.
- Full recursive manifest: [`data/msneloy-tree.json`](../../data/msneloy-tree.json), 627 entries:
  **557 blobs and 70 directories**, with `truncated: false`.
- Derived accounting: [`data/msneloy-audit.json`](../../data/msneloy-audit.json), covering
  **3,115,412,304 bytes** (decimal bytes, not compressed download size).
- No application source, package manifest, test suite or licence file was found in the snapshot.
  GitHub reports no programming languages. A public repository is not a grant of reuse rights.

The review inventoried **every path, blob ID and byte size**. All 28 source-text files (49,266
bytes, including the two oddly named writing files) were read. All 48 non-audio blobs were
retrieved for inspection and verified against Git's `SHA1("blob " + byteLength + NUL + contents)`;
this included the seven assignment figures and text extraction from all twelve PDFs (40 pages).
The 509 audio files were inventoried **only**: they were not listened to, transcribed or analysed for
content, duration, completeness or listening-test validity. There is no executable upstream
application to run or port. Downloaded text, images and PDFs are not committed or served by the API.

The non-audio inspection informed the qualitative observations below; only manifest accounting is
automatically reproduced by the audit command. It does not reproduce a human reading of a PDF,
infer essay boundaries or assess students.

## Whole-repository accounting

| Section                    |   Blobs |             Bytes | Interpretation                                          |
| -------------------------- | ------: | ----------------: | ------------------------------------------------------- |
| Repository root            |       2 |                69 | Nearly empty README and Git text-normalisation settings |
| `Academic Reading Samples` |      12 |         2,072,987 | Sample-task PDFs, not twelve complete Reading tests     |
| `Assignments`              |      33 |           799,156 | 26 source-text files and seven figures                  |
| `CAMBRIDGE IELTS 1 TO 17`  |     237 |     1,905,582,862 | 235 MP3s, one WAV and one collection image              |
| `combo`                    |     215 |       813,733,751 | 195 MP3s and 20 WMAs                                    |
| `ptp 123`                  |      58 |       393,223,479 | MP3 practice tracks                                     |
| **Total**                  | **557** | **3,115,412,304** | All blobs accounted for                                 |

Formats: 488 MP3, 20 WMA, one WAV, twelve PDF, 25 Markdown, six JPG, one JPEG, one PNG,
one file whose literal final suffix is `.11`, and two extensionless files. There are **509 audio
files** (91.4% of blobs), not 509 independent tests. All 557 Git blob IDs are distinct; this only
rules out byte-identical Git blobs, not repeated recordings, re-encodings or overlapping passages.

The large audio folders contain Cambridge-volume tracks and collections labelled grammar,
vocabulary, trainer, instant practice, official IELTS and practice-test-plus. Their names do not
establish ownership, authenticity or complete coverage. The directory labelled “1 TO 17” even has a
`Cambridge 18` subdirectory containing an image, not a set of volume-18 recordings.

### Reading PDFs: file labels are not a clean item schema

The twelve filenames cover flow-chart completion, identifying information, matching features,
matching headings, matching sentence endings, single- and multiple-answer multiple choice, note
completion, sentence completion, two summary-completion variants, and table completion. These are
variants of the existing `/v1/question-types` taxonomy, not twelve new canonical families.

The PDFs contain passages, instructions and answer pages, including visible third-party copyright
notices. Some passages recur across task types. There are also structural anomalies: the
matching-sentence-endings file labels its questions 1–3 but its answer page 4–6; the note-completion
file includes a separate matching-endings question block unrelated to its note-completion passage.
Consequently, neither filenames nor the presence of an answer page justify importing these as a
clean, automatically scored item bank. No passages, questions or answer keys are republished here.

### Writing and grammar: files are not independent, scored essays

The 26 assignment text files consist of:

- one grammar-exercise solution file;
- one list of eight Task 2 prompts;
- twenty Task 1 response files;
- four Task 2 response files, two of which contain multiple essays (eight and three respectively).

Manual segmentation gives **33 apparent writing responses**: twenty Task 1 and thirteen Task 2.
This is a descriptive count, **not** a machine-extracted or independently validated learner dataset.
Authors, tasks and feedback are repeated; treating each file as one independent essay is wrong.
A Markdown-extension-only scan misses two Task 1 responses (`emon` and `pranto.md 22.08.11`).
Some files include headings, reported word counts, informal feedback and speculative band comments.
Those are not examiner labels and must not become training targets or ground truth.

| Task 1 family        | Response files | Prompt figures |
| -------------------- | -------------: | -------------: |
| Line graph           |              4 |              1 |
| Bar chart            |              2 |              1 |
| Pie charts           |              3 |              1 |
| Table                |              2 |              1 |
| Map comparison       |              3 |              1 |
| Manufactured process |              3 |              1 |
| Natural process      |              3 |              1 |
| **Total**            |         **20** |          **7** |

Qualitative issues visible across the responses include confusing shares with amounts, expressing
percentage-point differences as relative percentage changes, over-interpreting missing bars,
calling a non-monotonic series a continuous increase, adding unsupported explanations, reversing
map directions or process relations, and interpreting a cycle as a terminal sequence. These are
**design observations, not prevalence estimates**. We do not attach scores or mistake labels to
named people, redistribute their writing, or assert permission to train on it.

## What changed in IELTS API

The existing API already has Task 1 family guidance and a surface essay profiler. More lexical
hints would not check whether a candidate has understood a figure. The new layer therefore supplies
**seven independently authored Task 1 stimuli** and **21 data-literacy checks**:

| Exercise                | Family               | Main reading check                                          |
| ----------------------- | -------------------- | ----------------------------------------------------------- |
| `w1-library-visits`     | Line graph           | Units, absolute change and non-monotonic trends             |
| `w1-cycle-rentals`      | Bar chart            | Explicit `null` (not reported) versus a reported zero       |
| `w1-arts-income`        | Pie charts           | Percentage points and unknown absolute totals               |
| `w1-digital-membership` | Table                | Denominators, counts versus shares and weighted aggregation |
| `w1-meadow-square`      | Maps                 | North-up positions, changed and unchanged features          |
| `w1-bottle-refill`      | Manufactured process | Ordering, a linear endpoint and unspecified durations       |
| `w1-flowering-cycle`    | Natural process      | Recurrence, ordering and limits of the model                |

Every scenario, numeric series, diagram label, checklist, question and explanation is original to
this project. None is a paraphrase of an upstream learner essay or a redrawing of an upstream
figure. The natural-process diagram is an explicitly simplified teaching model, not an empirical
biological dataset. Original data is available under CC BY 4.0; this licence does **not** extend to
the source collection.

### Contract and reproducibility

- `GET /v1/practice/writing`: `kind`, `q`, `limit` (1–100, default 20), `offset` (0–1000,
  default 0). Filters are conjunctive; order follows the seven families listed above.
- `GET /v1/practice/writing/:id`: JSON stimulus, checklist, relative SVG URL and questions.
- `GET /v1/practice/writing/:id/figure`: self-contained `image/svg+xml`, not a JSON envelope.
  Text is XML-escaped, the SVG has a title and full-data description, and it loads no scripts,
  fonts, images or other external resources. The JSON stimulus is an alternative for clients
  that cannot render SVG. `null` observations are not silently plotted as zero or joined across.
- `GET /v1/practice/writing/:id/check?question=q1&answer=a`: checks one of three option IDs,
  returning the correct ID, explanation and RFC 6901 evidence pointers into the public stimulus.
  Exercise, question and answer identifiers are case-insensitive. Unknown exercises return 404;
  invalid, missing or repeated check parameters return 400.

The stimulus routes omit the answer key. Keys are not secrets: the source and feedback endpoint
intentionally publish them for self-study. This is not a secure testing platform. Checking is
stateless and accepts **no essay body**; it neither stores writing nor produces IELTS bands.
Correctness means agreement with the displayed data, not proficiency in writing English.

The [official Academic Writing specification](https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-writing)
was checked on the review date: Task 1 requires at least 150 words in about 20 minutes and assesses
connected writing about supplied visual information. The multiple-choice checks are a teaching aid
**before or after** that writing activity, not part of the IELTS exam format.

Archive the exercise ID, stimulus revision (`1` initially), API version, code commit, JSON and SVG
when using these stimuli in a study. Responses are deterministic within that version. Any change
to data or keys must increment `WRITING_EXERCISE_REVISION`; future versions need not return old
stimuli. The generated SVG uses seven deliberately bounded layouts, enforced by integrity tests;
it is not a general-purpose charting library.

## Reproduce the manifest audit

No credentials or network are needed for the committed snapshot:

```bash
npm ci
npm run data:source-audit -- data/msneloy-tree.json /tmp/msneloy-audit.json
cmp data/msneloy-audit.json /tmp/msneloy-audit.json
npm test
```

To independently retrieve the pinned tree (GitHub's public API is rate-limited but needs no key):

```bash
curl -fsSL \
  'https://api.github.com/repos/msneloy/IELTS/git/trees/1a4de7132e4e0a7e63908f322bbb177393841d63?recursive=1' \
  -o /tmp/msneloy-tree.json
npm run data:source-audit -- /tmp/msneloy-tree.json /tmp/msneloy-remote-audit.json
cmp data/msneloy-audit.json /tmp/msneloy-remote-audit.json
```

The TypeScript auditor rejects a wrong tree ID, truncation, missing/invalid sizes, unsafe byte
totals, unsupported entry types, non-canonical paths and duplicate paths. It classifies all blobs,
not just the useful subset, and checks file/byte accounting in tests. Its SHA-256 fingerprints the
sorted normalised metadata (including directories), not source contents. It trusts GitHub's tree
response; a SHA field alone is not cryptographic verification of that response. URL fields and
entry ordering do not affect the report. CI compares a fresh pinned-tree audit against the same
committed report; it never follows `main` or downloads the 3.1 GB audio collection.

The original bank, renderer, handlers, auditor and TypeScript audit CLI are all inside the per-file
100% statement/branch/function/line coverage gate. Tests independently check numeric answers,
pie totals, null-versus-zero handling, process topology, map changes, evidence pointers, XML
escaping, all answer choices, error paths and the OpenAPI contract. Coverage establishes execution,
**not** pedagogical validity or correctness by itself.

## Research limitations and citation

This convenience sample is small, old, concentrated among repeated contributors and unlicensed.
No selection procedure supports generalising its mistake patterns to the IELTS population.
There are no reliable proficiency labels or controlled pre/post outcomes. Original exercises have
not been calibrated, field-tested for learning gains or reviewed by IELTS examiners. They should
not be used to infer candidate bands, admissions decisions, error frequencies or test difficulty.

Useful future evaluation would recruit consenting participants, use blinded human ratings and
publish the protocol, stimulus revisions, outcome measures and uncertainty. Public accessibility
of learner writing does not replace consent or ethics review.

Cite the exact software version/commit using [`CITATION.cff`](../../CITATION.cff), and credit the
pinned upstream collection when discussing this source review. There is **no verified DOI asserted
for this update**, no claim that the draft paper has been published or indexed by Google Scholar,
and no guarantee of citation counts. A real archival DOI must be obtained and verified before it
is added to the metadata. Access to the API is never conditional on citing it.
