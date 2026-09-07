---
title: 'IELTS API: a free, no-authentication REST API and open dataset for IELTS preparation research'
tags:
  - IELTS
  - English for academic purposes
  - second language assessment
  - vocabulary
  - readability
  - item types
  - open data
  - REST API
authors:
  - name: The IELTS API contributors
    affiliation: 1
affiliations:
  - name: Independent research software, released as `johnlikescarrot/IELTS-API`
    index: 1
date: 7 September 2026
bibliography: paper.bib
---

# Summary

IELTS API is an open, dependency-free TypeScript web service that exposes IELTS (International
English Language Testing System) preparation data through a stable, versioned, machine-readable HTTP
contract. Every endpoint is free of charge, requires no authentication and answers with a uniform
JSON envelope. The service ships ten kinds of data: a 4,174-headword vocabulary dataset derived
from the Cambridge IELTS volumes 1-22 word lists; condensed analytic band descriptors for Speaking
and Writing across bands 0-9; indicative score concordances between IELTS and five other scales;
original Writing and Speaking task banks built on the question families and word lists that recur in
IELTS preparation material [@coxhead2000]; a canonical taxonomy of the thirteen IELTS Reading and
Listening question types, onto which 65 free-text annotation labels are normalised, carrying the
frequency of each family observed in 27,225 practice questions; an original taxonomy of twelve
response frameworks for the productive papers — ordered stage plans with cue language and pitfalls,
cross-linked to the task banks; a structure and readability index of
1,702 practice tests and CEFR-graded reading lessons [@flesch1948; @kincaid1975]; curated
metadata indexes of six open IELTS collections, including a grey-literature archive index that
catalogues the Cambridge IELTS 1-18 listening audio by naming era and completeness, measures the
twelve official sample tasks for readability, and summarises 24 marked learner essays as derived
statistics; and a cross-exam word-bank concordance of a deployed vocabulary-learning system —
seven exam word banks as an overlap matrix, joined against the Cambridge headwords, with the
platform's spaced-repetition review engine published as a deterministic calculator.
Responses are deterministic — seeded sampling, stable identifiers, ETags and conditional-request
support — so a response archived today can be re-fetched and diffed years later, which is the
practical requirement for reproducible corpus and assessment research.

# Statement of need

IELTS is taken by millions of candidates a year and studied by a substantial research community, but
the material researchers work with is not machine-readable. Vocabulary is published in workbooks,
band descriptors in PDFs, score concordances in marketing pages, and practice material in
proprietary e-book containers. Researchers who need IELTS data therefore hand-build spreadsheets
that cannot be cited, versioned or reproduced, and the resulting datasets die with the project that
produced them.

Existing public material also suffers from a discoverability problem that this project quantifies.
The open corpus this work builds on (`zhengyishiming/IELTS`, 404 files, 713 MB of IELTS-relevant
material) contains, alongside its IELTS content, a larger volume of semiconductor textbooks, Chinese
pop music and cryptocurrency books. Only 76 of the 404 files (18.8%) are IELTS or English-learning
material — an unfiltered crawler treats a lithography textbook as IELTS training data. [@ieltscorpus]

The API addresses three concrete needs:

1. **A citable target.** Datasets and code are released with `CITATION.cff`, `codemeta.json` and a
   Zenodo-ready metadata file, so a paper can cite a _version_ rather than a URL that may vanish.
2. **A reusable data layer.** The vocabulary dataset carries phonetics, part-of-speech-tagged senses
   and Cambridge volume provenance, so it can be used for lexical coverage studies, item difficulty
   modelling or material generation without re-deriving it.
3. **A service that does not gate access.** No API key, no registration, no per-key rate limiting and
   no CORS restrictions, so the API is usable from a browser, a notebook or an offline archive
   snapshot.

# Datasets

