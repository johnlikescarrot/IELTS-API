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

> **Draft technical report:** not peer reviewed, not accepted for publication, and no verified
> archival DOI is recorded. Counts describe the pinned artefacts, not learning outcomes.

# Summary

IELTS API is an open, dependency-free TypeScript web service that exposes IELTS (International
English Language Testing System) preparation data through a stable, versioned, machine-readable HTTP
contract. Every endpoint is free of charge, requires no authentication and answers with a uniform
JSON envelope. The service ships six kinds of data: a 4,174-headword vocabulary dataset derived from
the Cambridge IELTS volumes 1-22 word lists; condensed analytic band descriptors for Speaking and
Writing across bands 0-9; indicative score concordances between IELTS and five other scales; original
Writing and Speaking task banks built on the question families and word lists that recur in IELTS
preparation material [@coxhead2000]; a curated metadata index of an IELTS research corpus; and a metadata-only Reading/Listening
catalogue derived from a pinned practice repository [@upgradeielts]. Static responses and explicit-seed
samples are deterministic for a fixed software revision, dataset and query. Source commits, an item
SHA-256 fingerprint and a versioned sampling algorithm support archival comparison and replay;
a running service or version label alone is not a permanent archive.

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

**Reading/Listening metadata.** A separate review of `ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS`
at commit `ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c` found 5,545 blobs. An allowlisted TypeScript
extractor selects canonical exercise JSON or test HTML paths, excludes rendering aliases, processed
copies, strategies and media, and retains generic original titles, source-level labels, byte sizes
and blob hashes. It indexes 102 Listening exercises, 204 Listening full tests, 1,232 Reading
exercises and 314 Reading full tests: **1,852 items**, rather than the advertised 1,853.
Reading Test 105 is absent; Listening Tests 83, 85 and 88 lack canonical companion audio files.
Audio presence is a path-level observation, not a playability or licensing assessment.

The source has no established project licence and its documentation describes login and paid
access. No exercise text, answer keys, media, learner records or authentication code are imported.
The API stays free and authentication-free by providing a descriptive metadata layer, not by
circumventing upstream controls. CEFR-like directory labels are not independently calibrated;
individual question families, semantic duplicate passages and assessment quality were not inferred
from filenames. The review and exact selection rules are recorded in `docs/PRACTICE.md`.

# Design

The service has **zero runtime dependencies**: routing, JSON serialisation, ETag generation and gzip
compression are implemented directly on `node:http` and `node:zlib`. This reduces runtime dependency exposure
and deployment requirements, but does not eliminate build-tool or supply-chain risk.

Responses use a single envelope, `{ "status", "data", "meta" }`, so any endpoint can be parsed
uniformly. Collections paginate with `limit` and `offset` and report `total` and `hasMore`; errors
return a machine-readable code and the offending parameter with its allowed range. The OpenAPI 3.1
route inventory is generated from the live route table; explicit parameter and response schemas
are independently validated and tested against real HTTP responses, with a checked-in snapshot
drift gate. The `/v1/vocabulary/daily` endpoint is seeded from the calendar date, making it a
reproducible stimulus for longitudinal studies rather than a novelty.

# Quality control

The test suite enforces **100% statement, branch, function and line coverage, per file**;
the test command fails below the threshold, so coverage is a release gate rather than a badge. The
coverage scope includes executable TypeScript source and generation scripts, without lowering
thresholds for the new feature. Coverage is not evidence of pedagogical validity. The code is typechecked under `strict` with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and
`noUnusedLocals`. `super-linter` runs on every push, every pull request and weekly. Continuous
integration re-derives the vocabulary dataset from the upstream workbook and fails if the committed
dataset has drifted, which guards against silent data rot. A separate pinned-tree regeneration
checks the practice metadata byte-for-byte. Tests cover invalid/truncated trees, duplicate paths,
missing items, checksum corruption, seeded sampling, Unicode seeds, validation errors and HTTP
contracts. A golden sampling fixture was cross-checked against an independent implementation
of the specified generator.

# Availability

Source, datasets, citation metadata and CI configuration are released at
<https://github.com/johnlikescarrot/IELTS-API> under the MIT licence for code and CC BY 4.0 for the project's original derived metadata, not for
third-party exercise content. Legacy vocabulary glosses have unverified provenance; the project's
licence cannot grant rights it does not hold in that material.
Citation metadata is published in Citation File Format [@citationfileformat] and CodeMeta
[@codemeta], with a Zenodo-ready metadata template [@zenodo]. No verified archival DOI is currently recorded.
A maintainer must publish and verify a release archive before citing its DOI; this draft does not
claim journal acceptance, Scholar indexing or citation impact.

# Acknowledgements

This work builds on the open corpus assembled by `zhengyishiming`; the author of that corpus is cited
in `CITATION.cff` and in relevant dataset provenance. The practice metadata source assembled by
`ngoclong1209` is credited separately, with its exact revision and reuse limitations. IELTS is a jointly owned trademark of the
British Council, IDP: IELTS Australia and Cambridge Assessment English; this project is unaffiliated
with and unendorsed by the IELTS partners.

# References
