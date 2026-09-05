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
date: 5 September 2026
bibliography: paper.bib
---

# Summary

IELTS API is an open, dependency-free TypeScript web service that exposes IELTS (International
English Language Testing System) preparation data through a stable, versioned, machine-readable HTTP
contract. Every endpoint is free of charge, requires no authentication and answers with a uniform
JSON envelope. The service ships seven kinds of data: a 4,174-headword vocabulary dataset derived
from the Cambridge IELTS volumes 1-22 word lists; condensed analytic band descriptors for Speaking
and Writing across bands 0-9; indicative score concordances between IELTS and five other scales;
original Writing and Speaking task banks built on the question families and word lists that recur in
IELTS preparation material [@coxhead2000]; a canonical taxonomy of the thirteen IELTS Reading and
Listening question types, onto which 65 free-text annotation labels are normalised, carrying the
frequency of each family observed in 27,225 practice questions; a structure and readability index of
1,702 practice tests and CEFR-graded reading lessons [@flesch1948; @kincaid1975]; and curated
metadata indexes of two open IELTS collections.
Beyond serving datasets, the API **measures submitted texts**: `/v1/analyze/text` accepts an essay
draft, transcript or passage and returns a deterministic bundle of counts, six readability formulae
[@flesch1948; @kincaid1975; @mclaughlin1969; @colemanliau1975; @gunning1952], lexical-diversity
measures including the Measure of Textual Lexical Diversity [@mccarthyjarvis2010], a documented
grade-to-CEFR heuristic with an indicative band range, and the text's coverage profile against the
Cambridge headword list; `/v1/analyze/reference` publishes every formula, threshold and definition
so clients can cite or re-implement the metric, not just the numbers it produces.
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

**Exam themes.** Fifty recurring themes in eleven groups, with original keyword sets, so that
generated or collected material can be checked for thematic coverage.

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

The analysis engine is deliberately model-free. Readability, diversity and coverage measurements are
closed-form functions of the input text — no embeddings, no sampling, no external models — which
keeps the service deterministic and zero-dependency while making every measurement reproducible from
its published definition. The syllable counter and Flesch constants mirror the pipeline that
produced the practice-test readability index, so a passage scores identically whether it was
analysed at index time or pasted by a researcher. Subjective assessment (band prediction, argument
quality scoring) is out of scope by design: the API reports an indicative band **range** anchored to
public concordances and labels it explicitly as a readability heuristic.

# Quality control

The test suite (420 tests) enforces **100% statement, branch, function and line coverage, per file**;
the test command fails below the threshold, so coverage is a release gate rather than a badge. The
code is typechecked under `strict` with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and
`noUnusedLocals`. `super-linter` runs on every push, every pull request and weekly. Continuous
integration re-derives the vocabulary dataset from the upstream workbook, and revalidates the
internal consistency of the practice-test index (question counts, type normalisation and provenance),
failing if the committed data has drifted — which guards against silent data rot.

# Availability

Source, datasets, citation metadata and CI configuration are released at
<https://github.com/johnlikescarrot/IELTS-API> under the MIT licence for code and CC BY 4.0 for data.
Citation metadata is published in Citation File Format [@citationfileformat] and CodeMeta
[@codemeta], and tagged releases are archived on Zenodo [@zenodo], which mints a versioned DOI.

# Acknowledgements

This work builds on the open corpus assembled by `zhengyishiming` and on the practice collection
assembled by `ngoclong1209`; both are cited in `CITATION.cff` and in every response that draws on
them. IELTS is a jointly owned trademark of the
British Council, IDP: IELTS Australia and Cambridge Assessment English; this project is unaffiliated
with and unendorsed by the IELTS partners.

# References
