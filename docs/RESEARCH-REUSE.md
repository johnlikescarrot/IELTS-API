# Reproducible research and responsible citation

This project can make reuse and attribution easier. It cannot guarantee Google Scholar inclusion,
ranking or citation counts. No DOI or peer-reviewed publication is claimed by the current metadata.
The manuscript in [`paper/paper.md`](../paper/paper.md) is a **draft**.

## Record the exact material used

For a study using the original reading collection, record:

- the software Git commit (`git rev-parse HEAD`) and package version;
- `meta.dataset.id`, `version` and `sha256` from the API response;
- the complete request, including filters, seed and exercise/question IDs;
- the grading policy, including accepted variants, word limits and unanswered-question treatment;
- an archived response or offline export, rather than an expectation that a hosted URL will remain
  unchanged indefinitely.

The SHA-256 covers `JSON.stringify(READING_CONTENT)` encoded as UTF-8, including solutions, in authored
record order. It identifies content; it is not a digital signature. Seeded sampling is reproducible
for the same collection and filter, not automatically across changed releases. Health uptime and
unseeded vocabulary samples are not fixed research stimuli.

### Offline export with no account and no runtime dependencies

```bash
npm ci
npm run build
node --input-type=module - <<'JS'
import { writeFileSync } from 'node:fs';
import { READING_DATASET, readingEntry, searchReading } from './dist/index.js';

const rows = searchReading().map(({ id }) => ({
  dataset: READING_DATASET,
  ...readingEntry(id),
}));
writeFileSync('/tmp/ielts-reading.jsonl', rows.map((row) => JSON.stringify(row)).join('\n') + '\n');
console.log(`${rows.length} exercises exported, including solutions, under ${READING_DATASET.license}`);
JS
```

Do not commit learner responses, identifiable records or generated experiment output. The API does
not store submitted answers, but research clients, proxies and hosting providers have their own
privacy responsibilities.

## What the collection can and cannot support

The six fictional, AI-assisted original passages and 36 questions are useful for demonstrations,
client interoperability tests and small reproducibility experiments. They are **not** representative
of IELTS exam difficulty, a psychometric benchmark, or evidence that a teaching intervention works.
The labels `foundation`, `intermediate` and `advanced` are editorial. There is no validated mapping
from the returned practice percentage to an IELTS band or CEFR level.

For a defensible study:

1. Have qualified teachers independently review question clarity, answer variants and evidence.
   Publish disagreements and revisions rather than treating successful unit tests as expert review.
2. If measuring learning, obtain appropriate consent and review, recruit participants under a
   declared protocol, and report sample size, attrition, baselines and uncertainty.
3. Keep all questions from a passage in the same train/development/test partition. Splitting at
   question level leaks the shared passage into the evaluation set.
4. Do not train a model on the public answer keys and then claim held-out performance on them.
   Disclose any prior exposure to this small public collection.
5. Report exact-match and word-limit rules. Do not interpret a forgiving or changed matcher as an
   improvement in learner proficiency.
6. Separate copyright status, content validity and software coverage: these are different properties.
   The older vocabulary glosses have unresolved upstream provenance; the new reading materials do
   not inherit a licence from the reviewed upstream platform.

## Citation and archival workflow

Use [`CITATION.cff`](../CITATION.cff) for the software citation, and include the **actual commit used**
in the methods section when working from an unreleased checkout. Cite the appropriate upstream work
only when it informed the study: the legacy vocabulary corpus and the reviewed learning platform
have distinct roles. The reading passages are not an extracted upstream dataset.

Before announcing an archived release, maintainers should:

- verify authorship, version and release date against the actual release;
- run `npm run validate`, the official Super-Linter workflow, and `cffconvert --validate`;
- create a real versioned release and enable an archival integration such as Zenodo, or deposit the
  release manually under the correct code/data licences;
- inspect the public archive record and verify that its identifier resolves;
- only then add that **real, version-specific DOI** to citation metadata and synchronize CodeMeta,
  the manuscript and the release notes.

`.zenodo.json` is a metadata template, not evidence that archiving is enabled. A GitHub release does
not, by itself, mint a DOI or update `CITATION.cff`. Do not use placeholder DOIs, invented publication
venues, citation exchanges or generated papers that exist only to cite the project.

## Google Scholar: publish a real research contribution

[Google Scholar's inclusion guidelines][scholar] concern scholarly articles and their drafts, not a
JSON API or a software README by itself. They require accessible scholarly content and parseable
bibliographic information. When an independently reviewed manuscript is ready for dissemination:

- put the full text or complete author-written abstract on a stable public HTML or searchable PDF
  page, with no login, consent wall or JavaScript-only navigation;
- give each paper its own URL, reachable through ordinary HTML links;
- use accurate title, actual authors and publication date; on an HTML article page, use the supported
  `citation_title`, separate `citation_author` tags and `citation_publication_date`;
- link a corresponding searchable PDF with `citation_pdf_url` where applicable, and include real
  references; keep files within the guidelines' 5 MB limit;
- use an appropriate institutional repository, preprint service or journal according to its actual
  scope and review requirements; do not claim acceptance or indexing before it happens.

Do **not** attach fabricated article metadata to every API endpoint. Useful open software, transparent
methods, appropriate dissemination and genuine independent reuse are the legitimate route to more
citations; the outcome remains external to this repository.

[scholar]: https://scholar.google.com/intl/en/scholar/inclusion.html
