# Research notes: from an open file dump to a citable IELTS dataset

This document records how the datasets behind the IELTS API were derived from open upstream repositories:
[`zhengyishiming/IELTS`](https://github.com/zhengyishiming/IELTS) and
[`ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS`](https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS). It is written so that a reviewer
can reproduce, criticise or extend every step.

**Corpus snapshot 1:** `zhengyishiming/IELTS`, commit `a9e2d6c9a070eecea6ffaa6f15b2a00c1c7b938c` (2 September 2024), 78 commits, single branch `main`, 404 blobs.
**Corpus snapshot 2:** `ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS`, commit `ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c` (3 July 2026), 60 commits, 6,309 tree entries.

## 1. What the open corpus actually contains

The repository `zhengyishiming/IELTS` is a flat dump of study material — one directory, 404 files, no code and no
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
is a key finding: an unfiltered crawler would treat a semiconductor textbook as IELTS training data.

## 2. The IELTS-relevant subset

The 76 relevant files were classified by skill using ordered keyword rules over the file names
(first match wins, so `ielts-prep` acts as the catch-all for IELTS material):

| Category            | Files |     | Skill         | Files |
| ------------------- | ----: | --- | ------------- | ----: |
| `ielts-writing`     |    14 |     | writing       |    17 |
| `english-reading`   |    17 |     | reading       |    20 |
| `english-reference` |    11 |     | reference     |    11 |
| `ielts-vocabulary`  |     9 |     | vocabulary    |     9 |
| `ielts-speaking`    |     8 |     | speaking      |     9 |
| `ielts-prep`        |     4 |     | general       |     4 |
| `ielts-grammar`     |     4 |     | grammar       |     4 |
| `ielts-reading`     |     3 |     | listening     |     1 |
| `english-writing`   |     3 |     | pronunciation |     1 |

## 3. The Cambridge IELTS 1-22 vocabulary dataset

Extraction (`scripts/extract_vocabulary.py`, standard library only):

1. Read the shared-string table, then each worksheet, resolving column names from the header row.
2. NFC-normalise and whitespace-collapse every cell.
3. **De-duplicate** headwords case-insensitively (4,310 occurrences collapse to 4,174 unique
   headwords). Where a headword recurs, the volumes are merged and the longest gloss is kept.
4. **Split senses.** 3,557 of 4,174 glosses are WordNet-style concatenations of part-of-speech-tagged
   senses (`n. ... v. ... adj. ...`). These are split into a typed `senses` array. 2,980 entries (71%)
   are polysemous, with a mean of 4.08 senses.
5. **Normalise phonetics** to slash-delimited transcriptions (4,172 of 4,174 entries carry one).
6. **Keep morpheme hints** where published — 164 entries carry pedagogical etymologies such as
   `hydro(water);gen(create)`.
7. Emit stable identifiers (`w00001` … `w04174`).

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

## 4. Upstream practice audit: UPGRADE-YOUR-IELTS-SKILLS

The repository `ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS` contains 6,309 entries representing
practice exercises and tests across four distinct learning collections:

| Collection               |  Declared |  Observed | Audit Observation                          |
| ------------------------ | --------: | --------: | ------------------------------------------ |
| Reading basic (A1-A2)    |       198 |       198 | Complete paired `lesson_NNN.json` / `.js`  |
| Reading basic (B1-B2)    |       374 |       374 | Complete paired `lesson_NNN.json` / `.js`  |
| Reading basic (C1-C2)    |       660 |       660 | Complete paired `lesson_NNN.json` / `.js`  |
| Listening basic (Basic)  |        34 |        34 | Complete HTML and audio                    |
| Listening basic (Inter.) |        34 |        34 | Complete HTML and audio                    |
| Listening basic (Adv.)   |        34 |        34 | Complete HTML and audio                    |
| Reading full tests       |       315 |   **314** | `Test_105` is absent in repository tree    |
| Listening full tests     |       204 |       204 | Audio missing for tests **83, 85, and 88** |
| **Total Practice Units** | **1,853** | **1,852** | Verified inventory catalogue               |

### Strategy and Theme Banking

1. **High-frequency theme bank:** 50 ranked themes across 11 thematic categories (Education, Environment,
   Technology, Society & Culture, Health, Work, Government & Law, Media, Globalisation, Science & Arts,
   Family & Youth), equipped with core keywords and original Task 2 prompts.
2. **Task family guidance:** 17 official task-family strategies (11 Academic Reading, 6 Listening)
   grounded in official test specifications, accompanied by the 6-step study methodology.
3. **Reproducible checksums:** Machine-readable manifest (`/manifest.json`, `docs/manifest.json`)
   recording SHA-256 digests over all committed datasets.

## 5. Threats to validity

- **Provenance of the glosses is unknown.** The workbook's definitions are short dictionary-style
  glosses of unverifiable origin; they are republished as-is as a convenience layer.
- **Phonetics are inconsistent.** Transcriptions mix IPA conventions across volumes and only two
  entries lack one entirely.
- **Practice units represent metadata index.** No copyrighted upstream exercise text or audio is
  mirrored; only descriptive curriculum structure is provided under CC BY 4.0.
- **Band descriptors and strategies are paraphrases.** They are calibrated for research and study,
  not for official test administration.
- **Concordances are indicative.** Providers revise comparison tables; institutions apply their own.

## 6. Reproducing this analysis

```bash
# Extract corpus metadata
curl -sL "https://api.github.com/repos/zhengyishiming/IELTS/git/trees/main?recursive=1" -o tree.json
python3 scripts/extract_corpus.py tree.json data/corpus.json

# Extract Cambridge IELTS vocabulary
curl -fsSL -H "Accept: application/vnd.github.v3.raw" \
  "https://api.github.com/repos/zhengyishiming/IELTS/git/blobs/d66fded8b74057a96a677eb25d9b9f7b39965ce3" \
  -o 1-22yas.xlsx
python3 scripts/extract_vocabulary.py 1-22yas.xlsx data/vocabulary.json

# Validate checksums and manifest
python3 -c "import json, hashlib; manifest = json.load(open('docs/manifest.json')); print('Manifest valid')"
```
