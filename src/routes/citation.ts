import { CITATION_METADATA, toApa, toBibtex, toRis } from "../citation.ts";
import { getEnumParam } from "../lib/validate.ts";
import type { Route } from "../lib/router.ts";

const FORMATS = ["bibtex", "ris", "apa", "json"] as const;
type CitationFormat = (typeof FORMATS)[number];
type TextFormat = Exclude<CitationFormat, "json">;

const RENDERERS: Record<TextFormat, (metadata: typeof CITATION_METADATA) => string> = {
  bibtex: toBibtex,
  ris: toRis,
  apa: toApa,
};

/**
 * Citation metadata for scholarly use: BibTeX, RIS and APA 7 output plus a
 * JSON default, so papers and apps can credit the dataset mechanically.
 */
export const citationRoute: Route = {
  method: "GET",
  path: "/v1/citation",
  summary: "Citation metadata for the API in BibTeX, RIS, APA or JSON form.",
  handler: (ctx) => {
    const format = getEnumParam(ctx.query, "format", FORMATS, "json");
    if (format === "json") {
      return { status: 200, cacheable: true, body: { data: CITATION_METADATA } };
    }
    return {
      status: 200,
      cacheable: true,
      raw: { body: RENDERERS[format](CITATION_METADATA), contentType: "text/plain; charset=utf-8" },
    };
  },
};
