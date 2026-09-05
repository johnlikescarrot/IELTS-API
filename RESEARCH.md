# Research notes: from an open file dump to a citable IELTS dataset

This document records how the datasets behind the IELTS API were derived from the open corpus
[`zhengyishiming/IELTS`](https://github.com/zhengyishiming/IELTS). It is written so that a reviewer
can reproduce, criticise or extend every step.

**Corpus snapshot:** commit `a9e2d6c9a070eecea6ffaa6f15b2a00c1c7b938c` (2 September 2024, "Add files
via upload"), 78 commits, single branch `main`, 404 blobs, no tags, no licence file.

## 1. What the corpus actually contains

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

## 2. The IELTS-relevant subset

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

## 3. The vocabulary dataset

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

## 4. What the API adds, and what it deliberately does not

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

## 5. Threats to validity

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

## 6. Reproducing this analysis

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

## 7. A second source: an open practice-test platform

Version 1.1.0 adds a Listening and Reading practice layer. Its shape was informed by a structural
analysis of a second open repository,
[`ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS`](https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS)
(created 23 June 2026, default branch `main`), analysed via the GitHub API in September 2026. The
repository is a static practice-test platform (~6,300 files: HTML, JavaScript, Python, shell) served
as a static site, fronted by a paid login ("Study Room", Google Apps Script backend). Only its
_public structure_ was studied; nothing behind the login was accessed and no content files were
copied.

### 7.1 Scale inventory (structural facts)

| Component                | Observed scale                                                                                                                    |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Graded listening lessons | 102 lessons (Basic / Intermediate / Advanced), each a template-built page plus audio                                              |
| Listening full tests     | 204 tests, each with HTML, a sections/questions JSON file, a per-question strategies file and audio                               |
| Reading full tests       | 315 tests                                                                                                                         |
| Graded reading lessons   | 1,232 JSON lessons across A1-A2, B1-B2 and C1-C2 (passage + typed questions + answers + explanations), served by one SPA template |
| Source documents         | 514 `.docx` files                                                                                                                 |
| Tooling                  | ~50 Python scripts (crawlers, login injectors, static-site builders, Supabase importers)                                          |
| Topic analysis           | A 50-topic frequency list for 2025-2026 across Reading, Writing, Speaking and Listening                                           |
| Study planning           | A CEFR A1-C2 progression plan (11 Reading families x 6 levels) with a six-step session routine                                    |

Two findings shaped the practice layer:

- **Receptive-skills practice dominates self-study material.** The platform's volume is overwhelmingly
  Listening and Reading tests, while this API's v1.0.0 covered only vocabulary, bands, scores and
  productive-skills tasks. The practice layer closes that gap.
- **Organisation by question family and CEFR level is the natural index.** The platform groups
  material by task shape (completion, multiple choice, matching, labelling, short answer) and by
  level (A1-C2); the API mirrors that organisation in machine-readable form
  (`/v1/practice/question-types`, `/v1/practice/study-plans`).

### 7.2 What was taken, and what was deliberately not

Taken: the _idea_ of the taxonomy (which question families exist, which CEFR levels a plan spans,
that a session routine has roughly six steps). Question-family names (e.g. "True/False/Not Given")
are generic public test terminology, and the test timing model (four Listening sections,
40 questions, 30 minutes of audio plus transfer time; 60-minute Reading test) follows the IELTS
partners' published test descriptions.

Not taken: every sampled artefact (a listening JSON, a reading lesson, a strategies file, a lesson
page) contains third-party material — collected test passages, items, answers and guidance prose —
much of it commercial. No passages, items, answers, audio, or third-party guidance text were
reproduced. Every description, strategy step, pitfall, timing note and study plan served by the API
is original work written for this project, published under CC BY 4.0 with the same "indicative,
not authoritative" caveats as the band descriptors and concordances.

### 7.3 Threats to validity specific to the practice layer

- **Guidance is pedagogical, not official.** The strategies encode widely taught technique
  (preview questions, predict answers, respect word limits); they are not the IELTS partners'
  advice and must not be cited as such. Every response points at the official sources instead.
- **The taxonomy follows the public format.** If the partners revise the test format, families or
  timing change with it; the dataset records the format as published at the time of writing.
- **Study plans assume self-study.** Weekly volumes and exit signals are calibrated for independent
  learners practising 5-6 days a week; classroom or tutored learners will progress differently.
