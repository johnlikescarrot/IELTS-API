import { BAND_DESCRIPTORS, OVERALL_BAND_SCALE } from "../data/index.ts";
import { getOptionalEnumParam, getOptionalRangeParam } from "../lib/validate.ts";
import type { Route } from "../lib/router.ts";

const SKILLS = ["writing", "speaking"] as const;

/**
 * Unofficial, paraphrased band descriptors for the productive skills, plus
 * the overall nine-band scale.
 */
export const bandDescriptorsRoute: Route = {
  method: "GET",
  path: "/v1/band-descriptors",
  summary: "Band descriptors (bands 5-9) for writing and speaking, plus the overall scale.",
  handler: (ctx) => {
    const skill = getOptionalEnumParam(ctx.query, "skill", SKILLS);
    const band = getOptionalRangeParam(ctx.query, "band", 5, 9);
    let data: readonly (typeof BAND_DESCRIPTORS)[number][] = BAND_DESCRIPTORS;
    if (skill !== undefined) {
      data = data.filter((descriptor) => descriptor.skill === skill);
    }
    if (band !== undefined) {
      data = data.filter((descriptor) => descriptor.band === band);
    }
    return {
      status: 200,
      cacheable: true,
      body: {
        data,
        overallScale: OVERALL_BAND_SCALE,
        meta: {
          total: data.length,
          note: "Unofficial paraphrased summaries written for IELTS-API; they are not the official IELTS descriptors.",
        },
      },
    };
  },
};
