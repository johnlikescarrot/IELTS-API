# Research notes: from open file dumps to citable IELTS datasets

This document records how the datasets behind the IELTS API were derived. It is written so that a
reviewer can reproduce, criticise or extend every step.

Three independent upstream collections are analysed:

| Part                                              | Upstream collection                                                                                   | Snapshot                       | What it yields                                                                   |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------- |
| [Part I](#part-i--the-research-corpus)            | [`zhengyishiming/IELTS`](https://github.com/zhengyishiming/IELTS)                                     | commit `a9e2d6c9`, 404 blobs   | the vocabulary dataset and the corpus index                                      |
| [Part II](#part-ii--the-practice-test-collection) | [`ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS`](https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS) | commit `ba7a0f2b`, 6,309 blobs | the question-type taxonomy and the practice-test structure and readability index |
| [Part III](#part-iii--the-exam-recall-collection) | [`Oxidaner/ielts`](https://github.com/Oxidaner/ielts)                                                 | commit `738c6082`, 2,385 blobs | the exam-season recall index                                                     |

No collection is redistributed. All three are indexed, measured and cited.

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

## Part III — the exam-recall collection

**Collection snapshot:** [`Oxidaner/ielts`](https://github.com/Oxidaner/ielts) ("自学笔记",
self-study notes), commit `738c60828118f8f9d720e548b73245dd0fe70a30` (20 November 2025), 72 commits,
single branch `main`, 2,385 blobs, no licence file.

### 13. What the collection actually contains

Where Part I is a flat dump of books and Part II is a subscription product, this collection is a
candidate's working archive of **exam recall** (机经) — material remembered from real sittings and
shared in study groups, organised by skill:

| Directory | Skill     | Character                                             |
| --------- | --------- | ----------------------------------------------------- |
| `阅读/`   | reading   | 1,623 files: recalled passages in five HTML snapshots |
| `听力/`   | listening | 722 files: audio, question PDFs, six answer keys      |
| `作文/`   | writing   | 27 files: templates and vocabulary PDFs               |
| `口语/`   | speaking  | 8 files: two machine-readable seasonal banks          |
| `经验/`   | reports   | 2 files: experience reports                           |
| root      | general   | 3 files: README, a link list, a personal roadmap note |

The format mix tells the story: **1,282 PDFs and 370 MP3s out of 2,385 files**. Only 5 Markdown
files and 8 text files are directly machine-readable; everything else is scanned material, audio or
Office documents. 5.09 GB of bytes, and the analytically useful surface fits in under 300 KB.

A second, qualitative observation: the collection is personal. The root carries a Java-to-AI career
roadmap (`ai_dev_roadmap.md`) and a list of preparation websites (`网站链接.txt`) that belong to the
owner's study workflow rather than to any exam content. The index classifies them as `general` and
does not treat them as data.

### 14. The seasonal speaking bank

Two upstream files describe the **September-December 2025 speaking season**:

1. `口语/神奇题库.md` (20,868 bytes) — the "question bank": 18 Part 1 topics with 79 questions, and
   22 Part 2 cue cards each with bilingual titles and 121 Part 3 follow-up questions in total.
2. `口语/2025年9-12月口语Part2按四大类分类新题+保留题.docx` (26,540 bytes) — the full Part 2 card
   list for the season, classified into the four canonical cue-card categories and split into cards
   that are **new** this season versus **retained** from earlier ones.

The DOCX parses cleanly with a standard-library paragraph walk: section headers (`新题` / `保留题`),
category headers (`人物` / `事物` / `事件` / `地点`) and card titles are distinguishable because
titles are the only Chinese lines outside the known headers — cue-card wording itself is English.
The result is the season's complete card census:

| Category | New | Retained | All |
| -------- | --: | -------: | --: |
| people   |   5 |       11 |  16 |
| objects  |   9 |       16 |  25 |
| events   |  12 |       14 |  26 |
| places   |   1 |        8 |   9 |
| **All**  |  27 |       49 |  76 |

Two findings follow. First, **the Part 2 bank is mostly stable**: only 27 of 76 cards (35.5%) are
new in the season; candidates preparing with a previous season's bank keep 64.5% of their material.
Second, **events dominate the new cards** (12 of 27) while places barely rotate (1 new of 9). The
API publishes titles, categories, statuses and counts — the cue-card wording in the DOCX is exam
content and is deliberately not redistributed.

### 15. The reading snapshots and their recurrence tiers

The `阅读/` tree holds **336 recalled reading passages as HTML**, organised as five overlapping
snapshot collections:

| Collection     | Season  | Articles | Organisation                                 |
| -------------- | ------- | -------: | -------------------------------------------- |
| `zyz-aug-2025` | 2025-08 |       68 | tiered folders plus a dated 22-article batch |
| `beta-0-5-1`   | (beta)  |       87 | tiered folders                               |
| `sept-2025`    | 2025-09 |       81 | P1/P2/P3 folders, 高频/次高频 tiers          |
| `zyz-oct-2025` | 2025-10 |       81 | P1/P2/P3 folders with numbered articles      |
| `zyz-nov-2025` | 2025-11 |        6 | loose passages and a single tiered folder    |

The snapshots are **redundant by design**: each month re-uploads the current high-recurrence set, so
the same passage (say, _A Brief History of Tea_) appears in four collections with identical blob
content and slightly divergent file names. The index keeps one item per upstream file and records
the collection, so the duplication is measurable instead of silently merged. Of the 336 HTML files,
11 are `_comprehensive_backup` duplicates and 2 are the beta collection's web-application
scaffolding; the remaining **323 are indexed**.

Two structural facets survive normalisation:

- **Part** — every passage is labelled P1, P2 or P3 from its path (96 / 104 / 123 articles).
- **Tier** — the recurrence label recorded in the folder names: 197 `high` (高频), 100 `next`
  (次高频), 26 unrated. The `background` (背景) tier that the collection's folder names advertise
  (`[88篇+8背景]`, `[182篇+32背景]`) never materialises as HTML in the tree — background articles
  exist only as PDFs there — which the index reports honestly rather than inventing.

Titles are derived from the article directory or file name, split into English and Chinese parts at
the first CJK character, with upstream noise markers (`【高】`, `(躺)`, `(网页由…制作)`, date stamps,
`✅`) stripped. No passage text is read, indexed or served.

### 16. The listening recall sets

The listening material is dominated by audio: 370 MP3 files across the `小黑屋` drill sections, the
`nmll` part 3/4 packs and six complete recalled tests. Only those six tests ship a
machine-readable answer key (`听力/听力/keys_*.txt`):

| Set     | Answers | Audio tracks | Question paper          |
| ------- | ------: | -----------: | ----------------------- |
| TE2.2   |      40 |            4 | `听力/听力/2.2.pdf`     |
| TE2.3   |      40 |            4 | `听力/听力/2.3.pdf`     |
| TE2.4   |      40 |            4 | `听力/听力/2.4.pdf`     |
| TE2.5   |      40 |            4 | `听力/听力/2.5.pdf`     |
| TE2.6   |      40 |            4 | `听力/听力/2.6.pdf`     |
| 241123L |      40 |            4 | `听力/听力/241123L.pdf` |

The index records each set's structure — 40 answers counted from the key file, 4 audio tracks, the
question-paper blob SHA-1 and permalink. **Answer values are never published**: counting them is
metadata; serving them would redistribute exam content. The 241123L naming convention (a sitting
date: 2024-11-23) is preserved as-is.

### 17. What the API publishes from Part III

- `/v1/recall`, `/v1/recall/stats`, `/v1/recall/items`, `/v1/recall/:id` — 423 indexed items:
  18 speaking topics, 76 seasonal cue cards, 323 recalled reading passages and 6 recalled listening
  tests, each with bilingual titles (where published), part, tier, category, status, season, counts
  and full upstream provenance (path, blob SHA-1, permalink).
- Repository-level structure for all 2,385 upstream files: size, format mix and skill mix.
- `scripts/extract_exam_recall.py`: standard-library-only, deterministic extraction from the GitHub
  tree listing plus the three machine-readable speaking/listening blobs.

### 18. Threats to validity (Part III)

- **Recall is memory, not record.** Exam recall is what candidates remember after a sitting; it is
  unverified and lossy by nature. The index measures the collection's _structure_, which is factual,
  and never implies the recalled content is accurate or complete.
- **Titles are heuristic.** Bilingual titles are split at the first CJK character after stripping
  upstream noise markers; a handful of titles keep imperfect boundaries, and every item carries its
  raw upstream path so a reviewer can re-derive them.
- **Tiers and seasons come from folder names.** The recurrence tier and season labels are the
  collection's own claims, recorded verbatim into `high` / `next` / `background` and ISO-style season
  strings; nothing is re-rated here.
- **The snapshot is mutable.** The upstream repository has no tags and is actively edited; the
  commit SHA in `data/exam-recall.json` and the per-file blob SHA-1s pin the analysis, and CI
  re-derives the dataset from the live tree and fails if the committed index has drifted.
- **Licensing.** The collection carries no licence; the index therefore publishes only derived
  structure and metadata under CC BY 4.0 with attribution, and no upstream text, audio or answer
  value. Cue-card wording, question text, passages and answer values stay with their owners.

### 19. Reproducing Part III

```bash
curl -sL "https://api.github.com/repos/Oxidaner/ielts/git/trees/main?recursive=1" -o tree.json

# Fetch the three machine-readable inputs and the six listening keys via the blob API
# (each blob's URL is in tree.json; use `Accept: application/vnd.github.v3.raw`).
#   口语/神奇题库.md                                          -> speaking-bank.md
#   口语/2025年9-12月口语Part2按四大类分类新题+保留题.docx      -> part2-categories.docx
#   听力/听力/keys_2.2.txt ... keys_241123L.txt               -> keys/

python3 scripts/extract_exam_recall.py tree.json speaking-bank.md part2-categories.docx keys/ data/exam-recall.json
```

The script is standard library only and deterministic: the same tree and the same blobs always
produce byte-identical output, which is exactly what CI verifies on every push.
