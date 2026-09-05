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
- a catalogue of preparation resources restricted to ones that are free **and** require no login;
- the practice layer of §7 and the format/technique/raw-score layer of §9, all of it original
  work written for this project.

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

## 7. The practice layer (v1.1.0): reading, strategies, quizzes, plans

Version 1.0.0 published _reference_ data. Version 1.1.0 publishes the layer learners actually
practise on — graded input, strategy advice, items and schedules — under the same licence and with
the same reproducibility guarantees. Each module was designed to be executable from the API alone.

**Graded reading (`/v1/reading`).** The dataset is nine passages written for this project (no text
is extracted or adapted from Cambridge papers or commercial sites) spanning A2 to C1: two A2, two
B1, three B2, two C1, ~1,700 words total. Calibration is heuristic and stated as such: A2 texts use
high-frequency vocabulary, short coordinated sentences and concrete referents; B1 adds connected
argument; B2 introduces abstraction and concession; C1 assumes precision, implied stance and
low-frequency lexis. Each passage carries a fixed 1+1+1 item set — one multiple-choice, one
True/False/Not-given, one short-answer question — chosen so that item types are comparable across
levels and passages can be pooled in studies without re-coding; the answer key for every item
carries an explanation quoting the passage. Threats: levels are assigned by construction, not by
independent rating, so cross-level difficulty ordering is plausible but not validated; nine passages
are a reference sample, not a practice bank, and the fixed item shape under-counts the range of real
IELTS tasks (matching, sentence completion, reference).

**Strategy bank (`/v1/strategies`).** Twenty-four cards, six per skill, each with a concrete
action, a mechanism and an `evidence` label. The labels are the methodological core: where published
research supports a strategy it is named (author, year) — spacing and testing effects (Cepeda et
al., 2006; Roediger & Karpicke, 2006), feedback and self-assessment (Hattie & Timperley, 2007),
metacognitive listening instruction (Vandergrift & Tafaghodtari, 2010), extensive reading (Jeon &
Yamashita, 2014), the lexical approach (Lewis, 1993; Wray, 2002), intelligibility-pronunciation
research (Derwing & Munro, 2015), planning effects in L2 speech (Yuan & Felser, 2012) — and where
the claim is folklore the card says so (`practitioner convention`). Band ranges encode who a
strategy is for; strategies are excluded outside their range rather than recommended universally.

**Quiz generator (`/v1/quizzes/vocabulary`).** Quizzes are not a dataset but a pure function over
the vocabulary dataset: `count` targets are drawn from the filtered pool with the seeded
`seededIndices` sampler, three distractors per item are drawn from the same pool shifted to exclude
the target (so no item can contain its own answer twice), and option order is a seeded Fisher-Yates
shuffle. A quiz is therefore fully specified by `(count, seed, filters)` — a paper can publish its
seed and anyone can regenerate the stimulus. Because distractors come from the same part-of-speech
pool when `pos` is given, item difficulty is homogeneous by construction.

**Study-plan generator (`/v1/study-plan`).** A transparent heuristic, printed with its own
assumptions so it can be audited or re-implemented: demand per skill is
`max(0.5, target − current + 0.5·weak_flag)`; a quarter of weekly hours (minimum 0.5) is reserved
for review and feedback; the rest is split proportionally to demand and rounded to half hours;
weekly focus rotates through skills ordered by demand so the weakest is first; vocabulary load is
`min(60, 12 + 6·gap + hours/2)`; reading material is selected at the target band's indicative CEFR
level with a whole-set fallback; mock tests land on weeks divisible by four and a closing review
week always exists. The allocation borrows its shape from mastery-based planning rather than any
validated IELTS-specific model — it is offered as a reproducible baseline that a treatment study can
modify, and the response says in terms that evidence on hours-to-band-gain is mixed.

## 8. Case study: what the closed mirrors demand, and what they cannot give

The v1.1.0 feature set was motivated by a systematic look at what real-world IELTS practice
repositories are made of, rather than by what reference APIs usually ship. The clearest recent
example — chosen because it is public, indexed and self-described as an upgrade-your-skills system —
is `ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS`, a Pages-hosted mirror assembled from three sibling
repositories. Its project summary describes the architecture: 204 full listening tests and 315 full
reading tests, 1,232 reading passages graded A1-C2, 102 three-level listening lessons with audio,
scraped and rebuilt with a Python crawler, with a Google Apps Script login overlay injected into
every HTML file so access can be sold as a one-year licence. The repository itself carries no
licence, commits its `node_modules` and a `.env`, and hosts scraped third-party question content and
audio with no provenance or permission.

Two lessons were taken from it, and one boundary drawn. The lessons: (1) the demand is not for more
vocabulary lists but for _structured practice_ — graded passages, skill-levelled lessons, per-test
items, schedulable curricula — which is exactly the layer §7 adds; and (2) the access overlay shows
that even this scale of mirror needs a database, an auth flow and a paywall to function, which is
the architectural opposite of a citable endpoint. The boundary: none of its content was imported,
re-derived or used to seed any dataset here, because scraped items inherit their owner's copyright
and its provenance chain, and neither survives review — the whole reason this API can be cited at
all is that its data provenance is checkable. The mirror is therefore cited here as evidence of
demand, not as a source.

## 9. Format blueprints, question-type technique and raw scoring

The practice layer of §7 gives learners material to work on; this section records the smaller
companion layer that tells them what the test looks like and how each item family is attacked:
format blueprints (`/v1/skills`), per-family exam-technique guides (`/v1/question-types`),
indicative raw-score mappings (`/v1/scores/raw`) and the study-system catalogue behind them
(`/v1/study-system`: six-step cycle, four plan phases, CEFR ladder).

The motivation is the same case study as §8. Full-test mirrors drill complete 4-part / 40-question
Listening papers and 3-passage / 40-question Reading papers, organise practice around a stable
taxonomy of receptive question families (eleven for Reading, eight for Listening), and pair every
passage with the same fixed study cycle — preview, timed attempt, error analysis, vocabulary
extraction, deep review, progress logging. Those three structural facts are encoded here as
machine-readable data; the §8 boundary is honoured throughout: no item, transcript, explanation or
audio from any third-party mirror was imported, re-derived or used to seed anything. Every
blueprint note, approach step, trap and timing tip is original prose, the raw-score intervals are
compiled from the IELTS partners' own published band-score guidance with provenance and caveat in
every response, and marks below the lowest published interval report `null` instead of a guess.

Two deliberate divisions of labour keep the layers coherent. The `/v1/strategies` bank of §7 gives
_skill-level_ learning strategies with evidence labels; `/v1/question-types` gives _item-level_
exam technique (approach, traps, timing) with no evidence claims beyond practitioner consensus, and
says so. The `/v1/study-plan` generator of §7 is the canonical planner and the only one exposed;
`/v1/study-system` publishes the raw catalogue (cycle steps, phase shares and exit criteria, CEFR
ladder) it is consistent with, so a researcher can audit a plan's shape against the same data.
