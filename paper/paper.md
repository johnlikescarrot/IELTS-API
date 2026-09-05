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
date: 4 September 2026
bibliography: paper.bib
---

# Summary

IELTS API is an open, dependency-free TypeScript web service that exposes IELTS (International
English Language Testing System) preparation data through a stable, versioned, machine-readable HTTP
contract. Every endpoint is free of charge, requires no authentication and answers with a uniform
JSON envelope. The service ships seven kinds of data: a 4,174-headword vocabulary dataset derived from
the Cambridge IELTS volumes 1-22 word lists; condensed analytic band descriptors for Speaking and
Writing across bands 0-9; indicative score concordances between IELTS and five other scales;
exhaustive raw-score to band-score conversion tables for the two objectively marked papers, in which
every boundary carries its own provenance; the complete Listening and Reading question-type
taxonomy; test-format blueprints for all six papers; and original Writing and Speaking task banks
built on the question families and word lists that recur in IELTS preparation material
[@coxhead2000], alongside a curated metadata index of an open IELTS research corpus.
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

**Raw-score conversion.** Exhaustive tables mapping 0-40 correct answers onto a band for Listening,
Academic Reading and General Training Reading. The IELTS partners re-equate boundaries for every
test version and publish no definitive table, so what circulates publicly is a consensus
reconstruction; publishing it as a bare lookup would launder an estimate into an apparent fact.
Every row therefore records whether its boundary is `published` (reproduced from agreeing public
sources) or `extrapolated`, and rows where public tables materially disagree carry the competing
boundary. Academic Reading is well behaved — independent sources agree on every boundary from band
1.0 to 9.0 — while Listening is contested at five consecutive boundaries between bands 5.0 and 7.5,
so that a candidate scoring 32 is band 7.5 under one table and 7.0 under the other. A study that
converts raw Listening scores without naming its table is not reproducible at the half-band level,
which is the effect size much of this literature reports. Responses also give the marginal number of
further correct answers needed for the next half band.

**Question types and test format.** All 17 Listening and Reading question types, each with the
construct it measures, its answer format, whether its answers follow the order of the text, and
original strategy and error notes; plus format blueprints for all six papers with part-level item
counts, timings, register and focus. Two properties that the published format leaves implicit are
made explicit because they matter for automated processing: the answer format distinguishes the two
look-alike verification types (True/False/Not Given versus Yes/No/Not Given, whose conflation
silently merges two different constructs), and an `ordered` flag records the three Reading types
whose answers do not follow the order of the text.

**Task banks.** 111 original Writing Task 2 prompts across 15 thematic categories and the five
recurring question families (opinion, discussion, advantages/disadvantages, problem/solution,
two-part), 80 Speaking items across Parts 1-3, and 10 Writing Task 1 task families with response
structure and timing guidance.

**Corpus index.** Metadata — path, normalised title, category, skill, format, size, blob SHA-1 —
for the 76 IELTS-relevant files, plus aggregate statistics for the full 404-file repository. No
upstream binary is mirrored: the upstream files are third-party copyrighted material, and the index
is a descriptive act over metadata.

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

The test suite (501 tests) enforces **100% statement, branch, function and line coverage, per file**;
the test command fails below the threshold, so coverage is a release gate rather than a badge. The
code is typechecked under `strict` with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and
`noUnusedLocals`. `super-linter` runs on every push, every pull request and weekly. Continuous
integration re-derives the vocabulary dataset from the upstream workbook and fails if the committed
dataset has drifted, which guards against silent data rot.

# Citability as an implemented feature

Research software is under-cited largely for mechanical reasons: the citation is hard to find, hard
to format, and inconsistent between the places a reader might look [@softwarecitation]. The service
treats that as an engineering problem.

One canonical bibliographic record is defined in the source, and every surface is rendered from it:
`CITATION.cff`, `codemeta.json`, the Zenodo deposition metadata, the paper's meta tags, the
generated PDF and the nine formats served by `/v1/citation` (BibTeX, RIS, CSL-JSON, APA, MLA,
Chicago, Harvard, EndNote and plain text). Because they share a source they cannot disagree — which
matters, because divergent metadata is what causes an index to split one work into several phantom
records and scatter its citations between them.

The service also publishes its own scholarly surface rather than relying on the repository being
found. `/paper` is a landing page carrying Highwire Press `citation_*` tags, Dublin Core, Open Graph
and a schema.org graph with `ScholarlyArticle`, `Dataset` and `SoftwareSourceCode` nodes
[@scholarinclusion]; the
author-written abstract is visible without scrolling or interaction and the references are a
numbered list of formal citations. `/paper.pdf` is the full text as a real PDF, generated at request
time by a dependency-free writer — title in 24 pt at the top of page 1, authors on the line below, a
`References` section at the end — and is linked from the landing page by `citation_pdf_url`, which
is what keeps the HTML and PDF instances indexed as one work. `/robots.txt` and `/sitemap.xml`
complete the surface. The PDF is byte-for-byte reproducible, so it is served under a stable ETag and
an archived copy can be diffed against a later fetch.

# Availability

Source, datasets, citation metadata and CI configuration are released at
<https://github.com/johnlikescarrot/IELTS-API> under the MIT licence for code and CC BY 4.0 for data.
Citation metadata is published in Citation File Format [@citationfileformat] and CodeMeta
[@codemeta], and tagged releases are archived on Zenodo [@zenodo], which mints a versioned DOI.
The datasets follow the FAIR principles [@fair]: findable through the landing page and the DOI,
accessible over unauthenticated HTTP, interoperable through one JSON envelope and an OpenAPI 3.1
contract, and reusable under CC BY 4.0 with per-row provenance.

# Acknowledgements

This work builds on the open corpus assembled by `zhengyishiming`; the author of that corpus is cited
in `CITATION.cff` and in every response that draws on it. IELTS is a jointly owned trademark of the
British Council, IDP: IELTS Australia and Cambridge Assessment English; this project is unaffiliated
with and unendorsed by the IELTS partners.

# References
