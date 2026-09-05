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

<!-- markdownlint-disable MD025 -->
<!-- JOSS-style manuscripts use top-level headings for each section. -->

**Draft manuscript. Not peer-reviewed, accepted by a journal, or assigned a verified DOI.**

# Summary

IELTS API is an open, dependency-free TypeScript web service that exposes IELTS (International
English Language Testing System) preparation data through a stable, versioned, machine-readable HTTP
contract. Every endpoint is free of charge, requires no authentication and answers with a uniform
JSON envelope. The service ships several data families: a 4,174-headword vocabulary dataset derived from
the Cambridge IELTS volumes 1-22 word lists; condensed analytic band descriptors for Speaking and
Writing across bands 0-9; indicative score concordances between IELTS and five other scales; original
Writing and Speaking task banks built on the question families and word lists that recur in IELTS
preparation material [@coxhead2000]; a curated metadata index of an IELTS research corpus; and a small, original reading collection with stateless feedback.
Explicit seeds, stable identifiers, content hashes and ETags support reproducible stimuli within a
pinned version. Researchers must archive the exact material used; a mutable deployment, health
uptime or an unseeded sample is not a permanent research record.

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

**Original reading practice.** Six fictional, AI-assisted original passages contain 36 questions,
equally divided among single-choice, true/false/not-given and short-answer families. Two exercises
per editorial difficulty label support small practice demonstrations. A structural review of
`ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS` [@upgradeielts] informed discovery and feedback design, not
content extraction. Its pinned tree contains 1,232 basic reading records but only 314 numbered full
reading test directories, despite a name promising 315; it also documents paid login and device
binding. No upstream exercise text, answers, audio, code or credentials are redistributed. The
complete methods and limitations of this review are in `docs/UPSTREAM-REVIEW.md`.

# Design

The service has **zero runtime dependencies**: routing, JSON serialisation, ETag generation and gzip
compression are implemented directly on `node:http` and `node:zlib`. This reduces the runtime dependency surface; it does not eliminate security risks in Node.js,
development dependencies, deployment infrastructure or application code.

Responses use a single envelope, `{ "status", "data", "meta" }`, so any endpoint can be parsed
uniformly. Collections paginate with `limit` and `offset` and report `total` and `hasMore`; errors
return a machine-readable code and the offending parameter with its allowed range. The OpenAPI 3.1
document is generated from the live route table. Schema tests compare reading responses with the
documented contract and check the archived snapshot, rather than assuming generation prevents all drift. The `/v1/vocabulary/daily` endpoint is seeded from the calendar date, making it a
reproducible stimulus for longitudinal studies rather than a novelty.

# Quality control

The test suite enforces **100% statement, branch, function and line coverage, per file**;
the test command fails below the threshold, so coverage is a release gate rather than a badge. The
code is typechecked under `strict` with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and
`noUnusedLocals`. `super-linter` runs on every push, every pull request and weekly. Continuous
integration re-derives the vocabulary dataset from the upstream workbook and fails if the committed
dataset has drifted, which guards against silent data rot.

Reading submissions are JSON POST bodies, limited to 16 KiB and a ten-second read deadline. The
server validates the entire submission before grading, rejects duplicate/unknown question IDs and
unexpected fields, and returns explanations with paragraph evidence. It collects no learner identity,
does not persist answers, and omits request bodies and query strings from application logs. Grading
and error responses are not cached. The published matching rules and answer variants allow an
independent implementation to reproduce results.

# Limitations and evaluation needs

The reading collection is synthetic, small and not psychometrically calibrated. Neither the editorial
levels nor practice percentages have a validated relationship with CEFR levels or IELTS bands. The
answer keys are public, so it is not a secure examination system. Independent teacher review,
learner studies with appropriate ethical oversight, and passage-level evaluation partitions are
needed before claims about learning or assessment validity can be made. Code coverage is not evidence
of such validity. The older vocabulary glosses also retain unresolved upstream provenance; an open
licence on project annotations does not establish rights in underlying third-party material.

# Availability

Source, datasets, citation metadata and CI configuration are released at
<https://github.com/johnlikescarrot/IELTS-API> under the MIT licence for code and CC BY 4.0 for data.
Citation metadata is published in Citation File Format [@citationfileformat] and CodeMeta
[@codemeta]. Zenodo metadata is prepared for a future archival deposit [@zenodo], but this repository
does not currently claim a verified DOI. A real release and archive record must be checked before
adding an identifier. Researchers using an unreleased checkout should cite its Git commit and content hash.

# Acknowledgements

This work builds on the open corpus assembled by `zhengyishiming`; the author of that corpus is cited
in `CITATION.cff` and in every response that draws on it. IELTS is a jointly owned trademark of the
British Council, IDP: IELTS Australia and Cambridge Assessment English; this project is unaffiliated
with and unendorsed by the IELTS partners.

# References
