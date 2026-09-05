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
  corpus inherits that bias. The API therefore covers Listening only where it can do so from a
  documented, non-corpus source — the raw-score conversion table (section 5), the question-type
  taxonomy and the format blueprint (section 6) — and makes no claim to publish listening
  comprehension _items_, which would require audio this corpus does not contain.
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
- exhaustive raw-score conversion tables whose every boundary carries its own provenance, and whose
  contested boundaries carry the competing value (section 5);
- the complete Listening and Reading question-type taxonomy and the format blueprints for all six
  papers, with original strategy and error commentary (section 6);
- a canonical bibliographic record rendered to nine citation formats from one source, so that no two
  surfaces of the project can describe it differently;
- a catalogue of preparation resources restricted to ones that are free **and** require no login.

## 5. Raw-score to band-score conversion: a table with its uncertainty attached

Listening and Reading are marked out of 40 and converted to a band with a lookup table. That table
is the single most-used artefact in IELTS preparation, and it is also the least well sourced: the
IELTS partners re-equate boundaries for every test version precisely so that a band means the same
thing across sittings, and they publish no definitive, versioned table. What circulates is a
consensus reconstruction.

Publishing that reconstruction as a bare lookup — a number in, a number out — would launder an
estimate into an apparent fact. Surveying the public tables shows why that matters.

**Academic Reading** is the well-behaved case: independent sources agree on every boundary from
band 1.0 to 9.0. **General Training Reading** likewise agrees from band 2.0 upwards, and confirms
the expected direction of the difference — because General Training texts are less academic, the
same band costs more correct answers (band 7.0 needs 34 correct, against 30 for Academic).

**Listening is contested.** Recent sources agree on one table; an older table, still widely
reprinted, disagrees at five consecutive boundaries between bands 5.0 and 7.5:

| Band | Recent tables | Older reprinted table |
| ---: | ------------: | --------------------: |
|  7.5 |         32-34 |                 33-34 |
|  7.0 |         30-31 |                 30-32 |
|  6.5 |         26-29 |                 27-29 |
|  6.0 |         23-25 |                 23-26 |
|  5.5 |         18-22 |                 20-22 |
|  5.0 |         16-17 |                 16-19 |

A candidate scoring 32 is band 7.5 under one table and 7.0 under the other. A study that converts
raw Listening scores without saying which table it used is therefore not reproducible at the half-band
level, and a difference of half a band is exactly the effect size much of this literature reports.

The datasets published here respond to that in three ways:

1. **Every row is labelled.** `basis` is `published` where the boundary is reproduced from agreeing
   public sources, and `extrapolated` where this project inferred it. Public Listening tables stop
   at band 4.0, so the rows below it are extrapolated and say so; Academic Reading needs no
   extrapolation above band 0.
2. **Disagreement is data.** Where sources conflict, the row carries the competing boundary in
   `disagreement` and it is returned in the API response, so a sensitivity analysis is a filter
   rather than a literature review.
3. **The tables are exhaustive over 0-40.** Every raw score resolves to exactly one row, which is
   asserted by a test that walks all 41 values of all three tables. A lookup can never silently
   fail or fall through a gap.

Consumers doing measurement work should treat a converted band as an estimate carrying roughly half
a band of table uncertainty, and should cite the version of the table they used — which is what the
version-specific DOI is for.

## 6. The question-type taxonomy

The receptive papers are built from a closed set of item types: six in Listening and eleven in
Reading. Every published practice test is a permutation of them, which makes the taxonomy the
natural unit of analysis for item-difficulty work, for tagging a corpus of practice material, and
for generating balanced practice sets.

The type names, answer rules and the parts each type appears in follow the partners' published test
format. Two properties are recorded that the published format leaves implicit and that matter for
automated processing:

- **`answerFormat`** distinguishes the two look-alike verification types. Identifying information
  takes True/False/Not Given; identifying the writer's views takes Yes/No/Not Given. Labelling one
  with the other's rubric scores zero, and conflating them in a dataset silently merges two
  different constructs.
- **`ordered`** records whether answers follow the order of the text. Three Reading types do not
  (matching information, matching features, diagram labelling), which changes both the strategy a
  candidate should use and the assumptions an item-response model can make.

The strategy and pitfall prose is original to this project and is not derived from any published
preparation material.

## 7. Threats to validity

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
- **Raw-score tables are a consensus reconstruction, not an official artefact.** See section 5: the
  boundaries are re-equated per test version, public sources disagree on Listening, and the rows
  below band 4.0 are extrapolated. The uncertainty is published alongside the value rather than
  hidden behind it, but it cannot be removed.
- **The question-type taxonomy describes the instrument, not a sample of items.** It records what
  the papers are made of; it does not contain real test items, which are copyright.

## 8. Reproducing this analysis

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
