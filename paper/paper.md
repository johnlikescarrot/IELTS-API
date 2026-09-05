---
title: 'IELTS API: a free, no-authentication REST API and open dataset for IELTS preparation research'
tags:
  - IELTS
  - English for academic purposes
  - second language assessment
  - vocabulary
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
JSON envelope. The service ships reference data and a practice layer: a 4,174-headword vocabulary
dataset derived from the Cambridge IELTS volumes 1-22 word lists; condensed analytic band descriptors
for Speaking and Writing across bands 0-9; indicative score concordances between IELTS and five
other scales; original Writing and Speaking task banks built on the question families and word lists
that recur in IELTS preparation material [@coxhead2000]; a curated metadata index of an open IELTS
research corpus; and, since v1.1.0, nine original CEFR-graded reading passages with 27 explained
exam-style items, a 24-card learning-strategy bank carrying an honest evidence label on every card,
and two deterministic generators — seeded vocabulary quizzes and weekly study plans — that compose
those datasets into practicable artefacts. Responses are deterministic — seeded sampling, stable
identifiers, ETags and conditional-request support — so a response archived today can be re-fetched
and diffed years later, which is the practical requirement for reproducible corpus and assessment
research.

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

A parallel signal comes from the closed end of the market: the most active public IELTS-practice
repositories are scraped mirrors of commercial tests — thousands of graded passages and full tests
behind an injected login wall, sold by the year, unlicensed and unciteable (documented as a case
study in `RESEARCH.md` §8). The demand they satisfy is precisely the demand an API can serve better:
structured practice content that is versioned, attributable and machine-readable rather than hidden
behind an account.

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

**Format, technique and raw scoring.** Machine-readable format blueprints of the four papers
(sections, timings, question counts); 19 receptive question families — eleven for Reading, eight
for Listening — each with an original exam-technique guide (three-step approach, two traps, timing
tip) that complements the evidence-labelled strategy bank at the level of the individual item; and
indicative raw-score to band mappings for the three machine-marked papers, compiled from the IELTS
partners' published band-score guidance with the same provenance-and-caveat discipline as the
concordances.

**Corpus index.** Metadata — path, normalised title, category, skill, format, size, blob SHA-1 —
for the 76 IELTS-relevant files, plus aggregate statistics for the full 404-file repository. No
upstream binary is mirrored: the upstream files are third-party copyrighted material, and the index
is a descriptive act over metadata.

**Graded reading and strategies (v1.1.0).** Nine original passages calibrated to CEFR levels A2-C1
carry 27 explained exam-style items in a fixed 1+1+1 format (multiple-choice, True/False/Not-given,
short-answer), so items are comparable across levels. The 24-card strategy bank pairs each strategy
with its mechanism and an `evidence` label that names the supporting literature where it exists and
admits `practitioner convention` where it does not — an explicit provenance discipline applied to
pedagogical advice for the first time in this space, as far as we are aware.

**Generators (v1.1.0).** `/v1/quizzes/vocabulary` composes multiple-choice quizzes from the
vocabulary dataset with seeded sampling: distractors are drawn from the same filtered pool shifted to
exclude the target, and a quiz is fully specified by `(count, seed, filters)`, so a study can publish
its seed instead of an appendix. `/v1/study-plan` allocates weekly hours across skills by a printed
band-gap heuristic (`max(0.5, target − current + 0.5·weak_flag)`, fixed review share, CEFR-matched
reading selection, four-week mock cadence) and schedules real dataset item ids, so the plan is
executable against the API and auditable against its own `assumptions` list.

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

The test suite (381 tests) enforces **100% statement, branch, function and line coverage, per file**;
the test command fails below the threshold, so coverage is a release gate rather than a badge. The
code is typechecked under `strict` with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and
`noUnusedLocals`. `super-linter` runs on every push, every pull request and weekly. Continuous
integration re-derives the vocabulary dataset from the upstream workbook and fails if the committed
dataset has drifted, which guards against silent data rot.

# Availability

Source, datasets, citation metadata and CI configuration are released at
<https://github.com/johnlikescarrot/IELTS-API> under the MIT licence for code and CC BY 4.0 for data.
Citation metadata is published in Citation File Format [@citationfileformat] and CodeMeta
[@codemeta], and tagged releases are archived on Zenodo [@zenodo], which mints a versioned DOI.

# Acknowledgements

This work builds on the open corpus assembled by `zhengyishiming`; the author of that corpus is cited
in `CITATION.cff` and in every response that draws on it. IELTS is a jointly owned trademark of the
British Council, IDP: IELTS Australia and Cambridge Assessment English; this project is unaffiliated
with and unendorsed by the IELTS partners.

# References
