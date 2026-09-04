/**
 * Static service metadata, including the bibliographic information that makes
 * the API self-describing and citable.
 *
 * Keeping citation metadata inside the running service (rather than only in
 * `CITATION.cff`) means that any user of a deployed instance can discover how
 * to cite the exact version they used, which is the single most effective
 * intervention for improving citation practice in research software.
 *
 * @packageDocumentation
 */

/** The released version of the service; kept in step with `package.json`. */
export const VERSION = "1.0.0";

/** The API surface version reflected in the URL prefix. */
export const API_VERSION = "v1";

/** Human-readable service name. */
export const SERVICE_NAME = "IELTS-API";

/** SPDX licence identifier. */
export const LICENSE = "MIT";

/** Canonical source repository. */
export const REPOSITORY = "https://github.com/johnlikescarrot/IELTS-API";

/** A single bibliographic reference exposed by the service. */
export interface Reference {
  /** Short citation key. */
  readonly key: string;
  /** Full reference string. */
  readonly citation: string;
  /** Persistent identifier, where one exists. */
  readonly url?: string;
}

/** The scholarly sources that the datasets and formulas are drawn from. */
export const REFERENCES: readonly Reference[] = Object.freeze([
  {
    key: "coxhead2000",
    citation:
      "Coxhead, A. (2000). A New Academic Word List. TESOL Quarterly, 34(2), 213-238.",
    url: "https://doi.org/10.2307/3587951",
  },
  {
    key: "flesch1948",
    citation:
      "Flesch, R. (1948). A new readability yardstick. Journal of Applied Psychology, 32(3), 221-233.",
    url: "https://doi.org/10.1037/h0057532",
  },
  {
    key: "kincaid1975",
    citation:
      "Kincaid, J. P., Fishburne, R. P., Rogers, R. L., & Chissom, B. S. (1975). Derivation of new readability formulas for Navy enlisted personnel. Naval Technical Training Command, Research Branch Report 8-75.",
    url: "https://apps.dtic.mil/sti/citations/ADA006655",
  },
  {
    key: "gunning1952",
    citation:
      "Gunning, R. (1952). The Technique of Clear Writing. McGraw-Hill.",
  },
  {
    key: "senter1967",
    citation:
      "Senter, R. J., & Smith, E. A. (1967). Automated Readability Index. Aerospace Medical Research Laboratories, AMRL-TR-66-220.",
    url: "https://apps.dtic.mil/sti/citations/AD0667273",
  },
  {
    key: "councilofeurope2020",
    citation:
      "Council of Europe (2020). Common European Framework of Reference for Languages: Learning, teaching, assessment - Companion volume. Council of Europe Publishing.",
    url: "https://www.coe.int/en/web/common-european-framework-reference-languages",
  },
]);

/** Machine-readable instructions for citing the software. */
export const CITATION: Readonly<{
  title: string;
  authors: readonly string[];
  version: string;
  license: string;
  repository: string;
  citationFile: string;
  bibtex: string;
  references: readonly Reference[];
}> = Object.freeze({
  title:
    "IELTS-API: a free, authentication-free, reproducible reference implementation of IELTS scoring and language-assessment analytics",
  authors: ["IELTS-API Contributors"],
  version: VERSION,
  license: LICENSE,
  repository: REPOSITORY,
  citationFile: `${REPOSITORY}/blob/main/CITATION.cff`,
  bibtex: [
    "@software{ielts_api,",
    "  title  = {IELTS-API: a free, authentication-free, reproducible reference implementation of IELTS scoring and language-assessment analytics},",
    "  author = {{IELTS-API Contributors}},",
    `  year   = {2026},`,
    `  version = {${VERSION}},`,
    `  license = {${LICENSE}},`,
    `  url    = {${REPOSITORY}}`,
    "}",
  ].join("\n"),
  references: REFERENCES,
});
