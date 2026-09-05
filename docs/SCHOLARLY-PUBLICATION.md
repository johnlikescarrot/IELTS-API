# Scholarly publication and citation integrity

The goal is useful, attributable research software — not fabricated citation counts or metadata
intended to misrepresent publication status. **No Google Scholar inclusion, rank, citation count,
peer review, DOI or completed Zenodo archive is claimed.**

## What is implemented

- `/research` serves the entire author-written [technical-report draft](../paper/practice-metadata.md)
  as HTML, including the title, collective author attribution, date, visible abstract, methods,
  measured inventory, limitations and references. It does not require JavaScript or authentication.
- `citation_title`, `citation_author` and `citation_publication_date` tags describe that report,
  not the generic API homepage. The date is the report draft's date, not a claimed journal date.
- `/docs` links to the report using ordinary HTML links. The report links to provenance and the
  software citation. There is no pretend PDF URL, journal title, ISSN, ORCID or DOI.
- `CITATION.cff` is checked against the actual CFF 1.2.0 schema. The former placeholder DOI and
  unsupported fields have been removed; reference types follow the schema.
- `/citation.bib`, CodeMeta, CFF and the prepared Zenodo metadata use consistent software identity.
  Generated contract/report/citation artifacts are checked for drift in CI.

These choices follow Google's [Scholar inclusion guidance][scholar], especially its requirements
for scholarly content, accessible full text or abstracts, a separate article URL and accurate
bibliographic tags. An API response or a GitHub README alone is not a guarantee of Scholar indexing.

## Maintainer publication checklist

1. Review the report and confirm authorship and affiliations. Add individual names or ORCIDs only
   with the actual contributors' agreement. The current attribution is the project's existing
   collective name; it does not invent individual researchers.
2. Resolve applicable third-party rights before distributing any content. The practice inventory
   contains metadata only; the legacy vocabulary glosses have unresolved provenance limitations.
3. Freeze a reviewed code revision and retain the data checksum, reproduction commands, dependency
   lockfile and successful CI reports. For unreleased work, cite the exact commit, not merely the
   package version.
4. Publish the report on a stable public host, or in an institutional/preprint repository that
   accepts the work and supports indexing. The temporary development preview is not a durable
   scholarly archive. A submitted manuscript must satisfy its venue's actual eligibility rules.
5. If using Zenodo, enable the repository integration or make a reviewed deposit, then **verify**
   the record and DOI. GitHub tagging alone does not configure this. Add a DOI to CFF/CodeMeta only
   after resolution to the correct record; the workflow does not update CFF automatically.
6. If a PDF is later produced, keep it text-searchable, below the size limit in [Google's current
   guidance][scholar], and publicly accessible. Only then add a real `citation_pdf_url` next to its
   HTML article. Do not advertise a file that does not exist.
7. Preserve stable article URLs and an accessible abstract. Avoid login overlays, keyword
   stuffing, misleading journal metadata, self-generated citation networks or claims of validation
   unsupported by a study.
8. Invite independent reuse through useful examples, stable contracts, complete provenance and
   reproducibility. Document observed reuse honestly; citation impact cannot be guaranteed.

## How to cite responsibly

Use `/citation.bib` or `CITATION.cff` for the software and record the code commit when working from
this unreleased branch. For practice-metadata analyses, also identify the upstream repository and
commit `ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c`, the inventory checksum, filters and any sampling seed.

Do not cite the upstream author as an author of this API, imply IELTS-partner endorsement, or treat
a metadata licence as permission to reproduce source exercises. Citation is encouraged for
attribution, not required to gain API access.

[scholar]: https://scholar.google.com/intl/en/scholar/inclusion.html
