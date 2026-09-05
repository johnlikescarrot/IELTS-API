# Reproducible research and responsible citation

The objective is to make the software useful, verifiable and correctly attributable. **Neither
coverage, a DOI nor metadata can guarantee Google Scholar inclusion, ranking or citation counts.**
Do not manufacture citations, claim an unissued DOI, invent authors/affiliations, or present a draft
as a peer-reviewed publication.

## What can be evaluated now

The Reading/Listening catalogue supports reproducible **metadata** studies, for example:

- Comparing advertised collection counts with observed canonical artefacts.
- Measuring skill/source-level imbalance, structural duplication and missing companion files.
- Testing discovery, filtering, pagination and reproducible corpus selection workflows.

It does not establish exercise validity, individual CEFR levels, learner proficiency, learning gains,
full-test completeness, content licensing or the accuracy of upstream answer keys. These require
separate, appropriately licensed data and independent evaluation. Code coverage measures execution
of code paths, not educational efficacy, absence of bugs or correctness of all possible inputs.

## Minimum reproducibility record

Archive the following together for each experiment:

1. **Software:** the exact IELTS API Git commit, package version, Node version and lockfile. A
   version string alone is insufficient for an unreleased checkout.
2. **Data:** `data/practice.json`, its complete `/v1/practice` manifest, source commit and root tree
   SHA. Preserve the rights/access limitations with the data.
3. **Selection:** the full request URL, effective filters, trimmed seed, requested count,
   returned count, population and `samplingAlgorithm`. An ETag is a cache validator, not an
   archival identifier or a substitute for the dataset fingerprint.
4. **Output:** the returned item IDs, full JSON response and `datasetSha256`. Record any downstream
   exclusions separately, including exclusion reasons; never silently replace missing items.
5. **Validation:** the CI run URL, `coverage/coverage-summary.json`, test results, Super-Linter
   result and any failed/waived checks. Preserve generated reports outside Git, for example as
   release/CI artefacts.
6. **Method:** the research question, sampling rationale, analysis code, uncertainty and threats
   to validity. A deterministic sample is not automatically representative of IELTS material.

For the extraction command, exact digest serialisation and a tested sample, see
[the practice dataset reference](PRACTICE.md). Requests and offline library queries use the same
selection functions. No upstream network or login is needed at API runtime.

### Suggested evaluation protocol

- Pre-register the inclusion rules before comparing collections. Use the canonical selectors in
  `src/lib/practice-index.ts` as an explicit baseline, not an undisclosed heuristic.
- Report all four collection counts, denominators and exclusions. Separate directory-level labels
  from independently assessed language levels.
- Include an ablation that counts aliases as separate files to quantify structural inflation;
  do not call this semantic deduplication without examining licensed content.
- For educational outcome claims, obtain lawful exercises and consent/ethics approval as
  applicable, use an appropriate comparison group, and report effect sizes and uncertainty.
  No such human-subject evaluation has been conducted for this update.

## Cite the software and the source separately

Use [`CITATION.cff`](../CITATION.cff) or the BibTeX example in the README for the software, adding the
exact commit used to the citation notes until a real versioned archive exists. Credit the upstream
repository when analysing its metadata, for example:

```bibtex
@misc{upgrade_ielts_snapshot,
  author = {ngoclong1209},
  title  = {UPGRADE-YOUR-IELTS-SKILLS},
  year   = {2026},
  url    = {https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS/tree/ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c},
  note   = {Metadata snapshot, accessed 2026-09-05; upstream content reuse rights not established}
}
```

Citing a source does not supply permission to redistribute its content. The practice metadata
licence applies to this project's compilation, not to the upstream exercises or code.

## Release and archival checklist

A pull request is not a publication. The repository currently supplies citation metadata and a
**draft** paper; there is no verified Zenodo DOI recorded in `CITATION.cff`.

Before a maintainer publishes a release:

- [ ] Review the author list and acknowledgements with the actual contributors. Add real ORCIDs
      and affiliations only with their owners' agreement.
- [ ] Update package version, API version, citation metadata and changelog consistently; record
      an actual release date, not a planned or fabricated one.
- [ ] Re-run `npm ci`, `npm run validate`, `npm run build`, `npm run openapi:generate`, pinned data
      regeneration, and the repository's Super-Linter workflow on the exact revision.
- [ ] Check that the npm archive contains the data and **both** code/data licence notices.
- [ ] Create a versioned GitHub release with the source revision, package, OpenAPI snapshot and
      practice index. The release workflow prepares these assets; it does not create a DOI.
- [ ] If using Zenodo, enable the integration or deposit the archive, review its metadata/licensing,
      and verify that the resulting record actually resolves to the correct version.
- [ ] Only then add the real DOI to citation metadata. Zenodo does **not** automatically edit
      `CITATION.cff` in this repository. Preserve the distinction between a version DOI and a
      concept DOI; prefer the exact version for reproducibility.

Do not replace a missing archive with a plausible-looking placeholder DOI. No account connection,
DOI minting, journal submission or public release is implied by this PR.

## Google Scholar: a legitimate discoverability path

[Google Scholar's own inclusion guidelines][scholar] describe indexing of **scholarly articles**,
not a guarantee for an API, README, JSON response or GitHub repository. As reviewed on 5 September
2026, the practical requirements include:

1. Publish a substantive research paper or technical report with actual authors, an abstract,
   methods, evidence, limitations and references. Use an appropriate institutional/preprint/journal
   repository rather than relying on an API documentation page.
2. Provide the complete author-written abstract or full text without login, interstitials or
   required interactions. Give each paper its own stable HTML or text-searchable PDF URL.
3. Make the paper discoverable through ordinary HTML links. Scholar specifies files no larger
   than 5 MB and recommends that article URLs be reachable within ten simple HTML links.
4. For an HTML abstract page, provide accurate `citation_title`, one `citation_author` per author,
   and the real `citation_publication_date`. If a PDF is separate, use the documented
   `citation_pdf_url` relationship. Do not add invented journal, DOI, publication or authorship
   metadata merely to satisfy a parser.
5. Verify crawling and bibliographic extraction after publication; if indexing fails, use the
   guidelines' troubleshooting process. Search-engine inclusion and subsequent citations remain
   outside the project's control.

The draft in [`paper/paper.md`](../paper/paper.md) is a starting point, not evidence of acceptance.
A suitable next scholarly contribution would evaluate this metadata-first approach against a
specified corpus-discovery baseline, publish reproducible artefacts and report its limitations.
Useful results and transparent methodology are a sounder basis for citations than promises of
maximum visibility.

[scholar]: https://scholar.google.com/intl/en/scholar/inclusion.html
