# Data sources and provenance

## What is in the API

Every passage, question, answer, explanation, word entry, model essay,
cue card, tip, and conversion table served by IELTS-API was **written
originally for this project** and is released under the MIT license (see
[LICENSE](../LICENSE)). Nothing is copied from Cambridge IELTS books, past
papers, prep publishers, or any other copyrighted source.

## What inspired the coverage

The scope of the corpus was informed by studying the open study-material
collection at [zhengyishiming/IELTS](https://github.com/zhengyishiming/IELTS),
which mirrors the way real candidates prepare:

| Category in that collection                   | Corresponding IELTS-API dataset                        |
| --------------------------------------------- | ------------------------------------------------------ |
| Vocabulary books and phrase lists             | `/v1/words` (band-scored, topic-tagged)                |
| "Common mistakes in writing" guides           | `/v1/writing/mistakes`                                 |
| Writing samples and model essays              | `/v1/writing/tasks` (original prompts + model answers) |
| Speaking formula and question books           | `/v1/speaking` (parts 1-3, cue cards)                  |
| Skills exercise books and reading anthologies | `/v1/practice/tests`, `/v1/practice/questions`         |

That repository redistributes commercial publications and therefore its
files cannot be reused or redistributed here; it is credited for
inspiration only, and no text from it appears in this API.

## Facts used from the public IELTS framework

The following structural facts about the IELTS test are public knowledge
published by the test owners and are used descriptively, not reproduced at
length:

- The four skills, the two modules (Academic / General Training), and
  test timings.
- Writing Task 1 (report for Academic; letter for General Training) and
  Task 2 (essay), including minimum word counts (150/250).
- Speaking Parts 1, 2 (cue card), and 3.
- The overall-band rounding rule (mean of four skills, nearest half band,
  .25 rounds up).
- The common question formats (multiple choice, TRUE/FALSE/NOT GIVEN,
  sentence/note completion, short answer, matching headings).

Raw-score-to-band conversion tables are **indicative, commonly published
values** (they vary slightly between test versions) and are labelled as
such in every response that serves them.

## Trademark notice

"IELTS" is a registered trademark of its respective owners. This project
is not affiliated with, endorsed by, or connected to IELTS, the British
Council, IDP: IELTS Australia, or Cambridge Assessment English.
