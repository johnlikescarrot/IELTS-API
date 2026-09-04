/**
 * Project metadata: identity, citation strings, and provenance notes.
 *
 * These values feed the root endpoint, the OpenAPI document, the /docs page,
 * and the academic-citation tooling (CITATION.cff mirrors this file).
 */

export const API_NAME = "IELTS-API";
export const VERSION = "1.0.0";
export const RELEASE_DATE = "2026-09-04";
export const LICENSE = "MIT";
export const HOMEPAGE = "https://github.com/johnlikescarrot/IELTS-API";
export const DESCRIPTION =
  "A free, open, no-authentication IELTS study API written in TypeScript: " +
  "band-scored vocabulary, reading and listening practice tests, writing " +
  "tasks with model answers, common writing mistakes, a speaking question " +
  "bank, band-score tools, and exam tips.";

export const CITATION_APA =
  `johnlikescarrot. (${RELEASE_DATE.slice(0, 4)}). ` +
  `${API_NAME}: A free and open IELTS study API (Version ${VERSION}) ` +
  `[Computer software]. ${HOMEPAGE}`;

export const CITATION_BIBTEX = [
  "@software{ielts_api,",
  `  author       = {johnlikescarrot},`,
  `  title        = {{IELTS-API}: A free and open IELTS study API},`,
  `  year         = {${RELEASE_DATE.slice(0, 4)}},`,
  `  month        = {${RELEASE_DATE.slice(5, 7)}},`,
  `  version      = {${VERSION}},`,
  `  url          = {${HOMEPAGE}},`,
  "}",
].join("\n");

/**
 * How this dataset was produced. The project curates original study
 * material inspired by the topical coverage of the open collection at
 * https://github.com/zhengyishiming/IELTS (vocabulary lists, common writing
 * mistakes, writing samples, speaking practice, and skills exercises).
 * No third-party copyrighted text is redistributed; every passage, question,
 * model answer, and definition in this API was written for this project and
 * is released under the MIT license.
 */
export const PROVENANCE =
  "All texts, questions, model answers, word lists, and tips in this API " +
  "were written originally for this project (MIT license). The topical " +
  "coverage is inspired by the open study collection at " +
  "github.com/zhengyishiming/IELTS. No copyrighted third-party material is " +
  "redistributed.";

export const DISCLAIMER =
  "IELTS-API is an independent study resource. It is not affiliated with, " +
  "endorsed by, or connected to IELTS, the British Council, IDP: IELTS " +
  "Australia, or Cambridge Assessment English. 'IELTS' is a trademark of " +
  "its respective owners. Raw-score conversion tables are indicative " +
  "commonly-published values and vary slightly between test versions.";