**Vocabulary.** `1-22yas.xlsx` in the upstream corpus holds one worksheet per Cambridge IELTS volume
with the columns `Number | Words | Phonetic Symbol | Explanation | Notes`; sheets 5-22 swap the last
two columns, so the extractor resolves columns by header. The extraction pipeline de-duplicates
headwords case-insensitively, merges the volumes in which a word recurs, splits WordNet-style
multi-sense glosses on part-of-speech boundaries, normalises phonetics to slash-delimited
transcriptions and assigns stable identifiers. 4,310 occurrences collapse to 4,174 unique headwords
across 22 volumes; 4,172 carry a phonetic transcription, 2,980 are polysemous (mean 4.08 senses) and
164 carry pedagogical morpheme hints such as `hydro(water);gen(create)`.

**Band descriptors.** Original, condensed paraphrases of the analytic criteria — fluency and
coherence, lexical resource, grammatical range and accuracy, pronunciation, task achievement,
task response, and coherence and cohesion — for bands 0-9, 120 rows in total. The official
descriptors are deliberately _not_ reproduced: this keeps the artefact redistributable under an open
licence, and the API states on every page that researchers needing the authoritative wording must cite
the published descriptors [@ieltsdescriptors].

**Concordances.** Indicative mappings between IELTS bands and the CEFR, TOEFL iBT, the Cambridge
English Scale, PTE Academic and the Duolingo English Test, compiled from the providers' own published
comparison tables [@coe2001]. Each response carries the provider, the source URL, the provenance and an explicit
caveat that receiving institutions apply their own rules.

**Task banks.** 111 original Writing Task 2 prompts across 15 thematic categories and the five
recurring question families (opinion, discussion, advantages/disadvantages, problem/solution,
two-part), 80 Speaking items across Parts 1-3, and 10 Writing Task 1 task families with response
structure and timing guidance.

**Corpus index.** Metadata — path, normalised title, category, skill, format, size, blob SHA-1 —
for the 76 IELTS-relevant files, plus aggregate statistics for the full 404-file repository. No
upstream binary is mirrored: the upstream files are third-party copyrighted material, and the index
is a descriptive act over metadata.

**Question-type taxonomy and practice-test index.** A second upstream collection
[@ieltspractice] publishes 315 full reading tests, 204 full listening tests and 1,232 CEFR-graded
reading lessons behind a paid login. Its per-item JSON carries sections, question ranges and
free-text type labels, but uses 65 distinct labels for what the published task descriptions treat as
thirteen task families. This work normalises those labels onto a canonical taxonomy, publishes the
mapping with per-label frequencies so that any decision can be re-made, and derives from the 1,702
machine-readable items an index of structure (sections, question counts, per-type counts, asset
availability), provenance (path, blob SHA-1, permalink) and passage-level readability (words,
sentences, type-token ratio, Flesch Reading Ease, Flesch-Kincaid grade). Only derived statistics are
published; no passage, question, answer key, transcript or recording is redistributed.

Two results follow from the aggregate. First, the task-family distribution is strongly paper
dependent: completion tasks account for 58.5% of 8,007 indexed listening questions but only 14.3% of
19,218 reading questions, where identification (True/False/Not Given, 18.3%) and multiple choice
(17.2%) dominate — a candidate who trains only on reading material practises almost none of the
family that carries the majority of the listening paper. Second, the CEFR tiers of the graded
lessons are correctly _ordered_ but badly _calibrated_: mean Flesch Reading Ease falls monotonically
from 70.2 (`A1-A2`) through 26.0 (`B1-B2`) to 5.0 (`C1-C2`), yet the middle tier already sits at
Flesch-Kincaid grade 13.9 and the top tier, at grade 17.8, is denser than the full reading tests it
prepares candidates for (grade 12.6). Generated graded readers over-shoot their target level, and
they over-shoot hardest in the middle of the scale. The full tests are nevertheless the harder task
overall, because they are ten times longer (2,642 words against roughly 250) at a _lower_ type-token
ratio (0.388 against 0.54-0.64): short lessons cannot train reading stamina however dense their
sentences are.

