# Research notes: from an open file dump to a citable IELTS dataset

This document records how the datasets behind the IELTS API were derived from two open sources: the
material corpus [`zhengyishiming/IELTS`](https://github.com/zhengyishiming/IELTS) (sections 1-6) and
the graded practice corpus
[`ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS`](https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS)
(section 7); section 8 documents the derivations behind the text-analytics endpoints. It is written so that a reviewer can reproduce, criticise or extend every step.

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

## 7. The open practice corpus (`/v1/practice`, v1.1.0)

**Snapshot:** commit `ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c` of
[`ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS`](https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS)
(main, 3 July 2026). The repository is the public data dump behind a Vietnamese IELTS practice
course: ~3.3 GB, dominated by lesson audio and HTML, with four machine-readable families.

| Series                             | Advertised | Published (raw JSON or indexed lesson) | Normalised variant | Worked-strategy guide |
| ---------------------------------- | ---------: | -------------------------------------: | -----------------: | --------------------: |
| `listening-102` graded lessons     |        102 |                                    102 |                  – |                     – |
| `listening-204` full tests         |        204 |                                    201 |                187 |                    19 |
| `reading-1232` CEFR-graded lessons |      1,232 |                                  1,232 |                  – |                     – |
| `reading-315` full tests           |        315 |                                    269 |                108 |                    18 |

**Method.** `scripts/extract_practice.py` reads a GitHub tree listing (for file availability) and a
blobless sparse clone containing only the practice JSON (for content). Per item it records: the
upstream identifier (or a synthesised stable one), series, skill, kind, level lane, ordinal number,
word tokens of the reading prompt (after stripping HTML tags), question count, the set of item-type
labels, and three availability flags (`audio`, `processed`, `strategies`). No text is extracted from
the upstream passages, questions, audio or HTML beyond these counts. Output is sorted and rounded
deterministically, and CI re-derives the file from the pinned commit exactly as it does the
vocabulary workbook.

**Type normalisation.** Upstream question labels are free-form strings; ~94 raw spellings collapse to
49 normalised labels (lower-case, `_` separators, `labelling` → `labeling`, plus a published alias
table) and then to the 14 curated families exposed by `/v1/practice/types`. The long tail is an
artefact of hand-maintained data, not of distinct task types: `short_answer` occurs as four
spellings, and one title-cased `"True/False/Not Given"` floats beside 2,187 snake-case instances.
Researchers should cite the normalised labels, never the raw ones. Exactly **one of the 15,558
question objects is malformed** (not an object); it is counted in `questions` but contributes no
type label, which is why the type frequencies sum to 15,557.

**Findings.**

1. **Grading is not implemented as length.** The series' own planning document promises 300-500-word
   passages at A1-A2, yet the measured means are 253.7 (A1-A2), 244.3 (B1-B2) and 277.6 words
   (C1-C2) — the middle band has the _shortest_ texts. The uniform 1,200-second time limit across
   all 1,232 lessons shows grading is also absent from the pacing. Difficulty, if graded at all, is
   carried lexically or structurally — a distinction that matters for any replication study using
   this corpus.
2. **"Full tests" are not full.** Official IELTS reading has 40 questions; the indexed
   `reading-315` tests average 11.0 (max 47), and `listening-204` averages 23.1 questions (official:
   40). Series coverage is likewise partial: `listening-204` skips tests 3, 34 and 51, and
   `reading-315` publishes 269 of its advertised 315 with numbering ending at 311. The
   `published / advertised` ratios (0.9853 and 0.8540) are exposed per series so downstream studies
   can weight by availability instead of assuming the advertised size.
3. **The corpus is lesson-shaped, not test-shaped.** 1,334 of the 1,804 items are short graded
   lessons — where question counts are readable, the 1,232 CEFR reading lessons carry a mean of 6.4
   questions each — and the CEFR ladder is dominated by the C1-C2 lane (660 of 1,232). As a
   preparation resource that is fine; as a test blueprint it is skewed.

**Ethics and exclusions.** The repository ships an operational workbook containing student names,
device identifiers and per-lesson progress; the extraction pipeline never reads it and the index
contains no personal data. The hosted course gates the same content behind a paid login, and the
repository's own crawler scripts indicate the material was scraped from third-party commercial
sites; consequently _no_ upstream passage, question text or title is redistributed here — only
counts, lengths and identifiers, which are facts about the files, published under CC BY 4.0 with
attribution to the upstream repository.

**Reproducing.**

```bash
curl -sL "https://api.github.com/repos/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS/git/trees/ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c?recursive=1" -o tree.json
git clone --filter=blob:none --no-checkout https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS.git checkout
git -C checkout sparse-checkout init --no-cone
git -C checkout sparse-checkout set 'Reading_1232_Basic/frontend/data/**/*.json' \
  'Listening_204_FullTest/Test_*/Test_*.json' 'Reading_315_FullTest/Test_*/Test_*.json'
git -C checkout checkout ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c
python3 scripts/extract_practice.py tree.json checkout data/practice.json
```

## 8. Text analytics (`/v1/analyze/*`)

### 8.1 What is computed, and from which definition

| Measure                     | Definition used                                     | Reference              |
| --------------------------- | --------------------------------------------------- | ---------------------- |
| Flesch Reading Ease         | `206.835 - 1.015·(W/S) - 84.6·(Sy/W)`               | Kincaid et al. 1975    |
| Flesch-Kincaid Grade        | `0.39·(W/S) + 11.8·(Sy/W) - 15.59`                  | Kincaid et al. 1975    |
| Gunning Fog                 | `0.4·((W/S) + 100·(P/W))`                           | Gunning 1952           |
| SMOG grade                  | `1.043·sqrt(P·30/S) + 3.1291`                       | McLaughlin 1969        |
| Coleman-Liau                | `0.0588·L - 0.296·N - 15.8` (per 100 words)         | Coleman & Liau 1975    |
| Automated Readability Index | `4.71·(C/W) + 0.5·(W/S) - 21.43`                    | Senter & Smith 1967    |
| Type-token ratio            | `T/W`                                               | —                      |
| Root TTR                    | `T/sqrt(W)`                                         | Guiraud 1960           |
| Log TTR (Herdan's C)        | `log T / log W`                                     | Herdan 1960            |
| Maas index                  | `(log W - log T) / (log W)²`                        | Maas 1972              |
| MTLD                        | Mean of forward and backward passes, threshold 0.72 | McCarthy & Jarvis 2010 |

`W` words, `S` sentences, `Sy` syllables, `P` polysyllables (3+ syllables), `C` characters,
`T` types, `L` characters per 100 words, `N` sentences per 100 words.

### 8.2 Threats to validity

- **Syllable counting is heuristic.** Every readability formula that uses `Sy` or `P` inherits the
  error term of the rule-based counter in `src/lib/text.ts`. The rules (vowel groups, silent
  terminal `e`, syllabic `le`, minimum of one) are conventional but not exact for loanwords and
  proper nouns. The counter is deterministic and unit-tested, so the error is at least stable.
- **Sentence segmentation is punctuation-based.** Abbreviations ending in a full stop
  ("e.g.", "Dr.") over-count sentences, which deflates mean sentence length and inflates the reading
  ease. Candidate essays rarely contain them; research corpora may.
- **Readability formulas were calibrated on L1 school texts**, not on L2 examination writing. They
  describe surface complexity, not communicative quality, and should never be reported as a proxy
  for a band score.
- **MTLD is length-sensitive below roughly 100 tokens.** Short Task 1 responses will produce noisier
  values than Task 2 responses; the token count is always returned alongside so a reader can judge.
- **The cohesive-device inventory is closed and English-specific.** It counts 48 explicit
  connectives and cannot see lexical cohesion, reference chains or substitution, so a text that is
  coherent without explicit signposting is under-credited. The full inventory is returned in the
  response metadata.
- **The indicative band is a rubric, not a model.** It is a weighted sum over four surface features
  with hand-set thresholds. It has not been validated against examiner-assigned bands, and the API
  says so in every response. It exists so that a reproducible, inspectable baseline is available;
  it should be reported as such and never as a predicted IELTS score.
- **No content assessment.** Nothing in the pipeline reads the prompt, so task response, relevance,
  factual accuracy and argument quality — the dimensions examiners weight most heavily — are
  entirely outside its scope.
