# Data provenance

Every dataset bundled with IELTS-API is listed here with its origin, its licence
status and the transformations applied to it. Nothing in this repository is
copied from copyrighted test material.

## Academic Word List (`src/data/awl.ts`)

- **Content.** 570 word families organised into ten frequency-ordered sublists,
  each with its headword and its inflected and derived forms (2539 forms in
  total, 3109 indexed strings including headwords).
- **Origin.** Coxhead, A. (2000). _A New Academic Word List._ TESOL Quarterly,
  34(2), 213-238. <https://doi.org/10.2307/3587951>. The list itself is published
  by the School of Linguistics and Applied Language Studies at Te Herenga Waka -
  Victoria University of Wellington for free educational use.
- **Transformation.** The published family lists were normalised to lower case,
  de-duplicated, and emitted as a typed TypeScript module. Sublist membership and
  family composition are unchanged. The generated module is marked
  `linguist-generated` and is excluded from linting.
- **Verification.** `tests/text/lexicon.test.ts` asserts the structural
  invariants: 570 families, sublists 1-9 with 60 families each, sublist 10 with
  30, unique lower-case headwords.

## Raw-score conversion tables (`src/domain/conversion.ts`)

- **Content.** Raw score to band score for Listening (one table for both
  modules), Academic Reading and General Training Reading.
- **Origin.** The indicative conversion tables published with official practice
  material and reproduced consistently across the test partners' guidance. They
  are widely published facts about the test, not creative works.
- **Caveat.** The test owners describe these tables as indicative; individual
  test versions may be equated slightly differently. They are exposed as data at
  `/v1/conversion` precisely so that a researcher can substitute a different
  table and document the substitution.
- **Verification.** Totality, non-overlap and monotonicity are asserted for every
  raw score of every paper.

## CEFR alignment (`src/domain/cefr.ts`)

- **Content.** Band ranges mapped to CEFR levels C2, C1, B2 and B1, plus an
  explicit `below-B1` sentinel with `aligned: false`.
- **Origin.** The alignment published by the test partners, with the level
  descriptions summarised from the Council of Europe's _Common European Framework
  of Reference for Languages: Companion volume_ (2020).
- **Deliberate omission.** Bands below 4.0 are **not** mapped to A2 or A1. The
  test owners publish no such alignment, and inventing one would corrupt
  downstream analyses.

## Band descriptors (`src/domain/descriptors.ts`)

- **Content.** 120 descriptor strings: three rubrics (Writing Task 1, Writing
  Task 2, Speaking) x four criteria x ten bands.
- **Origin.** Original paraphrases written for this project, informed by the
  publicly available band descriptors. No official wording is reproduced.
- **Intended use.** Machine-comparable summaries of what separates adjacent
  bands. They are not examiner training material and must not be used as such.

## Writing prompt corpus (`src/data/writing-tasks.ts`)

- **Content.** 24 prompts covering Academic Task 1 chart, table, process and map
  types, General Training Task 1 letters at three registers, and Task 2 opinion,
  discussion, advantages-disadvantages, problem-solution and two-part questions.
- **Origin.** Written for this project. Timing and word minima follow the
  published rubric (150 words and 20 minutes for Task 1; 250 words and 40 minutes
  for Task 2).
- **Licence.** MIT, like the rest of the repository.

## Speaking corpus (`src/data/speaking.ts`)

- **Content.** 24 Part 1 and Part 3 questions across eight topics, and six Part 2
  cue cards with three bullets each and the official timings (60 seconds
  preparation, 60-120 seconds long turn).
- **Origin.** Written for this project. MIT licensed.

## Common-mistake rule base (`src/data/mistakes.ts`)

- **Content.** 33 regular-expression rules across ten linguistic categories, each
  with a message, a suggestion and a worked example.
- **Origin.** Written for this project. The categories mirror the way remedial
  IELTS Writing materials organise frequent learner errors — countability,
  agreement, preposition choice, article use, word form, register, redundancy,
  spelling, punctuation and collocation — but every rule, message and example is
  original.
- **Verification.** `tests/analysis/issues.test.ts` asserts that every rule
  matches its own documented example and that every pattern compiles.

## Cohesive-device inventory (`src/data/cohesion.ts`)

- **Content.** 70 devices grouped into ten rhetorical functions.
- **Origin.** Written for this project from standard descriptions of English
  discourse markers. MIT licensed.

## Readability formulas (`src/text/readability.ts`)

Implemented from their original publications, all cited in `paper/paper.bib`:
Flesch (1948), Kincaid et al. (1975), Gunning (1952) and Senter & Smith (1967).
Mathematical formulas are not copyrightable; the implementations are original.

## Syllable estimation (`src/text/syllables.ts`)

A documented vowel-group heuristic with corrections for silent `e`, syllabic
`-le` and a small override table. It is an approximation, and it is documented as
one: its value for research is that it is stable and inspectable, not that it is
perfect on rare words.

## Trademark

IELTS is a registered trademark of the British Council, IDP: IELTS Australia and
Cambridge University Press & Assessment. This project is independent of all of
them.
