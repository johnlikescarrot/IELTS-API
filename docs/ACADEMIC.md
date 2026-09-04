# Academic citation and dissemination strategy

IELTS-API is built to be citable, reproducible, and useful to researchers.
This note explains what the project does for scholarly discoverability and
what maintainers should do to maximise it.

## What the project already provides

1. **Persistent citation metadata.** `CITATION.cff` at the repository root
   activates GitHub's "Cite this repository" dialog (APA and BibTeX).
   GitHub also forwards `cff-version` metadata to Zenodo and other
   harvesters.
2. **Citation strings served by the API itself** (`/` and `/v1/meta`), so
   anyone who uses the data programmatically is one request away from the
   correct citation.
3. **Reproducibility guarantees.** Pinned Node major version, zero runtime
   dependencies, a lockfile, 100% enforced test coverage, and an OpenAPI
   3.1 document generated from the live route table. A reviewer can stand
   up exactly the service a paper used with `npm ci && npm run build &&
npm start`.
4. **Dataset provenance and licensing.** `docs/DATA_SOURCES.md` documents
   that every text is original and MIT-licensed, and which public
   collection inspired the topical coverage. Clean licensing is a
   precondition for scholarly reuse.
5. **Integrity tests as data-quality evidence** (`tests/data.test.ts`):
   uniqueness, referential consistency, enum validity, answer/word-limit
   checks, and completeness of the raw-score conversion tables.

## Roadmap for maximum citability (maintainer actions)

- **Archive releases on Zenodo** by enabling the GitHub-Zenodo integration
  for this repository. Each tagged release then mints a versioned DOI;
  add it to `CITATION.cff` (`identifiers:`) and to the API `/v1/meta`
  response.
- **Publish a software paper** describing the corpus and the API. Suitable
  venues include the [Journal of Open Source Software](https://joss.theoj.org)
  (short paper, DOI in the paper itself), [SoftwareX](https://www.sciencedirect.com/journal/softwarex),
  or an LREC/BEA-style workshop on language resources for education.
- **Assign an ORCID** to the author record and add it to `CITATION.cff`,
  so Google Scholar profiles can group citations correctly.
- **Announce in the right places**: the JOSS review thread, NLP/CL
  community lists (e.g. LINGUIST List, ACL "call for resources"), open
  education communities (OER, WikiEdu), and the API directories
  (RapidAPI's free tier, PublicAPIs) — each announcement is a page that
  can itself be indexed and cited.
- **Keep semantics stable.** Semantic versioning plus a CHANGELOG makes
  the corpus datable ("dataset v1.0.0"), which citation standards such
  as DataCite expect.

## Honest notes

- Google Scholar does not index source code by itself; it indexes
  _documents_ (papers, preprints) that describe it. The reliable path to
  citations runs through a paper with a DOI that cites this repository —
  which is why the Zenodo + JOSS steps above come first.
- The band-score conversion tables are indicative, commonly published
  values, not confidential examiner tables; papers relying on exact
  cut-offs should state the test version they used.
- "IELTS" is a trademark of its respective owners; cite the API as an
  independent study resource, not as an official IELTS product.