**Study materials and response frameworks.** A third open collection (a 2,385-file self-study
repository) is indexed by category, skill and format — recall banks, question banks, scenario
vocabulary, templates, idea banks — as descriptive metadata only. On top of it sits an original
taxonomy of twelve response frameworks for Writing Task 2 and Speaking Parts 2-3: ordered stages
with purpose statements, concrete moves, cue language and pitfalls, cross-linked to the task banks
so that every framework names the prompts it fits.

**Grey-literature archive.** A fourth open collection [@ieltsarchive] is what preparation material
looks like before anyone curates it: a 3.1 GB, licence-less personal archive of rips of the
Cambridge IELTS 1-18 listening audio, five companion-course audio sets, the twelve British Council
"Sample Academic Reading" task PDFs, and a teacher's folder of marked student writing. The index
normalises its chaotic naming into nine collections and publishes a per-volume
"media-archaeology" table: how each volume's audio is named (`cassette-side` through `cd-track` to
`test-section`), the media era the naming implies, how many listening tests the file names still
encode (seven of seventeen audio volumes), whether the volume is complete (fourteen of eighteen; the
folder that calls itself volumes "1 TO 17" in fact contains an audio-less volume 18), and where a
vendor or channel watermark marks grey provenance (volumes 4, 5 and 16). The twelve sample tasks are
mapped onto the canonical question-type taxonomy and measured with the same readability formulas as
the practice corpus: their median Flesch Reading Ease of 41.5 sits at full-test difficulty (corpus
mean 43.5), confirming that the official exemplars are extracts of real tests rather than simplified
demonstrations. The 24 marked essays (four learners, eight task types, August 2022) are published as
eleven derived statistics per file — never as text, which the non-substitutive design forbids.

**Mock-exam test centre.** A fifth collection [@yysdtestcenter] is not a folder but an operational
platform: the repository behind a live IELTS online mock-exam test centre, whose self-marking HTML
papers sit under an auto-rebuilt content manifest and report scores to their exam shell with a
single `postMessage`. The index publishes the platform as data: the 377-paper catalogue (an
unbroken Cambridge 4-21 across listening, reading and writing), a Cambridge holdings
matrix, the centre's hand-maintained taxonomy — 1,099 question groups over 5,408 questions of
Cambridge 5-21, each labelled with canonical question type, teaching scene and difficulty — the
exam-shell timing budgets, and the production raw-score-to-band calibration the exam pages are
graded by. Mapped onto the canonical taxonomy, the teachers' labels cross-validate the practice
corpus: listening completion 57.3% against 58.5%, reading identification 27.7% against 28.6%
combined, with the multiple-choice share (8.4% against 17.2%) marking where the collections
genuinely differ. A drill composer turns the taxonomy back into teaching, assembling deterministic
timed drills from the tagged groups under any filter combination.

**Word-bank concordance.** A sixth collection [@vocabsystem] is a deployed product rather than a
data dump: the repository behind an operational WeChat mini-program IELTS vocabulary-learning
platform — an Express/SQLite backend, an Ebbinghaus spaced-repetition review engine, an admin
statistics panel and AI-assisted speaking and writing practice. Its live database materialises seven
Chinese-market exam word banks (IELTS, CET-4, CET-6, the postgraduate-entrance examination, TOEFL,
GRE and a general compilation) as 47,044 rows over 15,930 distinct words. The concordance measures
that deployment rather than redistributing it: bank inventories, per-word membership, the 21-pair
overlap matrix (intersection, Jaccard, containment), collocation aggregates, the prompt banks, and
the review engine's parameters, verified against the upstream source at derivation time and exposed
as a stateless calculator over relative times. An original cross-dataset analysis joins every bank
against the Cambridge 1-22 headwords of this API and quantifies how the vocabulary market is built:
the platform's IELTS bank and the past-paper extraction agree on barely half their contents (2,153
of 4,531 words; 47.5% and 51.6% in each direction), 261 Cambridge headwords belong to none of the
seven banks, the IELTS bank shares 64.0% of its words with the TOEFL bank but only 38.0% with
CET-4, and the deployment's "TOEFL" bank is set-identical to its general compilation — a
data-quality signal about the material learners actually receive.

