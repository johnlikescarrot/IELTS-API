# Research notes: from open file dumps to citable IELTS datasets

This document records how the datasets behind the IELTS API were derived. It is written so that a
reviewer can reproduce, criticise or extend every step.

Seven parts, five upstream collections:

| Part                                                                            | Upstream collection                                                                                   | Snapshot                       | What it yields                                                                                                         |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| [Part I](#part-i--the-research-corpus)                                          | [`zhengyishiming/IELTS`](https://github.com/zhengyishiming/IELTS)                                     | commit `a9e2d6c9`, 404 blobs   | the vocabulary dataset and the corpus index                                                                            |
| [Part II](#part-ii--the-practice-test-collection)                               | [`ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS`](https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS) | commit `ba7a0f2b`, 6,309 blobs | the question-type taxonomy and the practice-test structure and readability index                                       |
| [Part III](#part-iii--the-analysis-toolkit)                                     | — (analyses user-supplied text against Parts I-II)                                                    | —                              | the readability analyser, the essay profiler and the study planner                                                     |
| [Part IV](#part-iv--the-study-materials-collection-and-the-response-frameworks) | [`Oxidaner/ielts`](https://github.com/Oxidaner/ielts)                                                 | commit `738c6082`, 2,385 blobs | the study-materials index and the response-framework taxonomy                                                          |
| [Part V](#part-v--the-grey-literature-archive)                                  | [`msneloy/IELTS`](https://github.com/msneloy/IELTS)                                                   | commit `db1064c3`, 557 blobs   | the grey-literature archive index: Cambridge 1-18 listening audio, official sample tasks and marked learner essays     |
| [Part VI](#part-vi--the-raw-score-conversion-tables)                            | - (reconstructed from published anchors; field survey of a live mock-exam platform)                   | -                              | the validated raw-score-to-band conversion tables and the raw-score endpoints                                          |
| [Part VII](#part-vii--the-mock-exam-test-centre)                                | [`wanli4473/yysd-testcenter`](https://github.com/wanli4473/yysd-testcenter)                           | commit `0956ea37`, 3,713 blobs | the mock-exam test-centre index: paper catalogue, Cambridge holdings, hand-tagged question taxonomy, score calibration |

None of the collections is redistributed. All are indexed, measured and cited.

## Part I — the research corpus

**Corpus snapshot:** commit `a9e2d6c9a070eecea6ffaa6f15b2a00c1c7b938c` (2 September 2024, "Add files
via upload"), 78 commits, single branch `main`, 404 blobs, no tags, no licence file.

### 1. What the corpus actually contains

The repository is a flat dump of study material — one directory, 404 files, no code and no
metadata. Fetching the tree through the GitHub API and classifying by file type gives:

| Format                              | Files |
| ----------------------------------- | ----: |
| `.rar` (mostly multipart archives)  |   244 |
| `.epub`                             |    54 |
| `.pdf`                              |    52 |
| `.mp3`                              |    19 |
| `.mobi`                             |     9 |
| `.azw` / `.azw3`                    |     6 |
| `.mp4`                              |     3 |
| `.txt`                              |     3 |
| `.xlsx`                             |     2 |
| `.zip`                              |     2 |
| `.m3u`                              |     2 |
| other (`gds`, `jpg`, `php`, `docx`) |     4 |

The decisive observation is that **the corpus is not topic-homogeneous**. Keyword classification of
file names puts the 404 files into three groups:

1. **Semiconductor and micro-fabrication textbooks** — lithography, GaN HEMT processes, power
   devices, MCU industry reports (the single largest group, and the reason most `.rar` multipart
   archives exist).
2. **Music and media** — Chinese pop MP3s, IPTV playlists (`.m3u`), concert rips.
3. **Cryptocurrency** — _Mastering Bitcoin_ (English and Chinese), NFT guides, virtual-currency
   investment books.

Only **76 files (18.8%)** are IELTS or English-learning material; they account for 713 MB. That ratio
is the first contribution of this project: an unfiltered crawler would treat a semiconductor
textbook as IELTS training data.

### 2. The IELTS-relevant subset

The 76 relevant files were classified by skill using ordered keyword rules over the file names
(first match wins, so `ielts-prep` acts as the catch-all for IELTS material). The result is a
usable picture of what self-published IELTS corpora contain:

| Category                 | Files |     | Skill         | Files |
| ------------------------ | ----: | --- | ------------- | ----: |
| `ielts-writing`          |    14 |     | writing       |    17 |
| `english-reading`        |    17 |     | reading       |    20 |
| `english-reference`      |    11 |     | reference     |    11 |
| `ielts-vocabulary`       |     9 |     | vocabulary    |     9 |
| `ielts-speaking`         |     8 |     | speaking      |     9 |
| `ielts-prep`             |     4 |     | general       |     4 |
| `ielts-grammar`          |     4 |     | grammar       |     4 |
| `ielts-reading`          |     3 |     | listening     |     1 |
| `english-writing`        |     3 |     | pronunciation |     1 |
| `ielts-listening`        |     1 |     |               |       |
| `english-pronunciation`  |     1 |     |               |       |
| `english-ielts-adjacent` |     1 |     |               |       |

Two findings shaped the API:

- **Writing dominates; listening is nearly absent.** The single listening item
  (`雅思听力1000词`, 758 KB) is a vocabulary list, not audio. Any IELTS resource built from this
  corpus inherits that bias, so this API does not claim to cover listening comprehension.
- **Vocabulary is the only structured asset.** Everything except `1-22yas.xlsx` is prose, images or
  audio inside a proprietary container. Extracting clean data from 244 multipart `.rar` files of
  scanned textbooks is not a reproducible operation, and the files are third-party copyrighted
  material. They are therefore indexed (metadata only) and never redistributed.

### 3. The vocabulary dataset

`1-22yas.xlsx` (1,230,016 bytes) is the one immediately machine-readable artefact: an Office Open XML
workbook with 22 worksheets (`Chapter01` … `Chapter21`, `Sheet22`), one per Cambridge IELTS volume,
sharing a single 29,624-entry string table. Each sheet has the columns
`Number | Words | Phonetic Symbol | Explanation | Notes`; sheets 5-22 swap the `Explanation` and
`Notes` columns, so the extractor resolves columns by header rather than by position.

Extraction (`scripts/extract_vocabulary.py`, standard library only):

1. Read the shared-string table, then each worksheet, resolving column names from the header row.
2. NFC-normalise and whitespace-collapse every cell.
3. **De-duplicate** headwords case-insensitively (4,310 occurrences collapse to 4,174 unique
   headwords). Where a headword recurs, the volumes are merged and the longest gloss is kept, so a
   word keeps its richest definition instead of the first one encountered.
4. **Split senses.** 3,557 of 4,174 glosses are WordNet-style concatenations of part-of-speech-tagged
   senses (`n. ... v. ... adj. ...`). These are split on `(n|v|vt|vi|adj|adv|pron|prep|conj).`
   boundaries into a typed `senses` array; the first sense becomes the entry's `partOfSpeech` and
   `definition`. 2,980 entries (71%) are polysemous, with a mean of 4.08 senses.
5. **Normalise phonetics** to slash-delimited transcriptions (4,172 of 4,174 entries carry one).
6. **Keep morpheme hints** where published — 164 entries carry pedagogical etymologies such as
   `hydro(water);gen(create)`, which are useful for morphology-aware NLP work.
7. Emit stable identifiers (`w00001` … `w04174`) assigned after sorting by headword, so identifiers
   never move between releases.

| Property                                    |                        Value |
| ------------------------------------------- | ---------------------------: |
| Unique headwords                            |                        4,174 |
| Occurrences                                 |                        4,310 |
| Cambridge IELTS volumes                     |                         1-22 |
| With phonetic transcription                 |                        4,172 |
| With morpheme hints                         |                          164 |
| Polysemous entries                          |                        2,980 |
| Mean senses per entry                       |                         4.08 |
| Noun / verb / adjective / adverb / untagged | 2,547 / 521 / 436 / 53 / 617 |

CI re-derives the dataset from the upstream blob and fails the build if the committed JSON differs,
so the published numbers cannot silently drift.

### 4. What the API adds, and what it deliberately does not

The API publishes **metadata only** for the 76 indexed files: path, normalised title, category,
skill, format, size, blob SHA-1 and a public URL. No upstream binary is mirrored. The upstream files
are third-party copyrighted material; indexing their metadata is a descriptive act and is published
under CC BY 4.0 with attribution, while the files themselves stay with their owners.

The value added by this project is therefore in the _derived_ layer, all of it original work:

- the normalised, sense-split, volume-linked vocabulary dataset;
- condensed, original-language band descriptors (the official descriptors are not reproduced: a
  paraphrase keeps the artefact redistributable and citing the official text remains the researcher's
  obligation, which the API states on every page);
- indicative score concordances compiled from the providers' published tables, with provenance and a
  caveat in every response;
- original Writing and Speaking task banks modelled on the question families that recur in the
  corpus;
- a catalogue of preparation resources restricted to ones that are free **and** require no login.

### 5. Threats to validity (Part I)

- **Provenance of the glosses is unknown.** The workbook's definitions are short dictionary-style
  glosses of unverifiable origin; they are republished as-is and should be treated as a convenience
  layer, not as an authoritative lexical resource.
- **Phonetics are inconsistent.** Transcriptions mix IPA conventions across volumes and only two
  entries lack one entirely; they are published unmodified rather than silently "corrected".
- **File-name classification is heuristic.** A title such as _IELTS Grammar Masterclass 8.5_ is
  unambiguous, but the catch-all `ielts-prep` bucket absorbs four general books whose dominant skill
  is a matter of opinion. The rules are published in `scripts/extract_corpus.py` and every item keeps
  its raw path so a reviewer can reclassify.
- **Band descriptors are paraphrases.** They are calibrated for teaching and for machine-readable
  lookup, not for official scoring.
- **Concordances are indicative.** Providers revise their tables, and institutions apply their own.

### 6. Reproducing Part I

```bash
curl -sL "https://api.github.com/repos/zhengyishiming/IELTS/git/trees/main?recursive=1" -o tree.json
python3 scripts/extract_corpus.py tree.json data/corpus.json

curl -fsSL -H "Accept: application/vnd.github.v3.raw" \
  "https://api.github.com/repos/zhengyishiming/IELTS/git/blobs/d66fded8b74057a96a677eb25d9b9f7b39965ce3" \
  -o 1-22yas.xlsx
python3 scripts/extract_vocabulary.py 1-22yas.xlsx data/vocabulary.json
```

The commit SHA recorded in `data/corpus.json` identifies the exact snapshot; re-running against a
different commit is expected to change the item count and the coverage ratio.

## Part II — the practice-test collection

**Collection snapshot:** [`ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS`](https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS),
commit `ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c` (3 July 2026), 60 commits, 6,309 blobs.

### 7. What the collection contains

Where Part I is a flat dump of books, this collection is an operating study product: three practice
corpora, a static web front end per item, and a Google Apps Script login that gates the whole thing
behind a 1,599,000 VND annual subscription. Its structure is:

| Directory                 | Items                             | Per-item files                                                              |
| ------------------------- | --------------------------------- | --------------------------------------------------------------------------- |
| `Reading_315_FullTest/`   | 315 full academic reading tests   | `Test_N.json`, `Test_N.html`, `Test_N.docx`, figures, `strategies.json`     |
| `Listening_204_FullTest/` | 204 full listening tests          | `Test_N.json`, `index.html`, `audio_N.mp3` (≈20 MB each), `strategies.json` |
| `Reading_1232_Basic/`     | 1,232 CEFR-graded reading lessons | `lesson_NNN.json` plus a shared single-page front end                       |

Three properties of the collection decide what can responsibly be published from it:

1. **The test content is not the publisher's to license.** The full tests are transcriptions of
   Cambridge-style examination material, and the repository ships a committed `.env`, a committed
   `node_modules/` and hard-coded credentials — it is a scrape, not a licensed corpus. No passage,
   question, answer key, transcript or recording is therefore redistributed here.
2. **The structural annotation is machine-readable and genuinely useful.** Every JSON item carries
   sections, per-question type labels and question-number ranges. That layer is factual metadata
   about the item, and aggregating it produces information that exists nowhere else in public: an
   empirical question-type distribution over 27,225 IELTS practice questions.
3. **The annotation vocabulary is inconsistent.** 65 distinct free-text labels are used for what are,
   in the published task descriptions, 13 task families (`diagram_labelling`, `diagram_labeling`,
   `diagram_label_completion`, `diagram_completion`, `labeling`, `map_labeling`, `map_labelling`,
   `map_matching`, `plan_labeling` and `matching_diagram` are all the same task). Normalising them is
   the first contribution of Part II.

### 8. The question-type taxonomy

`scripts/extract_practice_tests.py` maps every upstream label onto the canonical taxonomy served by
`/v1/question-types`, which follows the eleven Cambridge reading task families plus the two
listening-only families (generic matching, and plan/map/diagram labelling). The mapping is published
in full in `data/practice-tests.json` under `stats.rawLabels`, with the frequency of each raw label,
so a reviewer can re-map any decision. The label spread per canonical type is itself a measure of how
noisy free-text annotation of item types becomes at scale:

| Canonical type                    | Upstream labels merged | Questions | Share |
| --------------------------------- | ---------------------: | --------: | ----: |
| `summary-completion`              |                     20 |     7,435 | 27.3% |
| `multiple-choice`                 |                      1 |     5,160 | 19.0% |
| `true-false-not-given`            |                      3 |     3,522 | 12.9% |
| `matching-information`            |                      7 |     1,985 |  7.3% |
| `yes-no-not-given`                |                      2 |     1,981 |  7.3% |
| `matching`                        |                      1 |     1,766 |  6.5% |
| `matching-headings`               |                      1 |     1,467 |  5.4% |
| `sentence-completion`             |                      3 |     1,320 |  4.8% |
| `short-answer`                    |                      4 |     1,075 |  3.9% |
| `matching-features`               |                      6 |       698 |  2.6% |
| `diagram-label-completion`        |                     10 |       493 |  1.8% |
| `multiple-choice-multiple-answer` |                      4 |       178 |  0.7% |
| `matching-sentence-endings`       |                      3 |       145 |  0.5% |

The distribution differs sharply by paper, which is the pedagogically interesting result: completion
tasks dominate listening (58.5% of 8,007 listening questions), while reading spreads across
identification and matching tasks (18.3% True/False/Not Given, 17.2% multiple choice, 14.3%
completion, 10.3% matching information, 10.3% Yes/No/Not Given). A candidate who trains only on
reading material therefore practises almost none of the task family that accounts for the majority of
the listening paper.

Question counts are parsed from the upstream `q_numbers` labels, which are free text (`7`, `1-5`,
`14 - 18`, `Questions 27-30`): ranges are expanded, lists are counted, unparseable labels count as
one question. 365 of the 470 indexed full tests come to exactly 40 questions, which is the expected
value for a complete paper and the main evidence that the parser is sound.

### 9. Passage readability

For every item with a written passage, the extractor computes running words, sentences, distinct
word forms, mean sentence length, mean syllables per word, type-token ratio, Flesch Reading Ease and
the Flesch-Kincaid grade level. Only summary statistics are published, never the text. Syllables use
the standard vowel-group heuristic with a silent-final-`e` correction, which is what the formulae
were calibrated on; readability is deliberately **not** computed for listening items, whose
`passage_or_context` fields hold timestamped transcript fragments and rubric text rather than prose.

| Group                  | Items | Mean words | Mean Flesch Reading Ease | Mean Flesch-Kincaid grade | Mean type-token ratio |
| ---------------------- | ----: | ---------: | -----------------------: | ------------------------: | --------------------: |
| Graded lessons `A1-A2` |   198 |        253 |                     70.2 |                       5.8 |                 0.543 |
| Graded lessons `B1-B2` |   374 |        242 |                     26.0 |                      13.9 |                 0.633 |
| Graded lessons `C1-C2` |   660 |        275 |                      5.0 |                      17.8 |                 0.644 |
| Full reading tests     |   269 |      2,642 |                     43.5 |                      12.6 |                 0.388 |

Two findings follow, and both are usable by anyone building graded material:

- **The CEFR ordering holds, but the calibration does not.** Reading ease falls monotonically across
  the three graded tiers, so the tiers are ordered correctly. Their absolute difficulty, however, is
  far above the CEFR labels: a B1-B2 tier averaging Flesch-Kincaid grade 13.9 is undergraduate prose,
  not independent-user prose, and the C1-C2 tier at grade 17.8 is harder than the real reading papers
  it prepares candidates for (grade 12.6). Generated "graded readers" over-shoot their target level,
  and they over-shoot it hardest in the middle of the scale.
- **Length, not lexical density, separates practice lessons from real papers.** The full tests average
  2,642 words against roughly 250 for a graded lesson, but their type-token ratio is _lower_ (0.388
  against 0.54-0.64) — the long passages recycle vocabulary, and short lessons cannot train the
  stamina the real paper demands, however hard their sentences are.

### 10. What the API publishes from Part II

- `/v1/tests`, `/v1/tests/stats`, `/v1/tests/items`, `/v1/tests/:id` — 1,702 indexed items
  (269 reading full tests, 201 listening full tests, 1,232 graded lessons; 97.3% of the upstream
  items that ship machine-readable structure) with structure, normalised question types, asset
  availability, readability statistics, upstream path, blob SHA-1 and permalink.
- `/v1/question-types`, `/v1/question-types/:id` — the 13-family taxonomy with original strategy
  guidance, the traps each family sets, and the observed frequencies above.
- `/v1/topics/themes` — the 50 recurring exam themes the collection organises its material around,
  in 11 groups, with original keyword sets.

### 11. Threats to validity (Part II)

- **The upstream annotation is not authoritative.** Type labels and question ranges were written by
  the collection's own extraction scripts, not by an examining board; the frequencies describe _this
  corpus_, which is a large convenience sample of practice material, not the live examination.
- **Normalisation merges genuine distinctions.** Folding `table_completion`, `note_completion`,
  `flow_chart_completion` and `fill_in_blank` into one `summary-completion` family follows the
  published task descriptions, but a study of gap-fill sub-types would need the raw labels, which is
  exactly why `stats.rawLabels` is published.
- **Readability formulae are proxies.** Flesch measures depend on sentence and syllable counting
  heuristics and ignore syntax, cohesion and topic familiarity; they order texts usefully but do not
  measure comprehension difficulty directly.
- **Partial coverage.** 46 reading and 3 listening test directories ship only HTML, so they are
  counted in the upstream totals but not indexed. One graded lesson is malformed JSON upstream and is
  skipped by the parser.
- **The snapshot is mutable.** The upstream repository has no tags and force-pushes are possible; the
  commit SHA and per-file blob SHA-1s recorded in `data/practice-tests.json` are what pin the
  analysis.

### 12. Reproducing Part II

```bash
curl -sL "https://api.github.com/repos/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS/git/trees/main?recursive=1" \
  -o tree.json

# Fetch only the structural JSON (the audio is ~4 GB and is not needed).
python3 - <<'FETCH'
import base64, json, urllib.request, re, pathlib
tree = json.load(open("tree.json"))["tree"]
patterns = (
    r"Reading_315_FullTest/Test_\d+/Test_\d+\.json$",
    r"Listening_204_FullTest/Test_\d+/Test_\d+\.json$",
    r"Reading_1232_Basic/frontend/data/[^/]+/lesson_\d+\.json$",
)
for node in tree:
    if node["type"] == "blob" and any(re.match(p, node["path"]) for p in patterns):
        with urllib.request.urlopen(node["url"]) as response:
            blob = json.load(response)
        target = pathlib.Path("upstream") / node["path"]
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(base64.b64decode(blob["content"]))
FETCH

python3 scripts/extract_practice_tests.py tree.json upstream data/practice-tests.json
```

The script is standard library only and deterministic: the same tree and the same files always
produce byte-identical output.

## Part III — the analysis toolkit

Part III adds the first capabilities that consume arbitrary text instead of publishing derived
metadata. Two analyser endpoints and a planner join the route table in 1.2.0; all three are pure
functions of their inputs plus the datasets already described, so their outputs inherit the
project-wide guarantees: deterministic, reproducible, versioned and archivable.

### 13. `/v1/tools/readability`: measuring any text with the corpus as reference

The readability endpoint reports Flesch Reading Ease and the Flesch-Kincaid grade level for a text
supplied in the query string, alongside the counts they are computed from. Tokenisation keeps
alphabetic tokens only (numerals and symbols are not words), keeping internal apostrophes and
hyphens (`don't`, `well-known` stay single tokens). Sentences are split on `.`, `!`, `?` and the
ellipsis character; repeated terminators end a single sentence, and an unterminated final stretch
counts as one sentence. Syllables are estimated with the standard vowel-group heuristic (maximal
`aeiouy` runs, minus one for a trailing silent `e`, never below one). The formulas are the 1948
originals cited in `CITATION.cff`.

The report closes with a corpus context: the group from
[`/v1/tests/stats`](#9-passage-readability) whose mean reading ease is closest to the text, with
the distance in points. This is what makes the endpoint useful for research rather than a toy: a
candidate essay scoring 40 lands between the full reading tests (43.5) and the `B1-B2` graded
lessons (26.0), which is exactly the kind of calibration statement the Part II analysis needed.

Texts are capped at 4,000 characters because the API is GET-only: the cap keeps percent-encoded
requests comfortably inside common HTTP header limits while still fitting any Task 2 essay.

### 14. `/v1/tools/essay-profile`: surface heuristics mapped to the descriptors

The essay profile measures the writing sample and maps the measurements onto hints phrased after
the four analytic criteria published at `/v1/bands/descriptors`. It is deliberately a surface
analyser — no model, no scoring, no claim to predict an examiner. Each measurement is standard:

| Measurement                | Definition                                                           |
| -------------------------- | -------------------------------------------------------------------- |
| Type-token ratio           | distinct lower-cased forms / running words                           |
| Guiraud's index (root TTR) | types / √tokens                                                      |
| Headword coverage          | share of tokens found in the Cambridge 1-22 headword list            |
| Long-word share            | share of tokens with three or more syllables                         |
| Sentence-length spread     | population standard deviation of sentence lengths in words           |
| Signposting density        | discourse markers per 100 words (fixed 19-marker list)               |
| Theme coverage             | themes whose keyword sets (Part II, §8) appear as whole-word matches |

Hints fire only at fixed, published thresholds — for example, lexical diversity is judged only
above 60 tokens, counts as a strength at a TTR of 0.55 or more and earns a warning below 0.42.
Every hint names its numbers, and the response repeats the disclaimer that hints are teaching
heuristics, not scores. Ranking themes by matched-keyword count (ties broken by occurrences, then
dataset order) is deterministic, so a corpus of essays profiles identically on every replica.

### 15. `/v1/study/plan`: composing the datasets into a schedule

The planner turns a target band (4.0-9.0), optional component scores, a weekly hour budget and a
vocabulary rate into a week-by-week schedule. Gaps (`target − current`, clipped at zero) are
weighted into weekly hours and rounded to 0.1 h; components without a query value default to
`target − 1.5` bands. Weeks are split into foundation (40%), practice (40%) and polish (remainder)
phases, the focus component rotates from the largest gap, and each week links to the endpoints
that supply its material: canonical question-type drills for reading and listening weeks
(`/v1/question-types`), level-calibrated graded lessons (`/v1/tests/items`, using the Part II
finding that the `C1-C2` tier is harder than the real papers), a Task 2 category and essay family
for writing weeks (`/v1/topics/writing`), a rotating part topic for speaking weeks
(`/v1/topics/speaking`), and two recurring themes per week (`/v1/topics/themes`). Full mocks are
scheduled quarterly with a final review in the last week.

Every random selection is seeded from the canonical input string, so identical requests produce
byte-identical plans; the endpoint is a scheduler, not a recommender, and it says so in `meta`.

### 16. Threats to validity (Part III)

- **Heuristics, not measurement.** Syllable estimation, tokenisation and the linker list are
  approximations; the readability formulas ignore syntax, cohesion and reader knowledge. They are
  published so results can be audited and criticised, which is the point.
- **The headword list is volume-derived.** Coverage against the Cambridge 1-22 list rewards words
  the volumes gloss, not "good vocabulary"; inflected forms that are not listed count as misses.
- **The thresholds are pedagogical, not empirical.** The TTR, coverage and signposting cut-offs
  encode published teaching guidance, not a calibration study against examiner-awarded bands.
- **The plan allocates, it does not optimise.** Gap-proportional hours assume equal returns per
  hour across components; research on score improvement rates would need longitudinal data the API
  does not hold.

### 17. Reproducing Part III

Nothing to re-derive: the analysers are code, and their behaviour is pinned by the test suite
(100% statement, branch, function and line coverage per file, as for the rest of the API).

## Part IV — the study-materials collection and the response frameworks

### 18. What the collection actually contains

The third upstream source, [`Oxidaner/ielts`][materials-repo], is a different kind of artefact from
the first two: not a publisher's dump or a practice-test app, but a _personal self-study repository_ —
the material one candidate actually aggregated between August 2025 and November 2025 while preparing
for the computer-delivered exam. At the indexed snapshot it holds 2,385 files (≈4.7 GB) in five
skill folders plus repository-level notes.

That provenance is exactly what makes it worth indexing. Commercial preparation material is curated
for sale; this collection is curated _for use_. Its shape is therefore evidence about which
preparation genres candidates rely on when nobody is marketing to them:

| Folder         | Files | Formats             | Dominant content                                                     |
| -------------- | ----: | ------------------- | -------------------------------------------------------------------- |
| 阅读 reading   | 1,593 | PDF, HTML, JS, JPG  | Saved reading-passage websites and "high-frequency" passage banks    |
| 听力 listening |   722 | PDF, MP3, DOCX, TXT | Practice books with audio, answer keys, scenario vocabulary, recalls |
| 作文 writing   |    27 | PDF, DOCX, JPG      | Essay templates, idea banks, sentence-pattern sheets, recall banks   |
| 口语 speaking  |     7 | MD, DOCX, PDF, ZIP  | Part 3 methodology notes, seasonal question banks                    |
| 经验 tips      |     2 | PDF                 | Post-exam experience write-ups                                       |

As with Parts I and II, none of it can be redistributed: most files are third-party commercial
materials collected without a licence, and the repository itself declares none. The API therefore
publishes a **metadata index only** — path, format, size, blob SHA-1, permalink and the category
assigned by the classification rules below.

[materials-repo]: https://github.com/Oxidaner/ielts

### 19. Classification rules

Every file is assigned one category by the first matching rule, evaluated against the lower-cased
full path; the skill facet comes from the top-level folder. The rules are published in
`scripts/extract_materials.py` and are deliberately lexical and ordered, so any item's category can
be re-derived by hand:

| Rule order | Category            | Matched by (examples)                               | Files |
| ---------: | ------------------- | --------------------------------------------------- | ----: |
|          1 | `answer-key`        | 答案, `keys_`, "answer"                             |    71 |
|          2 | `past-paper-recall` | 机经 ("jijing" — recalled exam content)             |     2 |
|          3 | `question-bank`     | 题库, 题卡, 题目, 真题, 新题, 保留题                |    64 |
|          4 | `vocabulary`        | 词汇, 替换, 词伙, 场景词                            |     7 |
|          5 | `idea-bank`         | 观点库                                              |     3 |
|          6 | `sentence-patterns` | 句式                                                |     1 |
|          7 | `template`          | 模板/模版, 速成, 宝典, chart-type guides (静态图…)  |    15 |
|          8 | `methodology`       | 方法论, 秘籍, 笔记, 经验, 情感模块, `roadmap`       |     9 |
|          9 | `link-list`         | 网站链接                                            |     1 |
|         10 | `repository-meta`   | `readme.md`                                         |     2 |
|         11 | `site-asset`        | `.js`, `.css`, `.ico` of saved websites             |    64 |
|         12 | `audio`             | `.mp3`, or a path under an 音频 (audio) folder      |   292 |
|          — | `practice-material` | default: articles, tests, worksheets, mock packages | 1,823 |

Thirty-one files are excluded entirely: 29 `.DS_Store` records and two `~$`-prefixed Microsoft Word
lock files. They are editor and operating-system noise, not study material, and are reported
separately in `stats.excludedFiles` so the totals reconcile:
`indexedFiles + excludedFiles = filesInRepository`.

### 20. The response-framework taxonomy

The collection's writing and speaking folders share a consistent implicit theory of preparation:
prompts are organised into _families_ (question banks), and each family is answered with a reusable
_response shape_ (templates, structures, methodology notes). The `/v1/frameworks` dataset makes that
second layer explicit and citable.

Twelve frameworks are published, all **original to this project** — the taxonomy was written for this
API after surveying the preparation genres above, and no upstream sentence is reproduced:

- **Writing Task 2** (6): `w2-thesis-led`, `w2-concession-rebuttal`, `w2-discussion-verdict`,
  `w2-weighing`, `w2-causal-chain`, `w2-sequenced-answers` — one per question family already served
  by `/v1/topics/writing` (`type` facet), with the concession–rebuttal shape broken out as its own
  framework because it is the variant markers reward on opinion prompts.
- **Speaking Part 2** (2): `p2-narrative-spine` (experience cue cards) and `p2-feature-highlight`
  (thing/place/person cue cards).
- **Speaking Part 3** (4): `p3-stance-and-support`, `p3-it-depends`, `p3-comparison-over-time`,
  `p3-criteria-evaluation` — the four recurring discussion moves of Part 3 questions.

Each framework carries ordered stages, each with a purpose, concrete moves and exemplar cue
language, plus three pitfalls that describe how the framework fails when misapplied. Frameworks
cross-reference the task banks (`questionTypes` ↔ `/v1/topics/writing`, `speakingParts` ↔
`/v1/topics/speaking`), so a client can move from prompt to plan in two calls.

### 21. Threats to validity (Part IV)

- **The collection is one candidate's.** n = 1 by design: the index documents what one learner
  collected, not a sample of what learners collect. The category distribution should be read as a
  case study, not an estimate.
- **Lexical classification is approximate.** File names are noisy (hash names, mixed languages,
  branding). The rules are published precisely so that misclassifications can be found and reported;
  the fallback category (`practice-material`) is the most common single label and the least specific.
- **Category sizes conflate genres.** A 300-page PDF and a one-line text file each count once.
  `indexedBytes` is published alongside counts so analyses can weight by size.
- **The frameworks are prescriptive, not empirical.** They formalise received preparation doctrine;
  they are not derived from an empirical study of high-scoring responses, and no such claim is made.
- **The snapshot is mutable.** The upstream repository is unlicensed and unversioned; the tree SHA
  and per-file blob SHA-1s recorded in `data/materials.json` pin the analysis. The index would need
  re-deriving after upstream changes.

### 22. Reproducing Part IV

```bash
curl -sL "https://api.github.com/repos/Oxidaner/ielts/git/trees/main?recursive=1" -o tree.json
python3 scripts/extract_materials.py tree.json data/materials.json
```

The script is standard library only and deterministic: the same tree always produces byte-identical
output. The continuous-integration workflow re-derives the index from the upstream tree on every run
and fails if the committed file disagrees.

## Part V — the grey-literature archive

_Upstream: [`msneloy/IELTS`](https://github.com/msneloy/IELTS), commit `db1064c3` (2 October 2022,
the repository's last commit), 557 blobs, 3.12 GB of file payload, no licence, an empty README. The
dataset is `data/archive.json`; the endpoints are `/v1/archive`, `/v1/archive/stats`,
`/v1/archive/volumes`, `/v1/archive/items` and `/v1/archive/:id`._

### 23. What the archive actually contains

The four collections indexed so far are, in different ways, curated: a vocabulary workbook, a
publisher's practice corpus, a candidate's organised notes. Part V indexes what preparation material
looks like **before** anyone curates it — a 5.4 GB working tree that one study group pushed to GitHub
as-is. Five top-level folders:

| Folder                     | Files | Payload | Canonical collection | Content                                                                                                                                             |
| -------------------------- | ----: | ------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CAMBRIDGE IELTS 1 TO 17`  |   237 | 1.91 GB | `cambridge-audio`    | listening audio for volumes 1-18 (plus one cover image)                                                                                             |
| `combo`                    |   215 | 0.75 GB | five companion sets  | audio of Grammar for IELTS (33), IELTS Trainer (33), Vocabulary for IELTS (49), "instant practice tests" (30, WMA), "official IELTS" materials (70) |
| `ptp 123`                  |    58 | 0.39 GB | `practice-test-plus` | audio of Practice Test Plus 1-3                                                                                                                     |
| `Academic Reading Samples` |    12 | 2.1 MB  | `reading-samples`    | the British Council "Sample Academic Reading" task PDFs                                                                                             |
| `Assignments`              |    33 | 0.8 MB  | `assignments`        | a teacher's marked student writing, dated August 2022                                                                                               |

Two details survive only because nobody cleaned the tree up, and both are recorded by the index:

- **the folder that miscounts itself** — `CAMBRIDGE IELTS 1 TO 17` actually contains volumes 1-18;
  volume 18 is present as a cover image and no audio at all. The volume table publishes the folder
  name verbatim next to the canonical volume number it resolves to;
- **duplicated vendor numbering** — the "official IELTS" folder holds both `01.mp3` and `1.mp3`
  (numbering restarts in two conventions), which is why 70 files describe roughly 35 tracks.

As everywhere in this API, the archive is third-party copyrighted material shared without a licence,
so the index publishes **derived, non-substitutive metadata and statistics only**: no audio, PDF
content, essay text or image is redistributed (§26 explains why statistics over essays are not
invertible into essays).

### 24. The media-archaeology table

`GET /v1/archive/volumes` publishes one row per Cambridge volume. Listening audio is the one part of
IELTS preparation that used to be physical, and the file names still show it:

| Volumes | Naming scheme    | Media era | Example file name                         | Tests recoverable?  |
| ------: | ---------------- | --------- | ----------------------------------------- | ------------------- |
|    1, 3 | `cassette-side`  | cassette  | `Casset-1/2.mp3`                          | no (4 tracks each)  |
|       2 | `cassette-side`  | cassette  | `1/2.MP3`                                 | no (4 tracks)       |
| 4,5,7-9 | `cd-track`       | CD        | `CD 1/8.MP3`                              | no (16 flat tracks) |
|       6 | `test-folder`    | CD        | `Test2/Test2-s1.mp3`                      | yes (tests 1-4)     |
|      10 | `flat-track`     | CD        | `CAMBRIDGE   12.mp3`                      | no (16 flat tracks) |
|      11 | `test-section`   | download  | `IELTS11_Test1_Section4.mp3`              | yes (tests 1-4)     |
|      12 | `test-section`   | download  | `Test 5 Section 1.mp3`                    | yes (tests 5-8)     |
|      13 | `cd-track-range` | CD        | `IELTS13-Tests1-4CD1Track_03.mp3`         | range only (1-4)    |
|      14 | `test-section`   | download  | `C14T2S3.mp3`                             | yes (tests 1-4)     |
|      15 | `test-section`   | download  | `IELTS15_test1_audio4.wav`                | yes (tests 1-4)     |
|      16 | `test-section`   | download  | `Test 1 Part 2 [@cambridgematerials].mp3` | yes (tests 1-4)     |
|      17 | `test-section`   | download  | `Camb 17 3-4.mp3`                         | yes (tests 1-4)     |
|      18 | `none`           | none      | `ielts.jpg`                               | no audio at all     |

Derived facts the table makes queryable:

- **14 of 18 volumes are complete** in the sense that matters for practice — sixteen tracks, i.e.
  four tests x four listening sections. Volumes 1-3 carry only four tracks each, and volume 18 none.
- **Test structure is recoverable in 7 volumes** (6, 11, 12, 14-17). Everywhere else the naming
  destroys it: a cassette side or a CD track number does not say which test it belongs to. This is a
  small, concrete instance of a general point — the test's structure survives only where the
  file-naming conventions encode it.
- **Grey provenance is visible and recorded.** Volumes 4 and 5 each contain a ripped vendor track
  (`...SAKIB BOOK CENTER (7).MP3`, a book-shop watermark), and every volume-16 file name carries
  `[@cambridgematerials]`, a Telegram channel credit. The index flags all three volumes.

### 25. The official sample tasks, measured

The twelve PDFs are the British Council's "Sample Academic Reading" series: one exemplar task per
question format. Each file name already names its task, so the index maps the twelve onto the
canonical taxonomy of Part II — eight distinct types, with the completion variants (flow-chart,
note, table, both summary modes) rolling up to `summary-completion` exactly as the practice corpus's
labels do. Three samples ship an answer key (`-and-key` in the file name).

The index also measures each sample. The text layer is extracted with a pinned `pypdf` (6.17.0); the
**passage** is everything before the first `Questions n-m` rubric, which makes the figures
comparable with the passage-level figures of Part II:

- Flesch Reading Ease 32.0-57.0, **median 41.5** — against a full-reading-test corpus mean of 43.5
  and graded-lesson means of 70.2 (A1-A2), 26.0 (B1-B2) and 5.0 (C1-C2). The official exemplars sit
  exactly at full-test difficulty; they are extracts of real tests, and the numbers agree.
- Flesch-Kincaid grade 9.5-14.8.
- Nine of the twelve state their reading part in the bracketed descriptive note (four Part 1, one
  Part 2, four Part 3); two state a topic without a part; the note text itself is never republished —
  only the parsed part number and topic phrase.

One measurement is deliberately **not** published: question counts. In these PDFs the text layer
scrambles question numbers (kerned digits swap positions — a "Questions 7-13" rubric can extract as
"Questions 7 - 6"), so any count would be unreliable, and a number that cannot be trusted is not
published. The same rule as in Part II: what cannot be measured cleanly is left `null`, visibly.

### 26. The learner assignment log

`Assignments/` is a teacher's folder: seven dated sub-folders (5-27 August 2022), each holding a
task prompt image and markdown essays by that study group's members. The index classifies all 33
files and publishes derived statistics per essay — never the essays:

- **24 essays** by four named learners (`emon` 7, `riad` 7 — the archive spells him `riad` and
  `riadul` interchangeably; the index normalises to `riad` — `pranto` 6, `mahmuda` 3) plus one
  unnamed essay, 7,458 words in total;
- **eight task types**: line-chart (4), bar-chart (2), pie-chart (3), table (2), map (3),
  man-made process (3), natural process (3) and Task 2 essay (4) — i.e. the complete Writing Task 1
  repertoire of Part I plus Task 2;
- **7 prompt images**, one answered grammar exercise and one ten-prompt Task 2 list;
- per essay: the same `readability()` statistics used across the API (words, sentences, sentence
  length, syllables, type-token ratio, Flesch Reading Ease, Flesch-Kincaid grade).

Why the statistics are non-substitutive: they are eleven aggregates per essay. Twenty-four essays
yield 264 numbers where the source holds 7,458 words; the aggregates cannot be inverted to
reconstruct a single sentence. Learner first names are retained because they are part of the public
upstream file paths — removing them would break provenance links; the API adds no personal data
beyond what upstream already publishes.

### 27. Threats to validity (Part V)

- **The archive is one study group's.** As in Part IV, n = 1 by design: the index documents what one
  group collected, not a sample of what groups collect.
- **Name-based classification is approximate.** Folder and file names are noisy (`CEMBRIDGE garamar
i e l t s` is Cambridge Grammar for IELTS). Every rule is published in
  `scripts/extract_archive.py`; misclassifications can be found and reported.
- **Bytes are not duration.** Audio size is published in bytes only. MP3 duration would need frame
  parsing and is bitrate-sensitive, so it is deliberately not estimated.
- **Structure inference trusts file names.** A mislabelled rip (e.g. `CD 2` files that actually
  carry test 3) would mislead the volume table. The table is honest about this: 7 of 17 audio
  volumes expose test structure at all, and the rest are visibly `null`, not guessed.
- **PDF text extraction is lossy.** The pinned `pypdf` extracts the text layer imperfectly (digit
  scrambling, occasional ligature loss); readability figures carry that noise. The passage boundary
  is the first `Questions n-m` rubric — a rubric mentioned inside a passage would truncate it.
- **Some "essays" hold several drafts.** Two files contain multiple drafts separated by hand-written
  markers (`essay-5 ------`), which inflates their word counts (max 2,479 words for one file). The
  statistics are per **file**, and this is stated here rather than silently corrected, because
  splitting drafts would require publishing the separators - text we do not redistribute.
- **Teacher margin notes remain in the text.** At least one file opens with `[Redo this one]`;
  light Markdown stripping does not remove bracketed notes, and lexical figures carry that noise.
- **The snapshot is mutable and unlicensed.** The upstream repository declares no licence; the
  commit SHA and per-file blob SHA-1s pin the analysis, but upstream deletion would orphan the
  permalinks. As with Parts I, II and IV, the index would need re-deriving after upstream changes.

### 28. Reproducing Part V

```bash
curl -sL "https://api.github.com/repos/msneloy/IELTS/git/trees/HEAD?recursive=1" -o tree.json
# The text statistics need only the ~4 MB of document blobs (sample PDFs and
# assignment text files); a full clone also works but is 5.4 GB.
python3 scripts/extract_archive.py tree.json ./upstream data/archive.json
```

`scripts/extract_archive.py` is standard library except for the pinned `pypdf` needed for the twelve
sample PDFs; the readability formulas are imported from `scripts/extract_practice_tests.py` so the
two datasets remain comparable by construction. The derivation is deterministic: the same tree and
blobs always produce byte-identical output. Continuous integration re-derives the index on every run

- it downloads the 38 document blobs by blob SHA, runs the extractor, and fails if the committed
  file disagrees - and then checks the index for internal consistency (facet totals, volume arithmetic,
  per-essay statistics).

## Part VI — the raw-score conversion tables

_Upstream: no upstream. Part VI is a reconstruction, validated against the figures published at
[ielts.org](https://ielts.org/take-a-test/your-results/ielts-scoring-in-detail) and compared against
a field survey of a working mock-exam platform,
[`wanli4473/yysd-testcenter`](https://github.com/wanli4473/yysd-testcenter). The dataset lives in
`src/data/rawScores.ts`; the endpoints are `/v1/scores/raw` and `/v1/scores/raw/tables`._

### 29. The table that everyone uses and nobody publishes

Listening and Reading are objectively marked out of 40 and converted to the nine-band scale by a
lookup table. That conversion is the single most frequently performed calculation in IELTS
preparation. It is also the one piece of the scoring system that the test partners do **not**
publish.

What ielts.org publishes is four numbers per paper — the _average_ marks scored at whole bands —
together with an explicit warning:

> The precise number of marks needed to achieve these band scores will vary slightly from test
> version to test version.

| Paper                    | Band 4 | Band 5 | Band 6 | Band 7 | Band 8 |
| ------------------------ | -----: | -----: | -----: | -----: | -----: |
| Listening                |      — |     16 |     23 |     30 |     35 |
| Academic Reading         |      — |     15 |     23 |     30 |     35 |
| General Training Reading |     15 |     23 |     30 |     35 |      — |

The warning is not boilerplate. Every IELTS version is equated separately, so the raw score that
earns band 7 genuinely differs between sittings. A fixed table is therefore, in the strict
psychometric sense, wrong — and yet preparation software cannot function without one.

So a _de facto_ table circulates instead. It appears in coaching handouts, score calculators and
test-centre software, almost always inline and almost always without provenance. Part VI publishes
that table once, as a citable artefact, with the three properties the circulating copies lack:
validation against the official averages, honest provenance, and a measurement of where reputable
sources disagree.

### 30. What a real deployment looks like

The reference platform surveyed here is `yysd-testcenter`, a live IELTS and A-Level mock-exam centre
serving Cambridge practice papers as static HTML. Its scoring behaviour was measured directly from
the repository at clone time:

| Measurement                                                | Count |
| ---------------------------------------------------------- | ----: |
| Papers that call `lookupBand(correct, total)`              |   148 |
| Papers that define a `BAND_TABLE` literal inline           |   104 |
| Distinct table literals among those definitions            |     2 |
| Papers that call `lookupBand` **without** defining a table |    44 |

Three findings follow, and each of them motivates a design decision in this API.

**The table is copied, not referenced.** 104 papers carry their own copy of the same 14- or 15-row
array. The copies happen to agree today — the survey found exactly two distinct literals, one per
skill, with no drift — but agreement is maintained by nothing except care, across 104 files.

**Nearly a third of papers have no table at all.** 44 papers call `lookupBand` without defining it.
The platform patches this at runtime: a shim in `assets/js/exam-bridge.js` injects a fallback,
carrying a maintainer's comment recording the failure it was written to fix — older papers "call
`lookupBand`/`levelLabel` but omit the defs — submit then throws after locking `submitted`", leaving
the candidate unable to submit. Scoring logic duplicated into content files is scoring logic that
goes missing.

**The fallback guesses the module from the file name.** The shim selects its table with
`/reading/i.test(examId)` — a regex over the exam identifier — and so recognises exactly two cases,
Reading and not-Reading. There is no General Training branch. Any GT Reading paper routed through
the fallback is scored on the Academic table.

That last one is not a rounding error. Across the 41 possible raw scores the two Reading tables
differ at 30 of them, and at four raw scores the difference is a **whole band**:

| Raw score | Academic | General Training | Difference |
| --------: | -------: | ---------------: | ---------: |
|        35 |      8.0 |              7.0 |        1.0 |
|        30 |      7.0 |              6.0 |        1.0 |
|        27 |      6.5 |              5.5 |        1.0 |
|        23 |      6.0 |              5.0 |        1.0 |

`/v1/scores/raw` therefore makes `module` a **required** parameter with three values
(`listening`, `reading-academic`, `reading-general`) and no default. There is no inference from a
file name, and no way to ask for "reading" without saying which one.

### 31. Construction and validation

Each table is written as a list of `[minCorrect, band]` thresholds — the form every published table
uses — and expanded into contiguous rows by `expandRows`, which derives each row's upper bound from
the threshold above it. Only the lower bounds are transcribed; the upper bounds are computed. Gaps
and overlaps are therefore structurally impossible rather than merely checked for.

Validation is executed, not asserted. The test suite enforces four invariants per table:

1. **Anchor reproduction.** Every official average mark must fall inside the row this table assigns
   to that band. All twelve published anchors pass. A single mistranscribed threshold would move an
   anchor into a neighbouring row and fail the suite.
2. **Total coverage.** The rows partition 0–40 exactly: 41 raw scores, each covered once.
3. **Monotonicity.** Bands decrease strictly down the table, every band is a reportable value on the
   0–9 half-band scale, and no raw score increase ever lowers the band.
4. **Cross-table ordering.** For all 41 raw scores, the General Training band never exceeds the
   Academic band — the direction of difficulty that ielts.org states in prose, checked numerically.

The tables are labelled `indicative-consensus`, never "official", and every response repeats the
equating caveat.

### 32. Measuring the disagreement between sources

Because no authoritative table exists, the spread between reputable published tables is itself a
result: it bounds how precisely a raw score can be interpreted. Three alternative tables are
recorded in full, and the API computes their disagreement with the consensus exhaustively over all
41 raw scores rather than summarising it in prose.

| Variant                      | Paper                    | Disagreeing scores | Agreement |
| ---------------------------- | ------------------------ | -----------------: | --------: |
| Alternative GT bands 7.5/8.0 | General Training Reading |            1 of 41 |     97.6% |
| Alternative Listening tail   | Listening                |            5 of 41 |     87.8% |
| Pre-2018 coaching table      | Listening                |           19 of 41 |     53.7% |

The pattern is the useful part. Modern sources agree almost perfectly in the range that matters for
admissions — bands 5.5 to 9 — and diverge in the tail below band 4.5, where few candidates sit and
few sources bother to be careful. The pre-2018 table is different in kind: it disagrees at 19 raw
scores and is stricter at every one of them, which is what a table drifting out of date looks like.

`/v1/scores/raw/tables` returns these disagreements as data — the exact raw scores, the consensus
band and the variant band — so that a study reporting bands derived from raw scores can state its
sensitivity to table choice instead of ignoring it.

### 33. Rescaling is not equating

Mock platforms routinely convert a short drill into a band by scaling the raw score to 40, which is
what `lookupBand`'s `total === 40 ? correct : Math.round(correct / total * 40)` does. The API
supports this through the `outOf` parameter, because clients need it, and marks it as a hazard in
the response rather than performing it silently.

A 10-question section carries roughly a quarter of the measurement precision of a full paper: one
mark moves the scaled score by four, which can move the reported band by a full band or more. Any
response with `outOf` other than 40 therefore carries a `rescaling` note stating the multiplier and
the fact that proportional rescaling is not equating.

The same reasoning motivates the `sensitivity` block returned with every conversion. It reports the
band the candidate would receive at one mark fewer and one mark more, and flags scores sitting on a
threshold — precisely where the official "varies from version to version" caveat bites hardest. A
band 7.0 from 30/40 and a band 7.0 from 31/40 are not equally safe, and the API says so.

### 34. Threats to validity (Part VI)

- **The consensus table is a reconstruction, not an equating table.** It cannot be otherwise: no
  official table exists to reconstruct. It reproduces all twelve published anchors, which is
  necessary but not sufficient — the anchors constrain four rows per paper, and the remaining rows
  rest on cross-source agreement alone.
- **The anchors are averages, not thresholds.** ielts.org describes them as the average marks scored
  at each band. The validation therefore checks containment (the average falls inside the row), not
  equality with the row's lower bound. A stricter reading of the published figures is possible and
  would not change any row in these tables, but the distinction is real.
- **The variant survey is not exhaustive.** Three alternative tables are recorded, selected because
  they are widely cited and mutually inconsistent. A systematic survey of preparation publishers
  would likely find more, and the agreement rates reported here would move.
- **Source tables are undated and mutable.** Preparation sites revise tables without changelogs. The
  variants are pinned by URL only; the pre-2018 entry is dated because it is a PDF, and the others
  are not.
- **The platform survey is a single case.** The 148/104/44 counts describe one mock-exam platform at
  one commit. They are evidence that inline duplication fails in practice, not a measurement of how
  often it fails across the sector.
- **Band 9 is not the ceiling of ability.** The tables stop at 40 correct because the paper does.
  Nothing here supports inference above the top row.

### 35. Reproducing Part VI

The tables are code, not generated data, so there is nothing to download. The validation is the test
suite:

```bash
npm test -- test/data/rawScores.test.ts test/lib/rawScore.test.ts
```

The platform survey in §30 is reproducible against the reference repository:

```bash
git clone --depth 1 https://github.com/wanli4473/yysd-testcenter
cd yysd-testcenter

# 148 papers call the conversion helper
grep -rl "lookupBand" library/ | wc -l

# 104 define a table inline; the distinct literals show whether the copies have drifted
grep -rl "BAND_TABLE" library/ | wc -l
grep -rho "BAND_TABLE *= *\[\[.*\]\];" library/ | tr -d '[:space:]' | sort | uniq -c

# 44 call the helper without defining a table, and depend on the runtime shim
comm -23 <(grep -rl "lookupBand" library/ | sort) <(grep -rl "BAND_TABLE" library/ | sort) | wc -l
```

## Part VII — the mock-exam test centre

**Corpus snapshot:** commit `0956ea375405e30b31bd554822726e4245bf077a` (tree of 2 September 2026),
3,713 blobs. The upstream manifest itself was generated on 2 September 2026 and its oldest entry is
dated 18 June 2026: the platform is eleven weeks old at snapshot time and still growing daily.

Parts I-V indexed collections - material that accumulates in folders. Part VI indexes something
different: an **operational platform**. The repository behind the YYSD IELTS online mock-exam test
center (优益思达学习中心, live at youyisida.com) is a complete, working IELTS mock-exam business:
a static exam front end, an Express/SQLite API for phone-number accounts, score synchronisation and
teacher assignment, a "CDT" (computer-delivered test) shell for full three-hour mocks with a
three-skill report, an AI admission sub-application and a rankings sub-application. Its self-marking
exam papers are plain HTML files under `library/<zone>/<subject>/`, a GitHub Action rebuilds
`library/manifest.json` on every upload via `scripts/build_manifest.py`, and a finished paper
reports its result to the hosting page with a single `postMessage`: `{type: "yysd:score", score,
total, band}`. The repository declares no licence, so as with Parts I, IV and V this part publishes
derived, non-substitutive metadata only - no exam HTML, question text, answer key, audio or
vocabulary entry.

### 36. What the test centre actually contains

The manifest lists 377 content items in three zones: `mock` (226 exam papers), `practice` (10 drill
pages) and `study` (141 vocabulary books and one grammar lesson). Classified by the canonical paper
facet the index derives: 72 Cambridge listening papers, 76 reading papers, 74 writing papers, 140
vocabulary books, 12 drills (long-sentence analysis, intensive listening, number dictation, a
grammar lesson and two placement papers) and 3 full three-hour mock exams (180 minutes each), plus
a 75-minute junior placement. The Cambridge holdings are the headline: **an unbroken Cambridge
4-21, all three papers, all four tests** - 220 volume-bearing self-marking papers, something no
other indexed collection in this API provides - plus two teacher-made "secret set" reading papers
(绝密套卷, 40-question recall-based mocks) filed with the reading papers but outside the volume
numbering. Volume 3 is present only as reading and writing, tests 1-2. The
naming is disciplined (`cambridge-10-test-1`, `cambridge-10-test-1-reading`,
`cambridge-10-test-1-writing`), which is what makes the holdings matrix mechanically derivable.

The platform's own conventions are part of the index: papers carry optional `exam:title`,
`exam:duration` and `exam:description` metadata; durations are the exam-shell budgets (32 minutes
for a listening paper, 60 for reading or writing, 180 for a full mock), not official timing; and
titles are Chinese (剑桥雅思10 · Test 1（听力）), so the index adds a deterministic English title
wherever the id structure names the paper and keeps the original title everywhere.

### 37. The hand-tagged question taxonomy

Two machine-written JSON files, `library/listening-taxonomy.json` and
`library/reading-taxonomy.json`, hold what no other indexed collection has: a **per-question-group
map of the Cambridge corpus, maintained by the centre's teachers**. Every group carries a question
range, one of 7 listening or 8 reading Chinese type labels, a teaching scene and a difficulty
judgement (易 easy, 中 medium, 难 hard). At snapshot time the listening file annotates 530 groups
over 271 of the 272 sections of Cambridge 5-21 (2,720 questions; only Cambridge 20 Test 1 Section 4
is missing), and the reading file annotates 569 groups over all 204 passages of Cambridge 5-21
(2,688 questions). The tags are hand-maintained and it shows in honest ways: 32 listening and 34
reading groups carry no difficulty yet, 11 and 19 carry no scene, the section-scene table lags the
group table (266 listening sections and 198 reading passages have a section-level scene, against
271 and 204 touched by groups), volume 4 is untagged altogether, and one listening group and three
reading groups overlap a neighbour's question range (Cambridge 21 Test 1 Section 2, Cambridge 18
Test 3 Passage 3, Cambridge 19 Test 2 Passage 3). The index reports all of this instead of quietly
repairing it.

The 15 label-by-paper pairs map onto the canonical taxonomy of Part II. The mapping is deliberate
rather than literal: a generic completion label (填空题) means forms and notes in the listening
paper, where no summary label exists, so it maps to `summary-completion`; in the reading paper a
distinct summary label (总结题) exists, so the generic label there denotes sentence completion and
maps to `sentence-completion`. 判断题 merges the practice corpus's separate True/False/Not Given
and Yes/No/Not Given families into `true-false-not-given`; 段落匹配题 maps to
`matching-information`, 选段意题 to `matching-headings`, and 细节匹配题 - which does not say what
is matched to what - to the generic `matching` family.

| Listening (2,720 questions) | Share | Reading (2,688 questions) | Share |
| --------------------------- | ----: | ------------------------- | ----: |
| summary-completion          | 57.3% | true-false-not-given      | 27.7% |
| multiple-choice             | 17.2% | summary-completion        | 17.2% |
| matching                    | 13.1% | sentence-completion       | 16.1% |
| multiple-choice (multi)     |  8.2% | matching                  | 11.3% |
| diagram-label-completion    |  3.7% | matching-information      |  9.6% |
| short-answer                |  0.6% | multiple-choice           |  8.4% |
|                             |       | matching-headings         |  6.7% |
|                             |       | multiple-choice (multi)   |  2.9% |

Cross-validated against Part II, the two independent taxonomies tell one story. Listening
completion agrees almost perfectly: 57.3% here against 58.5% in the practice corpus. Reading
identification agrees once the label granularity is aligned: this corpus's 27.7% True/False/Not
Given sits next to the practice corpus's 18.3% + 10.3% = 28.6% combined identification share. The
visible disagreement is multiple choice, 8.4% here against 17.2% there - plausibly a real
collection difference (Cambridge 5-21 versus third-party mock tests) layered on a labelling
difference. Difficulty, by contrast, is the centre's own pedagogical judgement with no external
reference: listening is judged hardest (32.1% hard, 36.0% medium, 25.8% easy), reading mildest
(22.8% hard, 43.9% medium, 27.2% easy).

The 24 teaching scenes (16 listening, 8 reading) are the platform's own vocabulary, kept in the
original Chinese with an English gloss, and crosswalked onto the eleven theme groups of
`/v1/topics/themes` (tourism -> transport, accommodation -> family, insurance and business
management -> economy, and so on). Listening scenes are exactly the operational scenarios the
paper's first sections are famous for - tourism (368 questions), daily life (340), assignment
discussion (340), business management (280) - while reading is dominated by society and humanities
(631 questions) and nature and technology (436).

### 38. The production score calibration

A third platform artefact, `scripts/cambridge_scoring.py`, is injected into every self-marking exam
page: two raw-score-to-band tables (listening 0-40 -> 2.5-9.0 in 14 rows; academic reading 0-40 ->
2.0-9.0 in 15 rows) plus six band-level labels, applied after scaling any non-40 total with
`round(correct / total * 40)`. The extractor parses the tables out of the helper source, converts
the descending thresholds into explicit raw-score ranges, validates contiguity down to 0 and joins
each row's level label at build time. These are the community-published conversion charts, not an
official IELTS conversion - nothing official exists at raw-score granularity - so the endpoint
carries the same indicative caveat as the concordances of `/v1/scores`, with the added provenance
note that these are the values a live platform actually grades by.

### 39. What the API publishes from Part VII

`/v1/testcenter` serves the provenance, statistics and timing budgets; `/v1/testcenter/catalog`
searches the 377-paper catalogue by zone, subject, paper, Cambridge volume or free text;
`/v1/testcenter/volumes` serves the holdings matrix; `/v1/testcenter/groups` searches the 1,099
tagged groups by paper, canonical type, scene, difficulty, volume and test;
`/v1/testcenter/scenes` the crosswalked scene vocabulary; `/v1/testcenter/scoring` the calibration,
optionally as a band lookup for a raw score. The drill composer `/v1/testcenter/drill` turns the
taxonomy back into teaching: it selects groups in canonical order under any combination of the
filters above until a question budget is filled, times the result with the centre's own pacing
(0.8 minutes per listening question, 1.5 per reading question) and attaches the scoring sheet.
Like the study planner, it is a pure function of its input: no randomness, no state, byte-identical
responses.

### 40. Threats to validity (Part VII)

- **Teacher tags are one organisation's judgement.** The scene and difficulty labels come from a
  single teaching team with unknown annotation guidelines and no inter-annotator agreement data.
  They are pedagogical judgements, not measurements; the difficulty labels in particular have no
  item-level performance data behind them.
- **The tagset is a snapshot of work in progress.** The taxonomies lag the catalogue (volume 4
  untagged, one listening section missing, six reading passages without a section-level scene) and
  the platform is eleven weeks old; the pinned commit is the only defence against silent drift.
- **The label mapping involves disambiguation.** The 填空题 listening/reading split, the 判断题
  merge and the generic 细节匹配题 fallback are documented decisions, not upstream facts; a
  researcher who disagrees can re-map from the published raw labels, which the index keeps.
- **The scene crosswalk is many-to-one approximation.** 24 scenes to 11 theme groups loses
  information by design; the crosswalk is a bridge between vocabularies, not a equivalence claim.
- **Durations are platform budgets.** 32 minutes for a listening paper is the exam shell's
  countdown, not the official 30-plus-transfer; the index labels them as the centre's own budgets.
- **The calibration is indicative.** Community conversion charts at raw-score granularity; no
  official table exists to validate against, and the platform's own rounding rule is part of the
  published note.
- **The snapshot is mutable and unlicensed.** As with Parts I, IV and V: commit SHA and per-file
  blob SHA-1s pin the analysis; upstream deletion would orphan permalinks, and the index would need
  re-deriving after upstream changes.

### 41. Reproducing Part VII

```bash
curl -sL "https://api.github.com/repos/wanli4473/yysd-testcenter/git/trees/main?recursive=1" -o tree.json
# Fetch the four content blobs by SHA (manifest, two taxonomies, scoring helper);
# the tree supplies the per-file provenance for the catalogue and the groups.
python3 scripts/extract_testcenter.py manifest.json listening-taxonomy.json \
    reading-taxonomy.json cambridge_scoring.py tree.json data/testcenter.json
```

`scripts/extract_testcenter.py` is standard library only and imports the canonical type list from
`scripts/extract_practice_tests.py`, so the two taxonomy mappings are validated against one list by
construction. The derivation is deterministic: the same five inputs always produce byte-identical
output. Continuous integration re-derives the index on every run - it downloads the four blobs by
SHA, runs the extractor, and fails if the committed file disagrees - and then checks the index for
internal consistency (catalogue and facet totals, holdings arithmetic, group type/scene/difficulty
vocabularies, calibration contiguity).

## Part VIII — the forgetting curve and the schedulers that cite it

**Corpus snapshot:** `Iamdacai/ielts-vocab-system` at branch `master`, tree read 7 September 2026,
649 blobs outside `node_modules`. Unlike Parts I-VII, this part indexes almost no upstream data. The
upstream repository is a working Chinese-language IELTS vocabulary trainer — 269 commits, JavaScript
on SQLite behind JWT authentication, seven word libraries totalling 47,044 words, ten AI-backed
services (Bailian Qwen-max for definitions, MiniMax for speech synthesis, Paraformer for
pronunciation scoring). None of that is reproducible without paid API keys, and its word lists are
substitutive copies of copyrighted lists, so none of it is republished here. What the repository
contributed is a **question**, asked by one file: `backend/spaced-repetition-algorithm.js`.

### 42. The algorithm that cites a book with no algorithm in it

The upstream scheduler is 60 lines long and is labelled, in comments and in the API responses it
feeds, as the Ebbinghaus algorithm. Reduced to its arithmetic:

```js
const baseIntervals = [5, 30, 720, 1440, 2880, 5760, 10080, 21600]; // minutes
calculateNextReview(reviewCount, mastery) =
  reviewCount < 8 ? baseIntervals[reviewCount] : 21600 * (1 + mastery / 100);
updateMasteryScore(m, isCorrect, confidence) =
  clamp(m + (isCorrect ? confidence * 5 : -confidence * 8), 0, 100);
```

Five minutes, thirty minutes, twelve hours, then one, two, four, seven and fifteen days, then a
permanent fifteen-to-thirty-day ceiling scaled by a mastery score. It is a competent piece of
software. It is not Ebbinghaus.

Ebbinghaus (1885) did not propose a review schedule. He memorised lists of nonsense
syllables, relearned them after a delay, and reported **savings** — the proportion of the original
learning time that the relearning spared. He measured seven retention intervals: 19 minutes, 63
minutes, 8.75 hours, 1 day, 2 days, 6 days and 31 days. (The familiar "20 minutes, 1 hour, 9 hours"
are rounded retellings; Murre and Dros ([2015](https://doi.org/10.1371/journal.pone.0120644)) recover the true figures.) He then fit those seven points with

```text
b = 100k / ((log10 t)^c + k),    k = 1.84,  c = 1.25,  t in minutes
```

where `t` is counted from one minute before the end of learning. That equation is a _description of
decay_, with no review term in it at all. A schedule cannot be derived from it without adding
assumptions Ebbinghaus never made — most importantly, what a review does to the curve, which is
precisely the thing he did not measure.

The API therefore separates the two things the upstream file conflates. `/v1/retention/curve`
publishes the measurement; `/v1/retention/schedulers` publishes the algorithms, each attributed to
the source that actually contains it, including the upstream ladder itself — attributed honestly, as
`folk-pedagogical` provenance with a `claimsEbbinghaus: true` flag.

### 43. The data: four series, one equation, and a residual with a story

`/v1/retention/curve` returns Ebbinghaus's own savings at his seven intervals, together with the
three independent replications tabulated by Murre and Dros (2015): Mack (1927), Seitz (1942) and Dros (2013),
the last a full modern replication run by the authors on themselves under the original protocol.
Four series, 28 observations, at intervals spanning 19 minutes to 31 days.

Refitting is not the interesting operation; checking the fit is. Evaluating Ebbinghaus's own 1885
equation against Ebbinghaus's own 1885 data gives a mean absolute residual of **0.013** and a
maximum of **0.033** — a 140-year-old two-parameter curve tracking its data to within about one
percentage point of savings. The maximum residual is where it gets interesting: it falls exactly on
the **1-day** point, and it is _positive_ — the observation sits above the curve. Retention at 24
hours is better than a monotone decay function predicts. Murre and Dros attribute the bump to sleep
consolidation, and it is visible in the residuals of an equation fit before anyone proposed it.
The endpoint publishes the residuals rather than asserting the conclusion.

### 44. Five schedulers, five different sources

| Scheduler        | Source                                                                                                                                         | What it actually specifies                                                 |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `pimsleur-1967`  | Pimsleur (1967), _Modern Language Journal_ 51(2), [doi:10.1111/j.1540-4781.1967.tb06700.x](https://doi.org/10.1111/j.1540-4781.1967.tb06700.x) | A fixed ladder of 11 intervals in a ratio of 5: 5 s, 25 s, 2 min … 2 years |
| `leitner-1972`   | Leitner (1972), _So lernt man lernen_                                                                                                          | Boxes; a correct answer promotes, a wrong answer returns the card to box 1 |
| `sm2-1990`       | Wozniak (1990), [super-memory.com/english/ol2.htm](https://super-memory.com/english/ol2.htm)                                                   | 1 d, 6 d, then `I(n) = I(n-1) x EF`, with `EF` updated from a 0-5 grade    |
| `half-life-2016` | Settles and Meeder (2016), ACL 1848-1858, [doi:10.18653/v1/P16-1174](https://doi.org/10.18653/v1/P16-1174)                                     | `p = 2^(-Δ/h)`, `h = 2^(Θ·x)`; review when `p` hits a target               |
| `folk-ladder`    | The trainer under study, [`Iamdacai/ielts-vocab-system`](https://github.com/Iamdacai/ielts-vocab-system)                                       | Eight fixed rungs, 5 min to 15 d, then a mastery-scaled ceiling            |

Two of these are exactly specified by their sources and two are not, and the API records which is
which rather than smoothing it over.

**Pimsleur is exact and is usually quoted wrong.** The published ladder is powers of five in
seconds: `5^1 = 5 s`, `5^2 = 25 s`, up to `5^11`. The familiar labels round hard — the rung printed
as "1 hour" is 3,125 s, i.e. 52.08 minutes; "1 day" is 21.7 hours; "2 years" is 565 days. The API
stores the exact `5^n` seconds and publishes the labels beside them in `ladderLabels`, so that a
study can state which one it used.

**Leitner is not exact, and the secondary literature disagrees with itself.** Leitner was a science
journalist, and _So lernt man lernen_ (1972) describes a physical card box in which boxes are
reviewed at different _frequencies_; it does not tabulate a canonical day ladder, and the original
system had three compartments, not five. Present-day sources confidently render the five-box
intervals as 1/2/4/8/16 days, 1/2/7/14/30, 1/2/4.5/9.5/21, and 1/2/4/7/30 — mutually incompatible
numbers, all attributed to the same book. The API publishes the doubling rendering as canonical
because it is the one implied by the box-frequency description, and publishes the others as named
variants under `/v1/retention/schedulers` with the disagreements _measured_: `leitner-calendar`
diverges at boxes 3, 4 and 5 by ratios of 1.75, 1.75 and 1.88; `leitner-45910` at the same boxes by
1.13, 1.19 and 1.31. A ratio of 1.88 on box 5 is not a rounding difference; it is a different
schedule wearing the same citation.

### 45. Comparing schedulers instead of listing them

Publishing five algorithms is only useful if they can be run against each other, which requires a
retention model none of them share. `/v1/retention/compare` scores all five on one: half-life
regression's `p = 2^(-Δ/h)` with `h` derived from the pre-review state, so every scheduler is graded
by the same yardstick and none is graded by its own. Over a 365-day horizon with perfect recall:

| Scheduler        | Reviews / year | Terminal interval | Mean predicted recall at review |
| ---------------- | -------------- | ----------------- | ------------------------------- |
| `sm2-1990`       | 5              | 131.5 d           | 0.179                           |
| `pimsleur-1967`  | 10             | —                 | 0.781                           |
| `folk-ladder`    | 19             | 30 d (its cap)    | 0.490                           |
| `leitner-1972`   | 25             | 16 d              | 0.515                           |
| `half-life-2016` | 49             | 13.7 d            | 0.900                           |

A **9.8-fold spread in study cost** between algorithms that a learner, or an app store listing,
would treat as interchangeable. The recall column shows what the cost buys and where each algorithm
sits on the trade-off: SM-2 is cheap and lets items decay to 0.18 before touching them; half-life
regression holds 0.90 and charges ten times as many reviews for it. Neither is wrong. But an app
that ships one while citing the other is making a claim about the trade-off that it has not tested.

`/v1/retention/workload` converts this into the number a curriculum designer needs. At 20 new words
a day against the 4,174-headword Cambridge list — 209 days to cover — the folk ladder demands 19
reviews per word, peaking at **380 reviews a day** and settling at 313; SM-2 demands 5, peaking at 100. Three times the daily cost, for lower predicted recall than Leitner at two-thirds of Leitner's
price. That comparison is the argument for publishing the schedulers as data.

### 46. Two defects the reimplementation exposed

Writing the upstream ladder out as a pure function, next to four algorithms that were specified in
their sources, made two properties visible that are invisible in the original code:

- **A failed review advances the schedule.** The upstream scheduler indexes `baseIntervals` by
  `reviewCount`, and `reviewCount` increments on every attempt. Every other scheduler here rewinds
  on failure — Leitner to box 1, SM-2 to its first interval — and half-life regression shortens `h`.
  In the folk ladder, forgetting a word promotes it exactly as remembering it would. The mastery
  score drops, which affects only the post-ladder ceiling, so for the first eight reviews a learner
  who fails every time is on the same schedule as one who succeeds every time. The API reproduces
  the behaviour faithfully and documents it in the scheduler's `notes`.
- **Mastery reconstruction is path-dependent.** `updateMasteryFrom(repetitions, lapses)` cannot be a
  function of the counts alone, because the 0-100 clamp destroys order information: four successes
  then one failure gives 92, not the 60 that the same tally in a different order produces. The
  helper documents that it reconstructs the _best-case_ path and that the true value requires the
  event sequence — which is the argument for storing review history rather than counters.

### 47. Threats to validity (Part VIII)

- **Savings are not recall.** Ebbinghaus measured relearning time saved on nonsense syllables by a
  single subject: himself. Every scheduler in this part is used for word learning, and the two
  quantities are related by assumption, not measurement. The API never converts savings to a
  recall probability.
- **The comparison model is one of the contestants.** Scoring all five schedulers with half-life
  regression's retention function structurally favours half-life regression, which is why it posts
  the best recall column. The comparison is a common yardstick, not a neutral one, and no yardstick
  here is neutral; the endpoint states the model it used in every response.
- **The HLR weights are illustrative.** Settles and Meeder fit `Θ` on 12.85 million Duolingo review
  traces. This API ships fixed, hand-set weights (bias 0.5, +1 per correct, -1 per incorrect) so
  that responses stay deterministic and dependency-free. They reproduce the _shape_ of the model,
  not Duolingo's fitted parameters, and the response says so.
- **The Leitner ladder is a reconstruction.** See section 44: no canonical day ladder exists in the
  1972 source. The canonical choice is defensible, not authoritative, and the variants are
  published so a researcher can pick a different one.
- **Cost is not learning.** Reviews per year measures effort. Whether more reviews produce more
  durable knowledge is the spacing question (Cepeda et al., 2006, [doi:10.1037/0033-2909.132.3.354](https://doi.org/10.1037/0033-2909.132.3.354)), and it needs learner data this API does
  not have and does not simulate.
- **Grade semantics are not shared across schedulers.** SM-2's 0-5 scale, Leitner's binary
  right/wrong and the folk ladder's 1-5 confidence are different instruments. The API maps a single
  `quality` parameter onto each, which is a convenience for comparison and a distortion of each
  source's intent.

### 48. Reproducing Part VIII

There is nothing to extract. The retention data is 28 published observations transcribed from Table
3 of Murre and Dros (2015) and five algorithms transcribed from their primary sources; all of it lives in
`src/data/retention.ts` with a per-record citation, and the arithmetic is in `src/lib/retention.ts`.
Verification is by reading the sources against the constants — the reason every observation carries
its study, its interval in minutes and its savings as published. The upstream ladder can be checked
against its origin with:

```bash
curl -s "https://api.github.com/repos/Iamdacai/ielts-vocab-system/contents/backend/spaced-repetition-algorithm.js?ref=master" \
  | python3 -c "import base64,json,sys; print(base64.b64decode(json.load(sys.stdin)['content']).decode())"
```

The 88 unit tests over the data and library modules assert the transcription against the published
figures directly (Ebbinghaus's seven intervals, Pimsleur's `5^n` seconds, SM-2's ease-factor update,
the residual maximum falling on the 1-day point), so a transcription error fails the build rather
than propagating into a citation.
