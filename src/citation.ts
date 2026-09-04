import { API_NAME, VERSION } from "./version.ts";

/** Metadata used by the /v1/citation endpoint and the repo's CITATION.cff. */
export interface CitationMetadata {
  title: string;
  authors: string;
  year: number;
  version: string;
  repository: string;
  license: string;
  description: string;
}

export const CITATION_METADATA: CitationMetadata = {
  title: "IELTS-API: a free and open REST API for IELTS study data",
  authors: "IELTS-API Contributors",
  year: 2026,
  version: VERSION,
  repository: "https://github.com/johnlikescarrot/IELTS-API",
  license: "MIT",
  description:
    "A no-authentication REST API serving academic vocabulary, speaking topics, writing prompts, common mistakes, band descriptors and a band-score calculator.",
};

/** Render BibTeX reference-manager metadata. */
export function toBibtex(metadata: CitationMetadata): string {
  return [
    "@software{ielts_api_" + metadata.year + ",",
    "  author = {{" + metadata.authors + "}},",
    "  title = {" + metadata.title + "},",
    "  year = {" + metadata.year + "},",
    "  version = {" + metadata.version + "},",
    "  url = {" + metadata.repository + "},",
    "  license = {" + metadata.license + "}",
    "}",
  ].join("\n");
}

/** Render RIS reference-manager metadata. */
export function toRis(metadata: CitationMetadata): string {
  return [
    "TY  - COMP",
    "AU  - " + metadata.authors,
    "TI  - " + metadata.title,
    "PY  - " + String(metadata.year),
    "VL  - " + metadata.version,
    "UR  - " + metadata.repository,
    "PB  - GitHub",
    "ER  - ",
  ].join("\n");
}

/** Render an APA 7th edition software citation. */
export function toApa(metadata: CitationMetadata): string {
  return (
    `${metadata.authors} (${metadata.year}). ${API_NAME}: A free and open REST API ` +
    `for IELTS study data (Version ${metadata.version}) [Computer software]. GitHub. ` +
    `${metadata.repository}`
  );
}