**Exam themes.** Fifty recurring themes in eleven groups, with original keyword sets, so that
generated or collected material can be checked for thematic coverage.

**Analysis toolkit.** The same datasets also power three text-consuming endpoints. A readability
analyser applies the Flesch formulas to any supplied text — alphabetic tokenisation, sentence
splitting on terminators, vowel-group syllable estimation — and places the score next to the corpus
group means above. An essay profiler measures type-token ratio, Guiraud's index, coverage against
the Cambridge headword list, sentence-length spread, discourse-marker density and theme matches,
and maps the measurements onto hints phrased after the four analytic criteria, at fixed published
thresholds; the response states that the hints are teaching heuristics, not scores. A study planner
composes the gap between a target band and current component scores into a deterministic
week-by-week schedule whose every activity links to the endpoint that publishes it. All three are
pure functions of their inputs, so their outputs are as reproducible as the datasets.

# Design

The service has **zero runtime dependencies**: routing, JSON serialisation, ETag generation and gzip
compression are implemented directly on `node:http` and `node:zlib`. This removes supply-chain risk,
keeps cold start under a second, and means the code an auditor reads is the code that runs.

Responses use a single envelope, `{ "status", "data", "meta" }`, so any endpoint can be parsed
uniformly. Collections paginate with `limit` and `offset` and report `total` and `hasMore`; errors
return a machine-readable code and the offending parameter with its allowed range. The OpenAPI 3.1
document is generated from the live route table, so documentation cannot drift from the
implementation. The `/v1/vocabulary/daily` endpoint is seeded from the calendar date, making it a
reproducible stimulus for longitudinal studies rather than a novelty.

# Quality control

The test suite (682 tests) enforces **100% statement, branch, function and line coverage, per file**;
the test command fails below the threshold, so coverage is a release gate rather than a badge. The
code is typechecked under `strict` with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and
`noUnusedLocals`. `super-linter` runs on every push, every pull request and weekly. Continuous
integration re-derives the vocabulary dataset from the upstream workbook, re-derives the
study-materials index and the grey-literature archive index from the upstream tree (the archive
derivation downloads the 38 document blobs it needs by blob SHA, pinned to the indexed commit),
re-derives the test-centre index from the platform's four content blobs, and re-derives the
word-bank concordance from the deployed learning system's live database and review-engine source
(two blobs, pinned by SHA), and revalidates the internal consistency of the practice-test index
(question counts, type normalisation and provenance), of the archive index (facet totals, volume
arithmetic, per-essay statistics), of the test-centre index (catalogue and taxonomy totals,
calibration contiguity) and of the word-bank concordance (bank and overlap arithmetic, membership
distribution, Cambridge join totals, review-engine constants), failing if the committed data has
drifted — which guards against silent data rot.

# Availability

Source, datasets, citation metadata and CI configuration are released at
<https://github.com/johnlikescarrot/IELTS-API> under the MIT licence for code and CC BY 4.0 for data.
Citation metadata is published in Citation File Format [@citationfileformat] and CodeMeta
[@codemeta], and tagged releases are archived on Zenodo [@zenodo], which mints a versioned DOI.

# Acknowledgements

This work builds on the open corpus assembled by `zhengyishiming`, on the practice collection
assembled by `ngoclong1209`, on the self-study collection assembled by `Oxidaner`, and on the
grey-literature archive assembled by `msneloy`; all are cited in `CITATION.cff` and in every
response that draws on them. IELTS is a jointly owned trademark of the
British Council, IDP: IELTS Australia and Cambridge Assessment English; this project is unaffiliated
with and unendorsed by the IELTS partners.

# References
