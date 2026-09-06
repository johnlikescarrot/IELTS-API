# Research notes: from open file dumps to citable IELTS datasets

This document records how the datasets behind the IELTS API were derived. It is written so that a
reviewer can reproduce, criticise or extend every step.

Six parts, five upstream collections:

| Part                                                                            | Upstream collection                                                                                   | Snapshot                       | What it yields                                                                                                     |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| [Part I](#part-i--the-research-corpus)                                          | [`zhengyishiming/IELTS`](https://github.com/zhengyishiming/IELTS)                                     | commit `a9e2d6c9`, 404 blobs   | the vocabulary dataset and the corpus index                                                                        |
| [Part II](#part-ii--the-practice-test-collection)                               | [`ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS`](https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS) | commit `ba7a0f2b`, 6,309 blobs | the question-type taxonomy and the practice-test structure and readability index                                   |
| [Part III](#part-iii--the-analysis-toolkit)                                     | — (analyses user-supplied text against Parts I-II)                                                    | —                              | the readability analyser, the essay profiler and the study planner                                                 |
| [Part IV](#part-iv--the-study-materials-collection-and-the-response-frameworks) | [`Oxidaner/ielts`](https://github.com/Oxidaner/ielts)                                                 | commit `738c6082`, 2,385 blobs | the study-materials index and the response-framework taxonomy                                                      |
| [Part V](#part-v--the-grey-literature-archive)                                  | [`msneloy/IELTS`](https://github.com/msneloy/IELTS)                                                   | commit `db1064c3`, 557 blobs   | the grey-literature archive index: Cambridge 1-18 listening audio, official sample tasks and marked learner essays |
| [Part VI](#part-vi--the-cambridge-test-structure-index)                         | [`wanli4473/yysd-testcenter`](https://github.com/wanli4473/yysd-testcenter)                           | commit `0956ea37`, 3,713 blobs | the Cambridge IELTS 3-21 test-structure index: question groups, answer forms, readability, audio, writing families |

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

## Part VI — the Cambridge test-structure index

_Upstream: [`wanli4473/yysd-testcenter`](https://github.com/wanli4473/yysd-testcenter), commit
`0956ea375405e30b31bd554822726e4245bf077a` (4 September 2026), 3,713 blobs, 5.4 GB, no licence. The
dataset is `data/cambridge.json`; the endpoints are `/v1/cambridge`, `/v1/cambridge/stats`,
`/v1/cambridge/volumes`, `/v1/cambridge/volumes/:id`, `/v1/cambridge/question-types`,
`/v1/cambridge/tests` and `/v1/cambridge/tests/:id`._

### 29. What the collection actually contains

The upstream repository is the deployed content library of a Chinese online mock-exam centre
(优益思达, "YYSD"): a static front end, an Express API, vocabulary books, A-Level material and — the
part that matters here — `library/mock/cambridge-*`, 222 self-grading HTML pages that re-typeset the
**Cambridge IELTS 3-21 Academic tests**:

| Directory                          | Pages | Volumes            | Payload per page                                                                                                  |
| ---------------------------------- | ----: | ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `library/mock/cambridge-reading`   |    76 | 3-21 (+2 "secret") | three passages as paragraph arrays, question groups with instructions, answer keys and per-question explanations  |
| `library/mock/cambridge-listening` |    72 | 4-21               | four sections with audio file names, cue points (`audioStart`/`audioEnd` per group), question groups, answer keys |
| `library/mock/cambridge-writing`   |    74 | 3-21               | the Task 1 prompt with its chart image (or an inline table / SVG plan) and the Task 2 prompt                      |

Every page embeds one JavaScript object, `const TEST = {...}`, that the page's grading engine reads.
Two editorial files, `library/reading-taxonomy.json` (569 groups) and
`library/listening-taxonomy.json` (530 groups), tag each question group of volumes 5-21 with a
question type (7 listening / 8 reading Chinese labels), a topic "scene" (16 / 8 labels) and a
three-step difficulty.

This is exactly the material the API cannot redistribute: Cambridge IELTS is the copyrighted work of
Cambridge University Press & Assessment, and the upstream site holds no licence to it either. What
the site's structured objects make possible, however, is a **complete structural census of 146 real
tests** — every question group's position, type, answer-length rule and answer form, every passage's
length and readability, every listening section's duration — which is derived metadata of the kind
the rest of this API already publishes. Two pages are excluded because they are not Cambridge tests
(`secret-set-1/2-reading`, the site's own "绝密套卷" material); 220 are indexed.

### 30. Reading the upstream pages

The `TEST` literal is not JSON. It was typed by hand over three months and comes in every dialect a
human writes: strict JSON (46 pages), unquoted keys with single-quoted strings, template literals,
`/* Passage 1 */` block comments, trailing commas, and `'a' + 'b'` concatenations. Three pages
(volumes 16 and 18) hoist the object under a different construction. `scripts/extract_cambridge.py`
therefore carries a small tolerant literal parser (`LiteralParser`) that accepts **data forms only**
— strings, numbers, booleans, `null`, arrays, objects — and raises on the first identifier or `${`
expression, so no upstream code is ever evaluated. All 222 pages parse; the 76 + 72 + 74 counts
above are the parser's, not the file listing's.

Each question group upstream carries a rendering `kind` (`tfng`, `mcq`, `multi`, `match`, `note`,
`table`, `wbank`, `map`) that is coarser than the API's taxonomy: `match` covers headings,
paragraph-information, features and sentence endings alike; `note` covers notes, summaries,
sentences, diagram labels and short answers. The canonical type is therefore decided from the `kind`
**and the instruction wording**, using the same cue phrases the practice-corpus normaliser of Part II
relies on ("Choose the correct heading", "Which paragraph contains", "Complete each sentence with the
correct ending", "Label the diagram", "Answer the questions below"). The rules are ordinary
`if` statements in `question_type()` and can be audited line by line.

### 31. Agreement with the upstream editorial labels

The upstream taxonomies are an independent, human classification of 1,100 of the 1,207 groups, so
they serve as a check on the derivation rather than as its source. The index aligns each derived
group with the upstream group that overlaps it most in question numbers and publishes the outcome
per group (`upstreamType`, `agreesWithUpstream`) and in aggregate:

| Measure                                            | Value |
| -------------------------------------------------- | ----: |
| Groups with an upstream label                      | 1,100 |
| Groups without one (volumes 3-4, a few later gaps) |   107 |
| Derived type agrees with the label (family-level)  | 1,067 |
| **Agreement rate**                                 | 0.970 |

Agreement is measured at the level the upstream labels can express: the upstream "填空题"
(completion) covers what the API distinguishes as sentence, summary, diagram-label completion and
short answer, and "判断题" covers both True/False/Not Given and Yes/No/Not Given. The 33
disagreements have one dominant pattern: 16 groups the upstream tags as "细节匹配题" (matching
features) that the instruction "Complete each sentence with the correct ending" marks as
`matching-sentence-endings` — a real taxonomic difference, not an error on either side. The remaining
seventeen are scattered and mostly involve groups whose instruction wording is atypical (e.g. a
Cambridge 4 table filled from a lettered list). The rate is published rather than optimised away
because it is the honest reliability figure for the type field.

### 32. What the census shows

**Question types are not distributed as the practice corpus suggests.** Part II measured 27,225
practice questions; Part VI measures the 5,840 questions of the real tests. The two disagree in ways
that matter to anyone using practice frequency to plan study:

| Reading, share of questions      | Cambridge 3-21 | Practice corpus |
| -------------------------------- | -------------: | --------------: |
| `summary-completion` (all forms) |          0.259 |           0.143 |
| `true-false-not-given`           |          0.168 |           0.183 |
| `yes-no-not-given`               |          0.106 |           0.103 |
| `matching-information`           |          0.097 |           0.103 |
| `matching-features`              |          0.092 |           0.036 |
| `multiple-choice`                |          0.090 |           0.172 |
| `matching-headings`              |          0.071 |           0.076 |

Practice material over-represents multiple choice by a factor of two and under-represents matching
features by a factor of two and a half; completion tasks are the largest reading category in the
real tests, not the third. In listening the picture is closer (completion 0.54 vs 0.59, multiple
choice 0.18 vs 0.23), with the multiple-answer variant eight times more frequent in the real tests
(0.081 vs 0.011) because practice material rarely encodes "Choose TWO letters" as its own type.

**Difficulty is positional, and the editors know it.** The upstream difficulty labels map almost
monotonically onto position: 73% of reading passage-1 questions are labelled easy and 2% hard; by
passage 3 it is 7% easy and 45% hard. Listening runs from 65% easy in section 1 to 72% hard in
section 4, with no section-4 group labelled easy at all. The readability formulas agree in
direction but see a smaller effect: mean Flesch Reading Ease is 44.0 for passage 1, 41.8 for
passage 2 and 40.3 for passage 3 (Flesch-Kincaid grade 13.0 overall, mean passage 852 words). The
textbook claim that passage difficulty rises through the paper is therefore visible in the text,
but most of the perceived gradient lives in the **tasks**, not the prose.

**The real tests sit where the practice full tests sit.** The 221 measured passages average 42.0
Flesch Reading Ease against 43.5 for the 269 full practice reading tests of Part II and 41.5 for the
twelve official sample tasks of Part V — three independently sourced collections, one number. The
practice-corpus figure was computed over whole tests (three passages concatenated), which is why the
Cambridge index reports per passage and per volume: volume means range from 38.4 (Cambridge 19) to
48.2 (Cambridge 20), with no trend across two decades of publication.

**Listening audio has a stable shape.** Cue points survive for 68 of the 72 listening tests (volume
4 has none). A full test averages 26.96 minutes of recording (median 27.5; range 20.3-31.6), with
sections 1 and 4 the longest (7.1 min each) and section 2 the shortest (6.2 min). Audio grows with
volume: 5,291-5,921 s for volumes 5-9 against 6,600-7,180 s for volumes 15-21, a 15-20% increase in
the recordings themselves that is invisible in any question count.

**Answer form is a proxy for the skill actually tested.** Of the 5,840 answers, 2,451 are single
letters and 154 are Roman numerals (heading lists) — 45% of all IELTS answers are selections, not
productions. 1,962 are single words, 269 are phrases, 193 contain digits. The word-limit rule is
stated for 2,695 questions; `ONE WORD ONLY` (1,081) is by far the most common, and the once-standard
`NO MORE THAN THREE WORDS` (114 + 192 with a number) has largely given way to one- and two-word
rules in later volumes.

**Writing prompts are short and follow five families.** Task 2 prompts average 66 words and fall
into the API's five families (opinion 23, discussion 23, advantages-disadvantages 12, two-part 8,
problem-solution 8); 15 of 74 pose two explicit questions. Task 1 visuals are dominated by charts
(22 unspecified "chart" prompts, 11 line graphs, 2 bar, 2 pie), with tables (11), process diagrams
(11) and maps or plans (12) making up the rest; only three tests combine two visual types.

**Topic scenes are as positional as difficulty.** Listening section 1 is daily life, travel,
accommodation and job-seeking; section 3 is almost entirely assignment discussion and research
projects (55 of 72); section 4 is a lecture in the humanities, biology or the built environment.
Reading is led by society and humanities (48 passages), science and technology (33) and history
(31). The scene vocabulary is the upstream editors' and is published as such: it is a useful,
consistent, but single-source labelling.

### 33. What the API publishes from Part VI

- one record per test (`/v1/cambridge/tests/:id`): identifier, volume, test, skill, duration,
  the full question-group structure (position, count, canonical type, word-limit rule, answer-form
  counts, upstream type and difficulty, agreement flag), per-passage readability and lettering,
  per-section audio duration and cue-point count, writing task families and prompt lengths,
  provenance (path, blob SHA-1, permalink);
- the volume table (`/v1/cambridge/volumes`): which tests of which skills are indexed, completeness,
  mean readability and total audio per volume;
- the frequency table (`/v1/cambridge/question-types`), shaped like `/v1/question-types` so the two
  corpora can be compared directly;
- aggregate statistics with the agreement rate stated (`/v1/cambridge/stats`).

Not published: passage text, titles beyond the passage title (a bibliographic fact), any question,
any answer, any prompt text, any image, any audio, any per-question explanation. Passage titles are
published because they are how the literature cites individual Cambridge passages ("Stepwells",
Cambridge 10 Test 1); they are searchable through `q`.

### 34. Threats to validity (Part VI)

- **The pages are transcriptions, not the books.** Upstream re-typed the tests by hand (one
  passage-1 of Cambridge 7 is missing entirely and left `null`; a Cambridge 19 passage opens with an
  editor's note that its first paragraph was reconstructed). Readability figures carry transcription
  noise, and any figure derived from a single passage should be treated as ±2 Flesch points.
- **Question-type derivation is rule-based.** The rules are published and audited against an
  independent labelling at 0.970 agreement, but a group with atypical instruction wording can still
  be misfiled. The per-group `agreesWithUpstream` flag lets a consumer drop the disputed 3%.
- **Scenes and difficulties are one editorial team's judgement.** They are translated, not
  re-derived, and their inter-rater reliability is unknown. They cover volumes 5-21 only.
- **Audio durations come from cue points, not from the files.** The last `audioEnd` of a section is
  taken as its length; a section whose final group has no cue point is under-measured. Volume 4 has
  no cue points and is `null`.
- **Task 1 families are keyword-based.** "The chart below" without a chart type stays `chart`; a
  prompt describing a diagram of a layout is a map, but a diagram of a life cycle is a process, and
  the rule is a regular expression, not a reading of the image.
- **The snapshot is mutable and unlicensed.** The upstream repository is a live product with 500+
  commits; the commit SHA and per-file blob SHA-1s pin the analysis, but the permalinks depend on the
  repository remaining public.

### 35. Reproducing Part VI

```bash
curl -sL "https://api.github.com/repos/wanli4473/yysd-testcenter/git/trees/0956ea375405e30b31bd554822726e4245bf077a?recursive=1" \
  -o tree.json
# Only library/mock/cambridge-*/*.html (~10 MB) and the two taxonomy files are
# read; a full clone also works but is 5.4 GB.
python3 scripts/extract_cambridge.py tree.json ./upstream data/cambridge.json
```

`scripts/extract_cambridge.py` is standard library only; the readability formulas are imported from
`scripts/extract_practice_tests.py`, so Parts II, V and VI remain comparable by construction. The
derivation is deterministic. Continuous integration re-derives the index on every run — it downloads
the 224 blobs by blob SHA, runs the extractor and fails if the committed file disagrees — and then
checks the index for internal consistency (every test has 40 questions numbered 1-40, answer-form
and type totals add up, the agreement arithmetic holds).
