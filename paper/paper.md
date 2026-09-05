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
JSON envelope. The service ships eight kinds of data: a 4,174-headword vocabulary dataset derived from
the Cambridge IELTS volumes 1-22 word lists; condensed analytic band descriptors for Speaking and
Writing across bands 0-9; indicative score concordances between IELTS and five other scales, alongside
a 0-40 raw-to-band conversion engine; 50 high-frequency IELTS themes with Writing Task 2 essay prompts;
a comprehensive metadata catalogue of 1,852 practice units across Reading and Listening; 17 task-family
strategy guides and a 6-step study methodology [@upgradeielts]; original Writing and Speaking task banks
built on recurring IELTS question families [@coxhead2000]; and a curated metadata index and reproducible
SHA-256 provenance manifest of the open IELTS research corpus. Responses are deterministic — seeded
sampling, stable identifiers, ETags and conditional-request support — so a response archived today can
be re-fetched and diffed years later, which is the practical requirement for reproducible corpus and
assessment research.

# Statement of need

IELTS is taken by millions of candidates a year and studied by a substantial research community, but
the material researchers work with is not machine-readable. Vocabulary is published in workbooks,
band descriptors in PDFs, score concordances in marketing pages, and practice material in
proprietary e-book containers. Researchers who need IELTS data therefore hand-build spreadsheets
that cannot be cited, versioned or reproduced, and the resulting datasets die with the project that
produced them.

Existing public material also suffers from a discoverability and licensing audit problem that this
project quantifies. The open corpus this work builds on (`zhengyishiming/IELTS`, 404 files, 713 MB of
IELTS-relevant material) contains, alongside its IELTS content, a larger volume of semiconductor
textbooks, Chinese pop music and cryptocurrency books. Only 76 of the 404 files (18.8%) are IELTS or
English-learning material [@ieltscorpus]. Similarly, the open `UPGRADE-YOUR-IELTS-SKILLS` study set
contains 1,852 observed practice units across four learning collections, but features missing assets
(Reading Test 105 is absent, and audio is missing for Listening Full Tests 83, 85, and 88) [@upgradeielts].

The API addresses four concrete needs:

1. **A citable target.** Datasets and code are released with `CITATION.cff`, `codemeta.json` and a
   Zenodo-ready metadata file, so a paper can cite a _version_ rather than a URL that may vanish.
2. **A reusable data layer.** The vocabulary dataset carries phonetics, part-of-speech-tagged senses
   and Cambridge volume provenance, so it can be used for lexical coverage studies, item difficulty
   modelling or material generation without re-deriving it.
3. **Practice catalogue & task strategy guidance.** Systematic metadata for 1,852 practice units,
   17 official question family strategies, and high-frequency theme analysis.
4. **A service that does not gate access.** No API key, no registration, no per-key rate limiting and
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

**Concordances and raw-score conversion.** Indicative mappings between IELTS bands and the CEFR, TOEFL iBT, the Cambridge
English Scale, PTE Academic and the Duolingo English Test, compiled from the providers' own published
comparison tables [@coe2001]. A dedicated raw-to-band endpoint converts raw scores (0-40) into band
estimates for Academic Reading, General Training Reading, and Listening. Each response carries the
provider, the source URL, the provenance and an explicit caveat that receiving institutions apply their own rules.

**High-frequency theme bank.** 50 ranked themes across 11 categories derived from the open
`UPGRADE-YOUR-IELTS-SKILLS` repository [@upgradeielts], each tagged with supported skills, Writing
Task 2 question families, core lexical keywords, and three realistic original essay prompts.

**Practice catalogue & task strategies.** Metadata inventory of 1,852 observed practice units
(1,232 Reading Basic across A1-A2, B1-B2, C1-C2; 314 Reading Full Tests; 102 Listening Basic across
Basic, Intermediate, Advanced; 204 Listening Full Tests), 17 task-family strategies (11 Academic Reading,
6 Listening), and a 6-step study methodology.

**Task banks.** 111 original Writing Task 2 prompts across 15 thematic categories and the five
recurring question families (opinion, discussion, advantages/disadvantages, problem/solution,
two-part), 80 Speaking items across Parts 1-3, and 10 Writing Task 1 task families with response
structure and timing guidance.

**Corpus index & provenance manifest.** Metadata — path, normalised title, category, skill, format,
size, blob SHA-1 — for the 76 IELTS-relevant files, plus aggregate statistics for the full 404-file
repository and deterministic SHA-256 checksums across all datasets. No upstream binary is mirrored: the
upstream files are third-party copyrighted material, and the index is a descriptive act over metadata.

# Design

The service has **zero runtime dependencies**: routing, JSON serialisation, ETag generation and gzip
compression are implemented directly on `node:http` and `node:zlib`. This removes supply-chain risk,
keeps cold start under a second, and means the code an auditor reads is the code that runs.

Responses use a single envelope, `{ "status", "data", "meta" }`, so any endpoint can be parsed
uniformly. Collections paginate with `limit` and `offset` and report `total` and `hasMore`; errors
return a machine-readable code and the offending parameter with its allowed range. The OpenAPI 3.1
document is generated from the live route table, so documentation cannot drift from the
implementation.

# Quality control

The test suite (344 tests) enforces **100% statement, branch, function and line coverage, per file**;
the test command fails below the threshold, so coverage is a release gate rather than a badge. The
code is typechecked under `strict` with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and
`noUnusedLocals`. `super-linter` runs on every push, every pull request and weekly. Continuous
integration re-derives the vocabulary dataset from the upstream workbook and validates dataset
checksums on every push.

# Availability

Source, datasets, citation metadata and CI configuration are released at
<https://github.com/johnlikescarrot/IELTS-API> under the MIT licence for code and CC BY 4.0 for data.
Citation metadata is published in Citation File Format [@citationfileformat] and CodeMeta
[@codemeta], and tagged releases are archived on Zenodo [@zenodo], which mints a versioned DOI.

# Acknowledgements

This work builds on the open datasets assembled by `zhengyishiming` and `ngoclong1209`; the authors
are cited in `CITATION.cff` and in every response that draws on their work. IELTS is a jointly owned
trademark of the British Council, IDP: IELTS Australia and Cambridge Assessment English; this project
is unaffiliated with and unendorsed by the IELTS partners.

# References
